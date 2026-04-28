/**
 * Live Chat Session Hook (Supabase + OpenAI Realtime API)
 *
 * Manages real-time voice conversations with complete data persistence.
 * Uses Vercel API routes for secure token exchange and Supabase for storage.
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '../supabase/client';

interface LiveChatConfig {
  apiKey: string;
  modelConfig: {
    model: string;
    voice: string;
    instructions: string;
    modalities: string[];
    temperature: number;
  };
}

interface LiveChatSession {
  id: string;
  status: string;
  startedAt: string;
}

interface LiveChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  audioUrl?: string;
}

export interface UseLiveChatSessionReturn {
  // Connection state
  isConnected: boolean;
  isConnecting: boolean;
  isSpeaking: boolean;
  isListening: boolean;
  error: string | null;

  // Session data
  sessionId: string | null;
  messages: LiveChatMessage[];
  transcript: string;

  // Audio context
  audioContext: AudioContext | null;
  analyzerNode: AnalyserNode | null;

  // Actions
  startSession: () => Promise<void>;
  endSession: () => Promise<void>;
  sendMessage: (content: string) => Promise<void>;
}

const OPENAI_WS_URL = 'wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01';

export function useLiveChatSession(): UseLiveChatSessionReturn {
  // Connection state
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Session data
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<LiveChatMessage[]>([]);
  const [transcript, setTranscript] = useState('');

  // Audio context
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [analyzerNode, setAnalyzerNode] = useState<AnalyserNode | null>(null);

  // Refs
  const socketRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const nextStartTimeRef = useRef(0);
  const configRef = useRef<LiveChatConfig | null>(null);

  /**
   * Save message to Supabase
   */
  const saveMessageToSupabase = useCallback(
    async (message: {
      role: 'user' | 'assistant' | 'system';
      content: string;
      contentType?: 'text' | 'audio' | 'both';
      audioUrl?: string;
      audioDurationMs?: number;
      latencyMs?: number;
    }) => {
      if (!sessionId) return;

      try {
        const response = await fetch('/api/live-chat/message', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            ...message,
          }),
        });

        if (!response.ok) {
          console.error('Failed to save message to Supabase');
        }
      } catch (error) {
        console.error('Error saving message:', error);
      }
    },
    [sessionId]
  );

  /**
   * Convert base64 PCM16 to AudioBuffer
   */
  const base64ToAudioBuffer = useCallback(
    async (base64: string, ctx: AudioContext): Promise<AudioBuffer> => {
      const binaryString = window.atob(base64);
      const len = binaryString.length;
      const bytes = new Int16Array(len / 2);

      for (let i = 0; i < len; i += 2) {
        bytes[i / 2] =
          binaryString.charCodeAt(i) | (binaryString.charCodeAt(i + 1) << 8);
      }

      const float32 = new Float32Array(bytes.length);
      for (let i = 0; i < bytes.length; i++) {
        float32[i] = bytes[i] / 32768;
      }

      const buffer = ctx.createBuffer(1, float32.length, 24000);
      buffer.getChannelData(0).set(float32);

      return buffer;
    },
    []
  );

  /**
   * Queue and play audio
   */
  const queueAudio = useCallback(
    (buffer: AudioBuffer, ctx: AudioContext, analyzer: AnalyserNode) => {
      if (currentSourceRef.current) {
        try {
          currentSourceRef.current.stop();
        } catch (e) {
          // Already stopped
        }
      }

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(analyzer);
      analyzer.connect(ctx.destination);

      setIsSpeaking(true);
      currentSourceRef.current = source;

      const currentTime = ctx.currentTime;
      if (nextStartTimeRef.current < currentTime) {
        nextStartTimeRef.current = currentTime;
      }

      source.start(nextStartTimeRef.current);
      nextStartTimeRef.current += buffer.duration;

      source.onended = () => {
        if (ctx.currentTime >= nextStartTimeRef.current - 0.1) {
          setIsSpeaking(false);
          currentSourceRef.current = null;
        }
      };
    },
    []
  );

  /**
   * Setup microphone
   */
  const setupMicrophone = useCallback(
    async (socket: WebSocket) => {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 24000,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      streamRef.current = stream;
      setIsListening(true);

      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = async (e) => {
        if (e.data.size > 0 && socket.readyState === WebSocket.OPEN) {
          const reader = new FileReader();
          reader.onload = () => {
            const base64Audio = (reader.result as string).split(',')[1];
            socket.send(
              JSON.stringify({
                type: 'input_audio_buffer.append',
                audio: base64Audio,
              })
            );
          };
          reader.readAsDataURL(e.data);
        }
      };

      recorder.start(100);
    },
    []
  );

  /**
   * Start live chat session
   */
  const startSession = useCallback(async () => {
    try {
      setIsConnecting(true);
      setError(null);

      // Create session and get config from API
      const sessionResponse = await fetch('/api/live-chat/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionType: 'live_voice',
        }),
      });

      if (!sessionResponse.ok) {
        throw new Error('Failed to create session');
      }

      const { data } = await sessionResponse.json();
      const { sessionId: newSessionId, apiKey, modelConfig } = data;

      setSessionId(newSessionId);
      configRef.current = { apiKey, modelConfig };

      // Initialize AudioContext
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      setAudioContext(ctx);

      const analyzer = ctx.createAnalyser();
      analyzer.fftSize = 512;
      analyzer.smoothingTimeConstant = 0.4;
      setAnalyzerNode(analyzer);

      // Connect to OpenAI WebSocket
      const socket = new WebSocket(
        OPENAI_WS_URL,
        [],
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'OpenAI-Beta': 'realtime=v1',
          },
        } as any
      );

      socketRef.current = socket;

      socket.onopen = async () => {
        console.log('✅ Connected to OpenAI Realtime API');

        // Configure session
        socket.send(
          JSON.stringify({
            type: 'session.update',
            session: {
              modalities: modelConfig.modalities,
              voice: modelConfig.voice,
              instructions: modelConfig.instructions,
              turn_detection: {
                type: 'server_vad',
                threshold: 0.5,
                prefix_padding_ms: 300,
                silence_duration_ms: 500,
              },
              input_audio_format: 'pcm16',
              output_audio_format: 'pcm16',
              temperature: modelConfig.temperature,
            },
          })
        );

        setIsConnected(true);
        setIsConnecting(false);

        await setupMicrophone(socket);
      };

      socket.onmessage = async (event) => {
        const data = JSON.parse(event.data);

        if (data.type === 'response.audio.delta' && data.delta) {
          const audioBuffer = await base64ToAudioBuffer(data.delta, ctx);
          queueAudio(audioBuffer, ctx, analyzer);
        }

        if (data.type === 'response.audio_transcript.delta') {
          setTranscript((prev) => prev + data.delta);
        }

        if (data.type === 'response.audio_transcript.done') {
          const message: LiveChatMessage = {
            role: 'assistant',
            content: data.transcript,
            timestamp: new Date().toISOString(),
          };
          setMessages((prev) => [...prev, message]);
          setTranscript('');

          // Save to Supabase
          await saveMessageToSupabase({
            role: 'assistant',
            content: data.transcript,
            contentType: 'both',
          });
        }

        if (data.type === 'conversation.item.input_audio_transcription.completed') {
          const message: LiveChatMessage = {
            role: 'user',
            content: data.transcript,
            timestamp: new Date().toISOString(),
          };
          setMessages((prev) => [...prev, message]);

          // Save to Supabase
          await saveMessageToSupabase({
            role: 'user',
            content: data.transcript,
            contentType: 'audio',
          });
        }

        if (data.type === 'error') {
          console.error('OpenAI Error:', data.error);
          setError(data.error.message || 'An error occurred');
        }
      };

      socket.onerror = () => {
        setError('Connection error');
        setIsConnected(false);
        setIsConnecting(false);
      };

      socket.onclose = () => {
        setIsConnected(false);
        setIsListening(false);
        setIsSpeaking(false);
      };
    } catch (error) {
      console.error('Error starting session:', error);
      setError('Failed to start session');
      setIsConnecting(false);
    }
  }, [base64ToAudioBuffer, queueAudio, setupMicrophone, saveMessageToSupabase]);

  /**
   * End live chat session
   */
  const endSession = useCallback(async () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }

    if (currentSourceRef.current) {
      try {
        currentSourceRef.current.stop();
      } catch (e) {
        // Already stopped
      }
    }

    if (socketRef.current) {
      socketRef.current.close();
    }

    if (audioContext) {
      audioContext.close();
    }

    // End session in Supabase
    if (sessionId) {
      try {
        await fetch('/api/live-chat/session', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId }),
        });
      } catch (error) {
        console.error('Error ending session:', error);
      }
    }

    setIsConnected(false);
    setIsListening(false);
    setIsSpeaking(false);
    setSessionId(null);
    setMessages([]);
    setTranscript('');
    nextStartTimeRef.current = 0;
  }, [sessionId, audioContext]);

  /**
   * Send text message
   */
  const sendMessage = useCallback(
    async (content: string) => {
      if (!socketRef.current || !isConnected) return;

      socketRef.current.send(
        JSON.stringify({
          type: 'conversation.item.create',
          item: {
            type: 'message',
            role: 'user',
            content: [{ type: 'input_text', text: content }],
          },
        })
      );

      socketRef.current.send(
        JSON.stringify({
          type: 'response.create',
        })
      );

      const message: LiveChatMessage = {
        role: 'user',
        content,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, message]);

      await saveMessageToSupabase({
        role: 'user',
        content,
        contentType: 'text',
      });
    },
    [isConnected, saveMessageToSupabase]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      endSession();
    };
  }, [endSession]);

  return {
    isConnected,
    isConnecting,
    isSpeaking,
    isListening,
    error,
    sessionId,
    messages,
    transcript,
    audioContext,
    analyzerNode,
    startSession,
    endSession,
    sendMessage,
  };
}
