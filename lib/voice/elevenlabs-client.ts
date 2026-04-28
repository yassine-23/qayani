/**
 * ElevenLabs Voice Cloning Client
 *
 * Integrates with ElevenLabs Voice Design API for:
 * - Custom voice training from user audio samples
 * - High-quality voice cloning (indistinguishable from real voice)
 * - Text-to-speech with cloned voices
 * - Voice editing and fine-tuning
 *
 * This is the key to making digital twins sound authentic.
 */

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY || '';
const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1';

export interface VoiceProfile {
  voice_id: string;
  name: string;
  samples?: VoiceSample[];
  settings?: VoiceSettings;
  labels?: Record<string, string>;
  description?: string;
  preview_url?: string;
}

export interface VoiceSample {
  sample_id: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  hash: string;
}

export interface VoiceSettings {
  stability: number; // 0-1
  similarity_boost: number; // 0-1
  style?: number; // 0-1
  use_speaker_boost?: boolean;
}

export interface TTSOptions {
  voice_id: string;
  text: string;
  model_id?: string; // eleven_multilingual_v2, eleven_turbo_v2
  voice_settings?: VoiceSettings;
  output_format?: 'mp3_44100_128' | 'pcm_16000' | 'pcm_22050' | 'pcm_24000';
}

/**
 * ElevenLabs Client Class
 */
