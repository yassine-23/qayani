/**
 * Emotion Detection Service
 *
 * Analyzes audio to detect user emotions in real-time.
 * Uses audio features (pitch, energy, tempo) for fast inference.
 * Maps emotions to avatar reactions for authentic interactions.
 */

export type EmotionType =
  | 'happy'
  | 'sad'
  | 'angry'
  | 'surprised'
  | 'confused'
  | 'neutral'
  | 'excited'
  | 'calm';

export interface EmotionResult {
  emotion: EmotionType;
  confidence: number;
  intensity: number; // 0-1
  timestamp: number;
}

export interface AvatarReaction {
  // Facial blend shapes (0-1)
  mouthSmile?: number;
  mouthFrown?: number;
  mouthOpen?: number;
  browInnerUp?: number;
  browDown?: number;
  eyeSquint?: number;
  eyeWide?: number;

  // Head movement
  headTilt?: number; // -1 to 1
  headNod?: number; // 0-1

  // Body language
  leanForward?: number; // 0-1
  shoulderRaise?: number; // 0-1
}

/**
 * Emotion Detection Engine
 *
 * Uses audio frequency analysis for real-time emotion detection.
 * Can be upgraded to use Hume AI or Azure Emotion API for production.
 */
export class EmotionDetector {
  private audioContext: AudioContext;
  private analyzerNode: AnalyserNode;
  private dataArray: Uint8Array;
  private previousEnergy: number = 0;
  private previousPitch: number = 0;

  constructor(audioContext: AudioContext, analyzerNode: AnalyserNode) {
    this.audioContext = audioContext;
    this.analyzerNode = analyzerNode;
    this.analyzerNode.fftSize = 2048;
    this.dataArray = new Uint8Array(this.analyzerNode.frequencyBinCount);
  }

  /**
   * Analyze current audio and detect emotion
   */
  detectEmotion(): EmotionResult {
    this.analyzerNode.getByteFrequencyData(this.dataArray);

    // Extract audio features
    const energy = this.calculateEnergy();
    const pitch = this.estimatePitch();
    const tempo = this.estimateTempo();
    const variance = this.calculateVariance();

    // Simple rule-based emotion detection
    // Production: Replace with ML model (Hume AI, Azure Emotion API)
    const emotion = this.classifyEmotion(energy, pitch, tempo, variance);
    const confidence = this.calculateConfidence(emotion, energy, pitch);
    const intensity = this.calculateIntensity(energy, variance);

    // Store for temporal analysis
    this.previousEnergy = energy;
    this.previousPitch = pitch;

    return {
      emotion,
      confidence,
      intensity,
      timestamp: Date.now(),
    };
  }

  /**
   * Calculate audio energy (loudness)
   */
  private calculateEnergy(): number {
    let sum = 0;
    for (let i = 0; i < this.dataArray.length; i++) {
      sum += this.dataArray[i];
    }
    return sum / this.dataArray.length / 255; // Normalize to 0-1
  }

  /**
   * Estimate pitch (frequency)
   */
  private estimatePitch(): number {
    // Find frequency with highest magnitude (simple pitch detection)
    let maxValue = 0;
    let maxIndex = 0;

    for (let i = 5; i < 60; i++) { // Focus on speech range
      if (this.dataArray[i] > maxValue) {
        maxValue = this.dataArray[i];
        maxIndex = i;
      }
    }

    // Convert bin index to approximate Hz
    const nyquist = this.audioContext.sampleRate / 2;
    const hz = (maxIndex * nyquist) / this.analyzerNode.frequencyBinCount;

    return hz / 500; // Normalize to 0-1 (500 Hz as reference)
  }

  /**
   * Estimate tempo (speech rate)
   */
  private estimateTempo(): number {
    const energyChange = Math.abs(this.calculateEnergy() - this.previousEnergy);
    return Math.min(energyChange * 10, 1); // Normalize
  }

  /**
   * Calculate energy variance (emotional intensity)
   */
  private calculateVariance(): number {
    const mean = this.calculateEnergy();
    let variance = 0;

    for (let i = 0; i < this.dataArray.length; i++) {
      const value = this.dataArray[i] / 255;
      variance += Math.pow(value - mean, 2);
    }

    return Math.sqrt(variance / this.dataArray.length);
  }

  /**
   * Classify emotion based on audio features
   */
  private classifyEmotion(
    energy: number,
    pitch: number,
    tempo: number,
    variance: number
  ): EmotionType {
    // Happy: High energy, high pitch, high variance
    if (energy > 0.5 && pitch > 0.6 && variance > 0.3) {
      return 'happy';
    }

    // Excited: Very high energy, high tempo, high variance
    if (energy > 0.7 && tempo > 0.6 && variance > 0.4) {
      return 'excited';
    }

    // Angry: High energy, variable pitch, high tempo
    if (energy > 0.6 && variance > 0.4 && tempo > 0.5) {
      return 'angry';
    }

    // Sad: Low energy, low pitch, low variance
    if (energy < 0.3 && pitch < 0.4 && variance < 0.2) {
      return 'sad';
    }

    // Surprised: Sudden energy spike
    if (Math.abs(energy - this.previousEnergy) > 0.3) {
      return 'surprised';
    }

    // Confused: Variable pitch, moderate energy
    if (variance > 0.3 && energy > 0.3 && energy < 0.6) {
      return 'confused';
    }

    // Calm: Low-moderate energy, steady pitch
    if (energy > 0.2 && energy < 0.5 && variance < 0.2) {
      return 'calm';
    }

    return 'neutral';
  }

