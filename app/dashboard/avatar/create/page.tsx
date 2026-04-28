'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/context';

// Step definitions
const STEPS = [
  { id: 1, name: 'Welcome', icon: '✨' },
  { id: 2, name: 'Photo', icon: '📸' },
  { id: 3, name: 'Voice', icon: '🎙️' },
  { id: 4, name: 'Personality', icon: '💭' },
  { id: 5, name: 'Training', icon: '🤖' },
  { id: 6, name: 'Complete', icon: '🎉' },
];

export default function CreateAvatarPage() {
  const { user, loading } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [avatarData, setAvatarData] = useState({
    photo: null as File | null,
    photoPreview: null as string | null,
    voiceRecording: null as Blob | null,
    voiceDuration: 0,
    personality: {
      traits: [] as string[],
      style: '',
      values: [] as string[],
    },
  });
  const [isRecording, setIsRecording] = useState(false);
  const [trainingProgress, setTrainingProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Show loading state
  if (loading) {
    return (
      <main className="min-h-screen hero-gradient flex items-center justify-center">
        <div className="text-center">
          <div className="spinner mb-4"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </main>
    );
  }

  if (!user) return null;

  const nextStep = () => {
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarData({
        ...avatarData,
        photo: file,
        photoPreview: URL.createObjectURL(file),
      });
    }
  };

  const startVoiceRecording = () => {
    setIsRecording(true);
    // TODO: Implement actual voice recording
  };

  const stopVoiceRecording = () => {
    setIsRecording(false);
    // TODO: Implement actual voice recording stop
  };

  const togglePersonalityTrait = (trait: string) => {
    const traits = avatarData.personality.traits;
    if (traits.includes(trait)) {
      setAvatarData({
        ...avatarData,
        personality: {
          ...avatarData.personality,
          traits: traits.filter(t => t !== trait),
        },
      });
    } else {
      setAvatarData({
        ...avatarData,
        personality: {
          ...avatarData.personality,
          traits: [...traits, trait],
        },
      });
    }
  };

  const startTraining = () => {
    nextStep();
    // Simulate training progress
    let progress = 0;
    const interval = setInterval(() => {
      progress += 5;
      setTrainingProgress(progress);
      if (progress >= 100) {
        clearInterval(interval);
        setTimeout(() => nextStep(), 1000);
      }
    }, 200);
  };

  return (
    <main className="min-h-screen hero-gradient relative overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 z-0">
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-qayani-gold/10 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-qayani-gold/5 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-12 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <h1 className="text-5xl font-bold text-white mb-4">
            Create Your Digital Twin
          </h1>
          <p className="text-xl text-gray-300">
            Transform yourself into an eternal presence for your loved ones
          </p>
        </motion.div>

        {/* Stepper */}
        <div className="stepper mb-16">
          {STEPS.map((step, index) => (
            <div
              key={step.id}
              className={`step ${currentStep === step.id ? 'step-active' : ''} ${currentStep > step.id ? 'step-completed' : ''}`}
            >
              <div className="step-circle">
                {currentStep > step.id ? '✓' : step.icon}
              </div>
              <span className="text-sm text-gray-300 mt-2">{step.name}</span>
              {index < STEPS.length - 1 && <div className="step-line"></div>}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.4 }}
            className="glass-gold p-12"
          >
            {/* Step 1: Welcome */}
            {currentStep === 1 && (
              <div className="text-center space-y-8">
                <div className="text-8xl mb-6">✨</div>
                <h2 className="text-4xl font-semibold text-white mb-4">
                  Welcome to Your Digital Legacy
                </h2>
                <p className="text-xl text-gray-300 max-w-2xl mx-auto leading-relaxed mb-8">
                  In the next 10 minutes, you'll create a photorealistic avatar that speaks with your voice,
                  thinks with your wisdom, and embodies your personality. This digital twin will be there
                  for your family forever—celebrating milestones, offering guidance, and sharing love.
                </p>
                <div className="bg-qayani-black/50 rounded-2xl p-8 max-w-2xl mx-auto">
                  <h3 className="text-2xl font-semibold text-white mb-6">What You'll Need:</h3>
                  <div className="space-y-4 text-left">
                    <div className="flex items-start space-x-4">
                      <span className="text-3xl">📸</span>
                      <div>
                        <p className="text-lg text-gray-200">A clear photo of yourself</p>
                        <p className="text-sm text-gray-400">Front-facing, good lighting, neutral expression</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-4">
                      <span className="text-3xl">🎙️</span>
                      <div>
                        <p className="text-lg text-gray-200">5 minutes of your voice</p>
                        <p className="text-sm text-gray-400">Speak naturally about anything you love</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-4">
                      <span className="text-3xl">💭</span>
                      <div>
                        <p className="text-lg text-gray-200">Your personality & values</p>
                        <p className="text-sm text-gray-400">Help us understand who you are</p>
                      </div>
                    </div>
                  </div>
                </div>
                <button
                  onClick={nextStep}
                  className="btn-gold text-xl px-12 py-5 mt-8"
                >
                  Let's Begin →
                </button>
              </div>
            )}

            {/* Step 2: Photo Upload */}
            {currentStep === 2 && (
              <div className="space-y-8">
                <div className="text-center mb-8">
                  <div className="text-6xl mb-6">👤</div>
                  <h2 className="text-4xl font-semibold text-white mb-4">
                    Create Your 3D Avatar
                  </h2>
                  <p className="text-lg text-gray-300">
                    Choose your preferred method to build a photorealistic digital twin
                  </p>
                </div>

                {avatarData.photoPreview ? (
                  <div className="text-center space-y-6">
                    <div className="relative inline-block">
                      <img
                        src={avatarData.photoPreview}
                        alt="Preview"
                        className="w-64 h-64 object-cover rounded-3xl border-4 border-qayani-gold shadow-gold-lg"
                      />
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="absolute bottom-4 right-4 bg-qayani-gold text-qayani-black p-3 rounded-full shadow-lg hover:scale-110 transition-transform"
                      >
                        ✏️
                      </button>
                    </div>
                    <p className="text-gray-300">Looking great! Ready to continue?</p>
                  </div>
                ) : (
                  <>
                    {/* Primary 3D Creation Methods */}
                    <div className="grid md:grid-cols-2 gap-6 mb-8">
                      {/* Upload Photos */}
                      <motion.div
                        whileHover={{ scale: 1.02, y: -4 }}
                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                        onClick={() => fileInputRef.current?.click()}
                        className="glass-gold p-8 cursor-pointer group hover:shadow-2xl transition-all border-2 border-qayani-gold/30 hover:border-qayani-gold"
                      >
                        <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                          <span className="text-4xl">📸</span>
                        </div>
                        <h3 className="text-2xl font-semibold text-white mb-3">Upload Photos</h3>
                        <p className="text-gray-300 mb-4">
                          Upload multiple photos for best 3D reconstruction. Front, side, and angled views recommended.
                        </p>
                        <p className="text-sm text-qayani-gold">JPG, PNG up to 10MB each</p>
                      </motion.div>

                      {/* PolyScan (Apple) */}
                      <motion.div
                        whileHover={{ scale: 1.02, y: -4 }}
                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                        onClick={() => {
                          // TODO: Implement PolyScan integration
                          alert('PolyScan integration coming soon! This will use Apple\'s Object Capture API for photogrammetry-based 3D scanning.');
                        }}
                        className="glass-gold p-8 cursor-pointer group hover:shadow-2xl transition-all border-2 border-qayani-gold/30 hover:border-qayani-gold"
                      >
                        <div className="w-16 h-16 bg-gradient-to-br from-gray-400 to-gray-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                          <span className="text-4xl"></span>
                        </div>
                        <h3 className="text-2xl font-semibold text-white mb-3 flex items-center gap-2">
                          PolyScan <span className="text-sm text-gray-400">(Apple)</span>
                        </h3>
                        <p className="text-gray-300 mb-4">
                          Use Apple's Object Capture API for professional photogrammetry scanning. Requires iPhone/iPad with LiDAR.
                        </p>
                        <p className="text-sm text-qayani-gold">Highest accuracy • iOS 15+</p>
                      </motion.div>

                      {/* LiDAR Scanner */}
                      <motion.div
                        whileHover={{ scale: 1.02, y: -4 }}
                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                        onClick={() => {
                          // TODO: Implement LiDAR integration
                          alert('LiDAR scanning coming soon! This will use your device\'s LiDAR sensor for instant 3D capture.');
                        }}
                        className="glass-gold p-8 cursor-pointer group hover:shadow-2xl transition-all border-2 border-qayani-gold/30 hover:border-qayani-gold"
                      >
                        <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-teal-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                          <span className="text-4xl">📡</span>
                        </div>
                        <h3 className="text-2xl font-semibold text-white mb-3">LiDAR Scan</h3>
                        <p className="text-gray-300 mb-4">
                          Instant 3D capture using your device's LiDAR sensor. Fast, accurate, and effortless.
                        </p>
                        <p className="text-sm text-qayani-gold">iPhone 12 Pro+ or iPad Pro</p>
                      </motion.div>

                      {/* Emoji/Memoji Style */}
                      <motion.div
                        whileHover={{ scale: 1.02, y: -4 }}
                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                        onClick={() => {
                          // TODO: Implement Memoji-style avatar creator
                          alert('Custom emoji avatar creator coming soon! Create a stylized digital version of yourself.');
                        }}
                        className="glass-gold p-8 cursor-pointer group hover:shadow-2xl transition-all border-2 border-qayani-gold/30 hover:border-qayani-gold"
                      >
                        <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                          <span className="text-4xl">😊</span>
                        </div>
                        <h3 className="text-2xl font-semibold text-white mb-3">Custom Emoji Avatar</h3>
                        <p className="text-gray-300 mb-4">
                          Create a stylized, Memoji-like avatar with customizable features. Fun, expressive, and unique.
                        </p>
                        <p className="text-sm text-qayani-gold">Full customization options</p>
                      </motion.div>
                    </div>

                    {/* Additional Information */}
                    <div className="bg-qayani-gold/10 border border-qayani-gold/30 rounded-2xl p-6">
                      <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                        <span>💡</span> Avatar Quality Tips
                      </h3>
                      <ul className="space-y-2 text-gray-300 text-sm">
                        <li>• <strong>Photos:</strong> Use high-resolution images with good lighting and neutral expressions</li>
                        <li>• <strong>PolyScan/LiDAR:</strong> Capture from multiple angles for best 3D reconstruction</li>
                        <li>• <strong>Privacy:</strong> All avatar data is encrypted and stored securely</li>
                        <li>• <strong>Customization:</strong> You can fine-tune your avatar after initial creation</li>
                      </ul>
                    </div>
                  </>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotoUpload}
                  className="hidden"
                />

                <div className="flex justify-between mt-12">
                  <button onClick={prevStep} className="btn-gold-outline px-8 py-3">
                    ← Back
                  </button>
                  <button
                    onClick={nextStep}
                    disabled={!avatarData.photo}
                    className={`btn-gold px-8 py-3 ${!avatarData.photo ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    Continue →
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Voice Recording */}
            {currentStep === 3 && (
              <div className="space-y-8">
                <div className="text-center mb-8">
                  <div className="text-6xl mb-6">🎙️</div>
                  <h2 className="text-4xl font-semibold text-white mb-4">
                    Record Your Voice
                  </h2>
                  <p className="text-lg text-gray-300">
                    Speak for 5 minutes about anything—your life, stories, or wisdom
                  </p>
                </div>

                <div className="bg-qayani-black/50 rounded-3xl p-12 text-center">
                  {isRecording ? (
                    <div className="space-y-6">
                      <div className="flex justify-center gap-2 mb-8">
                        <div className="voice-bar"></div>
                        <div className="voice-bar"></div>
                        <div className="voice-bar"></div>
                        <div className="voice-bar"></div>
                      </div>
                      <p className="text-3xl font-semibold text-white mb-2">Recording...</p>
                      <p className="text-xl text-gray-300">0:42 / 5:00</p>
                      <button
                        onClick={stopVoiceRecording}
                        className="bg-red-500 text-white px-12 py-4 rounded-full text-lg hover:bg-red-600 transition-colors mt-8"
                      >
                        ⏹ Stop Recording
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="text-8xl mb-8 animate-pulse">🎙️</div>
                      <button
                        onClick={startVoiceRecording}
                        className="btn-gold text-xl px-16 py-6 animate-pulse-gold"
                      >
                        🎙 Start Recording
                      </button>
                      <p className="text-sm text-gray-400 mt-4">
                        Speak clearly in a quiet environment
                      </p>
                    </div>
                  )}
                </div>

                <div className="bg-qayani-gold/10 border border-qayani-gold/30 rounded-2xl p-6">
                  <h3 className="text-lg font-semibold text-white mb-3">💡 Pro Tips:</h3>
                  <ul className="space-y-2 text-gray-300">
                    <li>• Share stories about your childhood, family, or life lessons</li>
                    <li>• Speak naturally as if talking to a loved one</li>
                    <li>• The more you speak, the better your voice clone will sound</li>
                    <li>• Vary your emotions—laugh, be serious, show excitement</li>
                  </ul>
                </div>

                <div className="flex justify-between mt-12">
                  <button onClick={prevStep} className="btn-gold-outline px-8 py-3">
                    ← Back
                  </button>
                  <button
                    onClick={nextStep}
                    disabled={!avatarData.voiceRecording}
                    className={`btn-gold px-8 py-3 ${!avatarData.voiceRecording ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    Continue →
                  </button>
                </div>
              </div>
            )}

            {/* Step 4: Personality Configuration */}
            {currentStep === 4 && (
              <div className="space-y-8">
                <div className="text-center mb-8">
                  <div className="text-6xl mb-6">💭</div>
                  <h2 className="text-4xl font-semibold text-white mb-4">
                    Define Your Personality
                  </h2>
                  <p className="text-lg text-gray-300">
                    Help us understand who you are and how you think
                  </p>
                </div>

                <div className="space-y-8">
                  <div>
                    <h3 className="text-2xl font-semibold text-white mb-4">Select Your Traits</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {['Wise', 'Humorous', 'Caring', 'Adventurous', 'Thoughtful', 'Optimistic', 'Practical', 'Creative', 'Spiritual'].map((trait) => (
                        <button
                          key={trait}
                          onClick={() => togglePersonalityTrait(trait)}
                          className={`p-4 rounded-2xl border-2 transition-all ${
                            avatarData.personality.traits.includes(trait)
                              ? 'bg-qayani-gold border-qayani-gold text-qayani-black'
                              : 'bg-qayani-black/30 border-gray-700 text-gray-300 hover:border-qayani-gold/50'
                          }`}
                        >
                          {trait}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-2xl font-semibold text-white mb-4">Communication Style</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {['Formal & Respectful', 'Casual & Friendly', 'Warm & Nurturing', 'Direct & Honest'].map((style) => (
                        <button
                          key={style}
                          onClick={() => setAvatarData({ ...avatarData, personality: { ...avatarData.personality, style } })}
                          className={`p-6 rounded-2xl border-2 transition-all text-left ${
                            avatarData.personality.style === style
                              ? 'bg-qayani-gold border-qayani-gold text-qayani-black'
                              : 'bg-qayani-black/30 border-gray-700 text-gray-300 hover:border-qayani-gold/50'
                          }`}
                        >
                          <p className="font-semibold text-lg">{style}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex justify-between mt-12">
                  <button onClick={prevStep} className="btn-gold-outline px-8 py-3">
                    ← Back
                  </button>
                  <button
                    onClick={startTraining}
                    disabled={avatarData.personality.traits.length === 0 || !avatarData.personality.style}
                    className={`btn-gold px-8 py-3 ${(avatarData.personality.traits.length === 0 || !avatarData.personality.style) ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    Create My Avatar →
                  </button>
                </div>
              </div>
            )}

            {/* Step 5: Training Progress */}
            {currentStep === 5 && (
              <div className="text-center space-y-8 py-12">
                <div className="text-8xl mb-8 animate-float">🤖</div>
                <h2 className="text-4xl font-semibold text-white mb-4">
                  Creating Your Digital Twin
                </h2>
                <p className="text-xl text-gray-300 mb-12">
                  Our AI is learning your voice, appearance, and personality...
                </p>

                <div className="max-w-md mx-auto">
                  <div className="progress-bar mb-4">
                    <div
                      className="progress-fill"
                      style={{ width: `${trainingProgress}%` }}
                    ></div>
                  </div>
                  <p className="text-2xl font-semibold text-qayani-gold">
                    {trainingProgress}%
                  </p>
                </div>

                <div className="bg-qayani-black/50 rounded-2xl p-8 mt-12 max-w-2xl mx-auto">
                  <div className="space-y-4">
                    <div className={`flex items-center gap-4 ${trainingProgress >= 20 ? 'text-qayani-gold' : 'text-gray-600'}`}>
                      <span className="text-2xl">{trainingProgress >= 20 ? '✓' : '○'}</span>
                      <span className="text-lg">Processing your photo...</span>
                    </div>
                    <div className={`flex items-center gap-4 ${trainingProgress >= 40 ? 'text-qayani-gold' : 'text-gray-600'}`}>
                      <span className="text-2xl">{trainingProgress >= 40 ? '✓' : '○'}</span>
                      <span className="text-lg">Generating 3D avatar...</span>
                    </div>
                    <div className={`flex items-center gap-4 ${trainingProgress >= 60 ? 'text-qayani-gold' : 'text-gray-600'}`}>
                      <span className="text-2xl">{trainingProgress >= 60 ? '✓' : '○'}</span>
                      <span className="text-lg">Cloning your voice...</span>
                    </div>
                    <div className={`flex items-center gap-4 ${trainingProgress >= 80 ? 'text-qayani-gold' : 'text-gray-600'}`}>
                      <span className="text-2xl">{trainingProgress >= 80 ? '✓' : '○'}</span>
                      <span className="text-lg">Training AI personality...</span>
                    </div>
                    <div className={`flex items-center gap-4 ${trainingProgress >= 100 ? 'text-qayani-gold' : 'text-gray-600'}`}>
                      <span className="text-2xl">{trainingProgress >= 100 ? '✓' : '○'}</span>
                      <span className="text-lg">Finalizing your digital twin...</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 6: Success */}
            {currentStep === 6 && (
              <div className="text-center space-y-8 py-12">
                <div className="text-9xl mb-8 animate-scale">🎉</div>
                <h2 className="text-5xl font-bold text-white mb-4">
                  Your Digital Twin is Ready!
                </h2>
                <p className="text-2xl text-gray-300 mb-12 max-w-2xl mx-auto leading-relaxed">
                  Congratulations! You've created a lasting legacy that will guide, comfort, and
                  inspire your loved ones for generations to come.
                </p>

                <div className="flex flex-col sm:flex-row gap-6 justify-center">
                  <Link href="/dashboard/avatar/view">
                    <button className="btn-gold text-xl px-12 py-5">
                      View Your Avatar
                    </button>
                  </Link>
                  <Link href="/dashboard">
                    <button className="btn-gold-outline text-xl px-12 py-5">
                      Go to Dashboard
                    </button>
                  </Link>
                </div>

                <div className="mt-16 bg-qayani-gold/10 border border-qayani-gold/30 rounded-3xl p-8 max-w-2xl mx-auto">
                  <h3 className="text-2xl font-semibold text-white mb-4">🎁 Next Steps:</h3>
                  <div className="space-y-4 text-left">
                    <div className="flex items-start gap-4">
                      <span className="text-2xl">💬</span>
                      <div>
                        <p className="text-lg text-gray-200">Have your first conversation</p>
                        <p className="text-sm text-gray-400">Test your avatar and see how it sounds</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <span className="text-2xl">👨‍👩‍👧‍👦</span>
                      <div>
                        <p className="text-lg text-gray-200">Share with your family</p>
                        <p className="text-sm text-gray-400">Invite loved ones to connect with your digital twin</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <span className="text-2xl">📝</span>
                      <div>
                        <p className="text-lg text-gray-200">Upload more memories</p>
                        <p className="text-sm text-gray-400">The more you share, the smarter your avatar becomes</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </main>
  );
}