export class ElevenLabsClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || ELEVENLABS_API_KEY;
    this.baseUrl = ELEVENLABS_API_URL;

    if (!this.apiKey) {
      throw new Error('ElevenLabs API key is required');
    }
  }

  /**
   * Create a custom voice from audio samples
   *
   * @param name - Name for the voice
   * @param files - Audio files (minimum 1, recommended 5-10)
   * @param description - Optional description
   * @returns Voice profile with voice_id
   */
  async cloneVoice(
    name: string,
    files: File[] | Blob[],
    description?: string
  ): Promise<VoiceProfile> {
    if (files.length < 1) {
      throw new Error('At least 1 audio sample is required');
    }

    if (files.length > 25) {
      throw new Error('Maximum 25 audio samples allowed');
    }

    const formData = new FormData();
    formData.append('name', name);

    if (description) {
      formData.append('description', description);
    }

    // Add audio files
    files.forEach((file, index) => {
      formData.append('files', file, `sample_${index}.wav`);
    });

    // Optional: Add labels
    formData.append('labels', JSON.stringify({
      accent: 'american', // or 'british', 'australian', etc.
      description: description || 'Custom cloned voice',
      use_case: 'digital_twin',
    }));

    const response = await fetch(`${this.baseUrl}/voices/add`, {
      method: 'POST',
      headers: {
        'xi-api-key': this.apiKey,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Voice cloning failed: ${error.detail?.message || response.statusText}`);
    }

    const data = await response.json();
    return data;
  }

  /**
   * Get all available voices (pre-built + custom)
   */
  async getVoices(): Promise<VoiceProfile[]> {
    const response = await fetch(`${this.baseUrl}/voices`, {
      method: 'GET',
      headers: {
        'xi-api-key': this.apiKey,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch voices: ${response.statusText}`);
    }

    const data = await response.json();
    return data.voices || [];
  }

  /**
   * Get specific voice details
   */
  async getVoice(voiceId: string): Promise<VoiceProfile> {
    const response = await fetch(`${this.baseUrl}/voices/${voiceId}`, {
      method: 'GET',
      headers: {
        'xi-api-key': this.apiKey,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch voice: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Delete a custom voice
   */
  async deleteVoice(voiceId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/voices/${voiceId}`, {
      method: 'DELETE',
      headers: {
        'xi-api-key': this.apiKey,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to delete voice: ${response.statusText}`);
    }
  }

  /**
   * Edit voice settings
   */
  async updateVoiceSettings(
    voiceId: string,
    settings: VoiceSettings
  ): Promise<void> {
    const response = await fetch(`${this.baseUrl}/voices/${voiceId}/settings/edit`, {
      method: 'POST',
      headers: {
        'xi-api-key': this.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(settings),
    });

    if (!response.ok) {
      throw new Error(`Failed to update voice settings: ${response.statusText}`);
    }
  }

  /**
   * Generate speech with cloned voice
   *
   * @param options - TTS options including voice_id and text
   * @returns Audio buffer (ArrayBuffer)
   */
  async textToSpeech(options: TTSOptions): Promise<ArrayBuffer> {
    const {
      voice_id,
      text,
      model_id = 'eleven_turbo_v2', // Faster model for real-time
      voice_settings = {
        stability: 0.5,
        similarity_boost: 0.75,
        style: 0,
        use_speaker_boost: true,
      },
      output_format = 'pcm_24000', // Match OpenAI Realtime API
    } = options;

    const response = await fetch(
      `${this.baseUrl}/text-to-speech/${voice_id}/stream?output_format=${output_format}`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          model_id,
          voice_settings,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`TTS failed: ${error.detail?.message || response.statusText}`);
    }

    return await response.arrayBuffer();
  }

  /**
   * Generate speech and stream audio
   * Useful for real-time applications
   */
  async textToSpeechStream(
    options: TTSOptions
  ): Promise<ReadableStream<Uint8Array>> {
    const {
      voice_id,
      text,
      model_id = 'eleven_turbo_v2',
      voice_settings = {
        stability: 0.5,
        similarity_boost: 0.75,
        use_speaker_boost: true,
      },
      output_format = 'pcm_24000',
    } = options;

    const response = await fetch(
      `${this.baseUrl}/text-to-speech/${voice_id}/stream?output_format=${output_format}`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          model_id,
          voice_settings,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`TTS stream failed: ${response.statusText}`);
    }

    if (!response.body) {
      throw new Error('Response body is null');
    }

    return response.body;
  }

  /**
   * Get usage statistics
   */
  async getUsageStats(): Promise<{
    character_count: number;
    character_limit: number;
  }> {
    const response = await fetch(`${this.baseUrl}/user/subscription`, {
      method: 'GET',
      headers: {
        'xi-api-key': this.apiKey,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch usage stats: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      character_count: data.character_count || 0,
      character_limit: data.character_limit || 0,
    };
  }
}

/**
 * Helper: Validate audio file for voice cloning
 */
export function validateAudioFile(file: File): {
  valid: boolean;
  error?: string;
} {
  // Check file type
  const validTypes = ['audio/wav', 'audio/mpeg', 'audio/mp3', 'audio/m4a'];
  if (!validTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'Invalid file type. Please use WAV, MP3, or M4A files.',
    };
  }

  // Check file size (max 10MB per file)
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    return {
      valid: false,
      error: 'File too large. Maximum size is 10MB per file.',
    };
  }

  // Check minimum size (at least 100KB)
  const minSize = 100 * 1024; // 100KB
  if (file.size < minSize) {
    return {
      valid: false,
      error: 'File too small. Please provide at least 100KB of audio.',
    };
  }

  return { valid: true };
}

/**
 * Helper: Calculate optimal voice settings based on use case
 */
export function getOptimalVoiceSettings(useCase: 'realtime' | 'quality'): VoiceSettings {
  if (useCase === 'realtime') {
    // Optimized for speed and consistency
    return {
      stability: 0.6, // Higher stability for predictable output
      similarity_boost: 0.7, // Balanced similarity
      style: 0,
      use_speaker_boost: true,
    };
  } else {
    // Optimized for maximum quality
    return {
      stability: 0.5,
      similarity_boost: 0.85, // Maximum similarity to original
      style: 0.3,
      use_speaker_boost: true,
    };
  }
}

/**
 * Helper: Estimate cost per character
 */
export function estimateCost(characterCount: number): {
  cost: number;
  formatted: string;
} {
  // ElevenLabs pricing: ~$0.30 per 1000 characters (Creator tier)
  const costPer1000 = 0.30;
  const cost = (characterCount / 1000) * costPer1000;

  return {
    cost,
    formatted: `$${cost.toFixed(2)}`,
  };
}

/**
 * Example usage:
 *
 * // Create client
 * const client = new ElevenLabsClient(process.env.ELEVENLABS_API_KEY);
 *
 * // Clone voice
 * const voice = await client.cloneVoice(
 *   'My Digital Twin',
 *   [audioFile1, audioFile2, audioFile3],
 *   'Voice for my digital twin'
 * );
 *
 * // Generate speech
 * const audio = await client.textToSpeech({
 *   voice_id: voice.voice_id,
 *   text: 'Hello! This is my cloned voice.',
 * });
 */
