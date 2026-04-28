/**
 * Qayani Audio Stream Hook
 *
 * Manages real-time audio streaming with OpenAI Realtime API via WebSocket.
 * Handles microphone input, audio playback, and connection management.
 */

import { useState, useRef, useCallback, useEffect } from 'react';

interface AudioStreamState {
  isSpeaking: boolean;
  isListening: boolean;
  isConnected: boolean;
  transcript: string;
  error: string | null;
}

export interface UseAudioStreamReturn extends AudioStreamState {
  connect: () => Promise<void>;
  disconnect: () => void;
  audioContext: AudioContext | null;
  sourceNode: AudioBufferSourceNode | null;
  analyzerNode: AnalyserNode | null;
}

const WS_URL = process.env.NEXT_PUBLIC_REALTIME_WS_URL || 'ws://localhost:8080';

export function useAudioStream(): UseAudioStreamReturn {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [sourceNode, setSourceNode] = useState<AudioBufferSourceNode | null>(null);
  const [analyzerNode, setAnalyzerNode] = useState<AnalyserNode | null>(null);

  const socketRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const nextStartTimeRef = useRef(0);
  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null);

  /**
   * Convert base64 PCM16 audio to AudioBuffer
   */
  const base64ToAudioBuffer = useCallback(
    async (base64: string, ctx: AudioContext): Promise<AudioBuffer> => {
      try {
        const binaryString = window.atob(base64);
        const len = binaryString.length;
        const bytes = new Int16Array(len / 2);

        for (let i = 0; i < len; i += 2) {
          bytes[i / 2] =
            binaryString.charCodeAt(i) | (binaryString.charCodeAt(i + 1) << 8);
        }

        // Convert Int16 to Float32
        const float32 = new Float32Array(bytes.length);
        for (let i = 0; i < bytes.length; i++) {
          float32[i] = bytes[i] / 32768;
        }

        // OpenAI Realtime API outputs 24kHz PCM16
        const buffer = ctx.createBuffer(1, float32.length, 24000);
        buffer.getChannelData(0).set(float32);

        return buffer;
      } catch (error) {
        console.error('Error converting base64 to AudioBuffer:', error);
        throw error;
      }
    },
    []
  );

  /**
   * Queue and play audio buffer
   */
  const queueAudio = useCallback(
    (buffer: AudioBuffer, ctx: AudioContext, analyzer: AnalyserNode) => {
      // Stop previous source if still playing
      if (currentSourceRef.current) {
        try {
          currentSourceRef.current.stop();
        } catch (e) {
          // Already stopped
        }
      }

      const source = ctx.createBufferSource();
      source.buffer = buffer;

      // Connect source -> analyzer -> destination
      source.connect(analyzer);
      analyzer.connect(ctx.destination);

      setSourceNode(source);
      setIsSpeaking(true);
      currentSourceRef.current = source;

      // Schedule playback without gaps
      const currentTime = ctx.currentTime;
      if (nextStartTimeRef.current < currentTime) {
        nextStartTimeRef.current = currentTime;
      }

      source.start(nextStartTimeRef.current);
      nextStartTimeRef.current += buffer.duration;

      source.onended = () => {
        if (ctx.currentTime >= nextStartTimeRef.current - 0.1) {
          setIsSpeaking(false);
          setSourceNode(null);
          currentSourceRef.current = null;
        }
      };
    },
    []
  );

  /**
   * Setup microphone recording
   */
  const setupMicrophone = useCallback(
    async (socket: WebSocket, ctx: AudioContext) => {
      try {
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

        // Use MediaRecorder to capture audio
        const recorder = new MediaRecorder(stream, {
          mimeType: 'audio/webm',
        });

        mediaRecorderRef.current = recorder;

        recorder.ondataavailable = async (e) => {
          if (e.data.size > 0 && socket.readyState === WebSocket.OPEN) {
            try {
              // Convert to base64
              const reader = new FileReader();
              reader.onload = () => {
                const base64Audio = (reader.result as string).split(',')[1];
                socket.send(
                  JSON.stringify({
                    type: 'input_audio_buffer.append',
                    payload: base64Audio,
                  })
                );
              };
              reader.readAsDataURL(e.data);
            } catch (error) {
              console.error('Error sending audio data:', error);
            }
          }
        };

        // Send audio chunks every 100ms for low latency
        recorder.start(100);
      } catch (error) {
        console.error('Error accessing microphone:', error);
        setError('Failed to access microphone. Please check permissions.');
        throw error;
      }
    },
    []
  );

  /**
   * Connect to WebSocket and setup audio streaming
   */
  const connect = useCallback(async () => {
    try {
      setError(null);

      // Initialize AudioContext
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      setAudioContext(ctx);

      // Create analyzer for visualization
      const analyzer = ctx.createAnalyser();
      analyzer.fftSize = 512;
      analyzer.smoothingTimeConstant = 0.4;
      setAnalyzerNode(analyzer);

      // Initialize WebSocket
      const socket = new WebSocket(WS_URL);
      socketRef.current = socket;

      socket.onopen = async () => {
        console.log('✅ Connected to Qayani Live Interface');
        setIsConnected(true);

        // Setup microphone
        await setupMicrophone(socket, ctx);
      };

      socket.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data);

          // Handle incoming audio
          if (data.type === 'audio' && data.payload) {
            const audioBuffer = await base64ToAudioBuffer(data.payload, ctx);
            queueAudio(audioBuffer, ctx, analyzer);
          }

          // Handle transcript
          if (data.type === 'transcript') {
            setTranscript((prev) => prev + data.payload);
          }

          if (data.type === 'transcript_done') {
            setTranscript(data.payload);
          }

          // Handle errors
          if (data.type === 'error') {
            console.error('WebSocket error:', data.payload);
            setError(data.payload.message || 'An error occurred');
          }
        } catch (error) {
          console.error('Error processing message:', error);
        }
      };

      socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        setError('Connection error. Please try again.');
        setIsConnected(false);
      };

      socket.onclose = () => {
        console.log('🔌 Disconnected from Qayani Live Interface');
        setIsConnected(false);
        setIsListening(false);
        setIsSpeaking(false);
      };
    } catch (error) {
      console.error('Error connecting:', error);
      setError('Failed to connect. Please try again.');
    }
  }, [base64ToAudioBuffer, queueAudio, setupMicrophone]);

  /**
   * Disconnect and cleanup
   */
  const disconnect = useCallback(() => {
    // Stop media recorder
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }

    // Stop media stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    // Stop current audio source
    if (currentSourceRef.current) {
      try {
        currentSourceRef.current.stop();
      } catch (e) {
        // Already stopped
      }
      currentSourceRef.current = null;
    }

    // Close WebSocket
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }

    // Close AudioContext
    if (audioContext) {
      audioContext.close();
      setAudioContext(null);
    }

    setIsConnected(false);
    setIsListening(false);
    setIsSpeaking(false);
    setSourceNode(null);
    setAnalyzerNode(null);
    setTranscript('');
    nextStartTimeRef.current = 0;
  }, [audioContext]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    connect,
    disconnect,
    isSpeaking,
    isListening,
    isConnected,
    transcript,
    error,
    audioContext,
    sourceNode,
    analyzerNode,
  };
}
