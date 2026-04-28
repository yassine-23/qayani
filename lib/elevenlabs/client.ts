import { supabaseAdmin } from '../supabase/admin';

interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  preview_url?: string;
  category?: string;
}

interface VoiceSettings {
  stability: number;
  similarity_boost: number;
  style?: number;
  use_speaker_boost?: boolean;
}

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1';

export class ElevenLabsClient {
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || ELEVENLABS_API_KEY || '';
    if (!this.apiKey && typeof window === 'undefined') {
      console.warn('ElevenLabs API key not configured — voice features disabled');
    }
  }

  /**
   * Train a new voice from audio samples
   */
  async trainVoice(
    name: string,
    audioFiles: Buffer[],
    description?: string
  ): Promise<{ voiceId: string; status: string }> {
    try {
      const formData = new FormData();
      formData.append('name', name);

      if (description) {
        formData.append('description', description);
      }

      // Add audio files
      audioFiles.forEach((buffer, index) => {
        const blob = new Blob([buffer], { type: 'audio/mpeg' });
        formData.append('files', blob, `sample_${index}.mp3`);
      });

      const response = await fetch(`${ELEVENLABS_API_URL}/voices/add`, {
        method: 'POST',
        headers: {
          'xi-api-key': this.apiKey,
        },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`ElevenLabs API error: ${error.detail?.message || response.statusText}`);
      }

      const data = await response.json();

      return {
        voiceId: data.voice_id,
        status: 'training',
      };
    } catch (error) {
      console.error('Voice training error:', error);
      throw error;
    }
  }

  /**
   * Generate speech from text using a trained voice
   */
  async generateSpeech(
    text: string,
    voiceId: string,
    settings?: VoiceSettings
  ): Promise<Buffer> {
    try {
      const defaultSettings: VoiceSettings = {
        stability: 0.75,
        similarity_boost: 0.85,
        style: 0.5,
        use_speaker_boost: true,
      };

      const voiceSettings = { ...defaultSettings, ...settings };

      const response = await fetch(
        `${ELEVENLABS_API_URL}/text-to-speech/${voiceId}`,
        {
          method: 'POST',
          headers: {
            'Accept': 'audio/mpeg',
            'Content-Type': 'application/json',
            'xi-api-key': this.apiKey,
          },
          body: JSON.stringify({
            text,
            model_id: 'eleven_multilingual_v2',
            voice_settings: voiceSettings,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`ElevenLabs TTS error: ${error}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (error) {
      console.error('Speech generation error:', error);
      throw error;
    }
  }

  /**
   * Generate speech and upload to Supabase Storage
   */
  async generateAndUploadSpeech(
    text: string,
    voiceId: string,
    userId: string,
    conversationId: string,
    settings?: VoiceSettings
  ): Promise<string> {
    try {
      // Generate speech audio
      const audioBuffer = await this.generateSpeech(text, voiceId, settings);

      // Create unique filename
      const timestamp = Date.now();
      const filename = `voice-messages/${userId}/${conversationId}/${timestamp}.mp3`;

      // Upload to Supabase Storage
      const { data, error } = await supabaseAdmin.storage
        .from('recordings')
        .upload(filename, audioBuffer, {
          contentType: 'audio/mpeg',
          upsert: false,
        });

      if (error) {
        throw new Error(`Storage upload error: ${error.message}`);
      }

      // Get public URL
      const { data: urlData } = supabaseAdmin.storage
        .from('recordings')
        .getPublicUrl(filename);

      return urlData.publicUrl;
    } catch (error) {
      console.error('Generate and upload speech error:', error);
      throw error;
    }
  }

  /**
   * Get available voices
   */
  async getVoices(): Promise<ElevenLabsVoice[]> {
    try {
      const response = await fetch(`${ELEVENLABS_API_URL}/voices`, {
        headers: {
          'xi-api-key': this.apiKey,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch voices: ${response.statusText}`);
      }

      const data = await response.json();
      return data.voices || [];
    } catch (error) {
      console.error('Get voices error:', error);
      throw error;
    }
  }

  /**
   * Get voice details
   */
  async getVoiceDetails(voiceId: string): Promise<any> {
    try {
      const response = await fetch(`${ELEVENLABS_API_URL}/voices/${voiceId}`, {
        headers: {
          'xi-api-key': this.apiKey,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch voice details: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Get voice details error:', error);
      throw error;
    }
  }

  /**
   * Delete a voice
   */
  async deleteVoice(voiceId: string): Promise<void> {
    try {
      const response = await fetch(`${ELEVENLABS_API_URL}/voices/${voiceId}`, {
        method: 'DELETE',
        headers: {
          'xi-api-key': this.apiKey,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to delete voice: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Delete voice error:', error);
      throw error;
    }
  }

  /**
   * Check voice training status
   */
  async checkVoiceStatus(voiceId: string): Promise<'ready' | 'training' | 'failed'> {
    try {
      const voiceDetails = await this.getVoiceDetails(voiceId);

      // ElevenLabs voices are ready immediately after creation
      // For custom voices, check if samples exist
      if (voiceDetails.samples && voiceDetails.samples.length > 0) {
        return 'ready';
      }

      return 'training';
    } catch (error) {
      console.error('Check voice status error:', error);
      return 'failed';
    }
  }
}

// Export singleton instance
export const elevenLabsClient = new ElevenLabsClient();

// Helper function to get or create voice profile for personality
export async function getOrCreateVoiceProfile(
  personalityId: string,
  userId: string
): Promise<{ voiceId: string; isNew: boolean }> {
  try {
    // Check if voice profile already exists
    const { data: existingProfile } = await supabaseAdmin
      .from('voice_profiles')
      .select('*')
      .eq('personality_id', personalityId)
      .eq('training_status', 'ready')
      .single();

    if (existingProfile && existingProfile.elevenlabs_voice_id) {
      return {
        voiceId: existingProfile.elevenlabs_voice_id,
        isNew: false,
      };
    }

    // Get personality details
    const { data: personality } = await supabaseAdmin
      .from('personalities')
      .select('name, voice_sample_urls')
      .eq('id', personalityId)
      .single();

    if (!personality) {
      throw new Error('Personality not found');
    }

    // Check if we have voice samples
    if (!personality.voice_sample_urls || personality.voice_sample_urls.length === 0) {
      throw new Error('No voice samples available for training');
    }

    // Download voice samples
    const audioBuffers: Buffer[] = [];
    for (const url of personality.voice_sample_urls.slice(0, 5)) {
      try {
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        audioBuffers.push(Buffer.from(arrayBuffer));
      } catch (error) {
        console.error(`Failed to download voice sample: ${url}`, error);
      }
    }

    if (audioBuffers.length === 0) {
      throw new Error('Failed to download voice samples');
    }

    // Train new voice
    const { voiceId } = await elevenLabsClient.trainVoice(
      `${personality.name} - QAYANI`,
      audioBuffers,
      `Digital voice for ${personality.name}`
    );

    // Create voice profile record
    await supabaseAdmin
      .from('voice_profiles')
      .insert({
        personality_id: personalityId,
        elevenlabs_voice_id: voiceId,
        voice_name: `${personality.name} Voice`,
        sample_urls: personality.voice_sample_urls,
        training_status: 'training',
        voice_settings: {
          stability: 0.75,
          similarity_boost: 0.85,
          style: 0.5,
        },
      });

    return {
      voiceId,
      isNew: true,
    };
  } catch (error) {
    console.error('Get or create voice profile error:', error);
    throw error;
  }
}
