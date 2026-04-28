/**
 * Qayani Live Interface - WebSocket Relay Server
 *
 * This server acts as a secure bridge between the client and OpenAI's Realtime API.
 * It manages persistent WebSocket connections and injects the Qayani system prompt.
 *
 * Run: node server/realtime-relay.js
 */

import { WebSocketServer } from 'ws';
import WebSocket from 'ws';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

// Configuration
const OPENAI_WS_URL = 'wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const PORT = process.env.REALTIME_WS_PORT || 8080;

if (!OPENAI_API_KEY) {
  console.error('❌ OPENAI_API_KEY is not set in environment variables');
  process.exit(1);
}

const wss = new WebSocketServer({ port: PORT });

console.log(`✅ Qayani Realtime Relay Server running on ws://localhost:${PORT}`);

wss.on('connection', (clientSocket, request) => {
  console.log('🔌 Client connected to Qayani Live Interface');

  let openaiSocket = null;
  let isAlive = true;

  // Heartbeat to detect broken connections
  const heartbeat = () => {
    isAlive = true;
  };

  clientSocket.on('pong', heartbeat);

  // 1. Connect to OpenAI Realtime API
  try {
    openaiSocket = new WebSocket(OPENAI_WS_URL, {
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'OpenAI-Beta': 'realtime=v1',
      },
    });

    // 2. Setup the Session with Qayani System Prompt
    openaiSocket.on('open', () => {
      console.log('🤖 Connected to OpenAI Realtime API');

      const sessionConfig = {
        type: 'session.update',
        session: {
          modalities: ['text', 'audio'],
          voice: 'shimmer', // Options: 'shimmer', 'alloy', 'echo'
          instructions: `You are Qayani, a highly intelligent, empathetic, and professional digital legacy assistant.
                         You help users preserve their wisdom, memories, and stories for future generations.
                         You are succinct, warm, and engaging. Keep responses conversational and under 20 seconds unless asked to elaborate.
                         You speak like a trusted family advisor - professional yet personal.
                         When discussing memories, be reflective and thoughtful.
                         When offering guidance, be wise yet humble.
                         Always make the user feel heard and valued.`,
          turn_detection: {
            type: 'server_vad',
            threshold: 0.5,
            prefix_padding_ms: 300,
            silence_duration_ms: 500,
          },
          input_audio_format: 'pcm16',
          output_audio_format: 'pcm16',
          input_audio_transcription: {
            model: 'whisper-1',
          },
        },
      };

      openaiSocket.send(JSON.stringify(sessionConfig));
    });

    // 3. Relay Messages: OpenAI -> Client
    openaiSocket.on('message', (data) => {
      try {
        const event = JSON.parse(data);

        // Stream audio deltas (the raw sound) to the user
        if (event.type === 'response.audio.delta') {
          clientSocket.send(JSON.stringify({
            type: 'audio',
            payload: event.delta
          }));
        }

        // Stream text transcript for UI subtitles
        if (event.type === 'response.audio_transcript.delta') {
          clientSocket.send(JSON.stringify({
            type: 'transcript',
            payload: event.delta
          }));
        }

        // Complete transcript when done
        if (event.type === 'response.audio_transcript.done') {
          clientSocket.send(JSON.stringify({
            type: 'transcript_done',
            payload: event.transcript
          }));
        }

        // Conversation item created (for logging/history)
        if (event.type === 'conversation.item.created') {
          clientSocket.send(JSON.stringify({
            type: 'conversation_item',
            payload: event.item
          }));
        }

        // Response done
        if (event.type === 'response.done') {
          clientSocket.send(JSON.stringify({
            type: 'response_complete',
            payload: event.response
          }));
        }

        // Error handling
        if (event.type === 'error') {
          console.error('❌ OpenAI Error:', event.error);
          clientSocket.send(JSON.stringify({
            type: 'error',
            payload: event.error
          }));
        }
      } catch (error) {
        console.error('❌ Error parsing OpenAI message:', error);
      }
    });

    // 4. Relay Messages: Client (Microphone) -> OpenAI
    clientSocket.on('message', (message) => {
      try {
        const data = JSON.parse(message);

        if (data.type === 'input_audio_buffer.append') {
          // Forward user audio to OpenAI
          if (openaiSocket && openaiSocket.readyState === WebSocket.OPEN) {
            openaiSocket.send(JSON.stringify({
              type: 'input_audio_buffer.append',
              audio: data.payload // Base64 encoded PCM16 audio
            }));
          }
        }

        // Commit audio buffer
        if (data.type === 'input_audio_buffer.commit') {
          if (openaiSocket && openaiSocket.readyState === WebSocket.OPEN) {
            openaiSocket.send(JSON.stringify({
              type: 'input_audio_buffer.commit'
            }));
          }
        }

        // Clear audio buffer
        if (data.type === 'input_audio_buffer.clear') {
          if (openaiSocket && openaiSocket.readyState === WebSocket.OPEN) {
            openaiSocket.send(JSON.stringify({
              type: 'input_audio_buffer.clear'
            }));
          }
        }

        // Manual response trigger
        if (data.type === 'response.create') {
          if (openaiSocket && openaiSocket.readyState === WebSocket.OPEN) {
            openaiSocket.send(JSON.stringify({
              type: 'response.create',
              response: data.response || {}
            }));
          }
        }
      } catch (error) {
        console.error('❌ Error parsing client message:', error);
      }
    });

    // Connection error handling
    openaiSocket.on('error', (error) => {
      console.error('❌ OpenAI WebSocket error:', error);
      if (clientSocket.readyState === WebSocket.OPEN) {
        clientSocket.send(JSON.stringify({
          type: 'error',
          payload: { message: 'OpenAI connection error' }
        }));
      }
    });

    // Cleanup on OpenAI disconnect
    openaiSocket.on('close', () => {
      console.log('🔌 OpenAI connection closed');
      if (clientSocket.readyState === WebSocket.OPEN) {
        clientSocket.close();
      }
    });

  } catch (error) {
    console.error('❌ Failed to connect to OpenAI:', error);
    if (clientSocket.readyState === WebSocket.OPEN) {
      clientSocket.send(JSON.stringify({
        type: 'error',
        payload: { message: 'Failed to connect to OpenAI' }
      }));
      clientSocket.close();
    }
  }

  // Cleanup on client disconnect
  clientSocket.on('close', () => {
    console.log('🔌 Client disconnected');
    if (openaiSocket && openaiSocket.readyState === WebSocket.OPEN) {
      openaiSocket.close();
    }
  });

  clientSocket.on('error', (error) => {
    console.error('❌ Client WebSocket error:', error);
  });
});

// Heartbeat interval to detect broken connections
const heartbeatInterval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) {
      return ws.terminate();
    }
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

wss.on('close', () => {
  clearInterval(heartbeatInterval);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM signal received: closing WebSocket server');
  wss.close(() => {
    console.log('✅ WebSocket server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT signal received: closing WebSocket server');
  wss.close(() => {
    console.log('✅ WebSocket server closed');
    process.exit(0);
  });
});