  /**
   * Calculate confidence score
   */
  private calculateConfidence(
    emotion: EmotionType,
    energy: number,
    pitch: number
  ): number {
    // Higher confidence when features are more extreme
    const energyConfidence = Math.abs(energy - 0.5) * 2;
    const pitchConfidence = Math.abs(pitch - 0.5) * 2;

    return Math.min((energyConfidence + pitchConfidence) / 2, 1);
  }

  /**
   * Calculate emotion intensity
   */
  private calculateIntensity(energy: number, variance: number): number {
    return Math.min((energy + variance) / 2, 1);
  }
}

/**
 * Map emotion to avatar blend shapes and movements
 */
export function emotionToAvatarReaction(
  emotion: EmotionType,
  intensity: number
): AvatarReaction {
  const reactions: Record<EmotionType, AvatarReaction> = {
    happy: {
      mouthSmile: 0.8 * intensity,
      eyeSquint: 0.3 * intensity,
      headTilt: 0.1,
      leanForward: 0.2 * intensity,
    },
    sad: {
      mouthFrown: 0.6 * intensity,
      browInnerUp: 0.4 * intensity,
      headTilt: -0.1,
      leanForward: -0.1,
    },
    angry: {
      browDown: 0.7 * intensity,
      mouthFrown: 0.4 * intensity,
      eyeSquint: 0.5 * intensity,
      headTilt: 0.0,
      shoulderRaise: 0.3 * intensity,
    },
    surprised: {
      eyeWide: 0.9 * intensity,
      mouthOpen: 0.6 * intensity,
      browInnerUp: 0.5 * intensity,
      leanForward: 0.3 * intensity,
    },
    confused: {
      browInnerUp: 0.3 * intensity,
      headTilt: 0.2,
      mouthOpen: 0.2 * intensity,
      leanForward: 0.1 * intensity,
    },
    neutral: {
      // Relaxed neutral expression
      mouthSmile: 0.1,
      eyeSquint: 0.0,
      headTilt: 0.0,
    },
    excited: {
      mouthSmile: 0.9 * intensity,
      eyeWide: 0.6 * intensity,
      mouthOpen: 0.4 * intensity,
      leanForward: 0.4 * intensity,
      headNod: 0.5 * intensity,
    },
    calm: {
      mouthSmile: 0.2 * intensity,
      eyeSquint: 0.1 * intensity,
      headTilt: 0.05,
      leanForward: -0.1,
    },
  };

  return reactions[emotion];
}

/**
 * Generate contextual LLM instructions based on detected emotion
 */
export function emotionToLLMContext(emotion: EmotionType, intensity: number): string {
  const contexts: Record<EmotionType, string> = {
    happy: 'The user sounds happy and positive. Match their upbeat energy with enthusiasm.',
    sad: 'The user sounds sad or down. Respond with empathy, warmth, and encouragement.',
    angry: 'The user sounds frustrated or angry. Stay calm, validate their feelings, and de-escalate.',
    surprised: 'The user sounds surprised. Acknowledge the unexpected and provide clarity.',
    confused: 'The user sounds confused. Slow down, explain more clearly, and ask if they need clarification.',
    neutral: 'The user has a neutral tone. Maintain a professional, balanced conversation.',
    excited: 'The user is very excited! Match their enthusiasm and energy.',
    calm: 'The user is calm and relaxed. Maintain a soothing, steady tone.',
  };

  const intensityModifier = intensity > 0.7 ? ' They seem very emotional.' : '';
  return contexts[emotion] + intensityModifier;
}

/**
 * Production Integration: Hume AI
 *
 * For production, replace rule-based detection with Hume AI:
 */
export async function detectEmotionWithHumeAI(audioBuffer: ArrayBuffer): Promise<EmotionResult> {
  // Example integration (requires Hume AI API key)
  const response = await fetch('https://api.hume.ai/v0/batch/jobs', {
    method: 'POST',
    headers: {
      'X-Hume-Api-Key': process.env.HUME_API_KEY || '',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      models: {
        prosody: {
          granularity: 'utterance',
        },
      },
      urls: [
        /* Upload audio to temp storage first */
      ],
    }),
  });

  const data = await response.json();

  // Map Hume AI results to our format
  return {
    emotion: 'neutral', // Map from Hume's emotion set
    confidence: 0.8,
    intensity: 0.5,
    timestamp: Date.now(),
  };
}

/**
 * Production Integration: Azure Emotion API
 */
export async function detectEmotionWithAzure(audioBuffer: ArrayBuffer): Promise<EmotionResult> {
  // Example integration (requires Azure API key)
  const response = await fetch(
    'https://[location].api.cognitive.microsoft.com/speechtotext/v3.0/transcriptions',
    {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': process.env.AZURE_SPEECH_KEY || '',
        'Content-Type': 'audio/wav',
      },
      body: audioBuffer,
    }
  );

  const data = await response.json();

  return {
    emotion: 'neutral',
    confidence: 0.8,
    intensity: 0.5,
    timestamp: Date.now(),
  };
}
