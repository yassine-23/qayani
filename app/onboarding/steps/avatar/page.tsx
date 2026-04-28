'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../../lib/auth/context';
import { supabase } from '../../../../lib/supabase/client';
import StepWrapper from '../../../../components/onboarding/StepWrapper';

export default function AvatarCreationPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showIframe, setShowIframe] = useState(false);

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-gray-200 border-t-gray-900 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Middleware will redirect if not authenticated
  if (!user) {
    return null;
  }

  useEffect(() => {
    // Listen for avatar creation completion from Ready Player Me
    const handleMessage = async (event: MessageEvent) => {
      // Check if this is from Ready Player Me
      if (event.origin !== 'https://qayani.readyplayer.me') {
        return;
      }

      const json = parse(event);

      if (json?.source !== 'readyplayerme') {
        return;
      }

      // User has created an avatar
      if (json.eventName === 'v1.avatar.exported') {
        setAvatarUrl(json.data.url);
        setShowIframe(false);
        await saveAvatar(json.data.url);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [user]);

  const parse = (event: MessageEvent) => {
    try {
      return JSON.parse(event.data);
    } catch (error) {
      return null;
    }
  };

  const saveAvatar = async (url: string) => {
    if (!user) return;

    setIsSaving(true);
    try {
      const { data, error } = await supabase
        .from('avatars')
        .upsert({
          user_id: user.id,
          avatar_url: url,
          avatar_type: 'readyplayerme',
          is_active: true,
        }, {
          onConflict: 'user_id'
        })
        .select()
        .single();

      if (error) {
        console.error('Error saving avatar:', error);
        throw error;
      }

      console.log('Avatar saved successfully:', data);
    } catch (error) {
      console.error('Failed to save avatar:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateAvatar = () => {
    setIsCreating(true);
    setShowIframe(true);
  };

  const handleContinue = () => {
    router.push('/onboarding/steps/voice');
  };

  const handleSkip = () => {
    router.push('/onboarding/steps/voice');
  };

  return (
    <StepWrapper
      currentStep={2}
      totalSteps={5}
      onBack={() => router.push('/onboarding/steps/welcome')}
      showSkip={!avatarUrl}
      onSkip={handleSkip}
    >
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-block mb-6">
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="text-6xl"
            >
              👤
            </motion.div>
          </div>

          <h1 className="heading-xl mb-4">
            Create Your Digital Avatar
          </h1>

          <p className="body-lg text-gray-600 max-w-2xl mx-auto">
            Your avatar is the visual representation of your digital self. Make it look like you,
            or express your ideal self—it's entirely up to you.
          </p>
        </motion.div>

        {/* Main Content */}
        <AnimatePresence mode="wait">
          {!avatarUrl && !showIframe && (
            <motion.div
              key="creation-prompt"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="glass-card p-12"
            >
              <div className="text-center mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                  Two Ways to Create Your Avatar
                </h2>
                <p className="text-gray-600">
                  Choose the method that feels right for you
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-6 mb-8">
                {/* Ready Player Me Option */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleCreateAvatar}
                  className="p-8 border-2 border-gray-200 rounded-xl hover:border-blue-400 transition-all text-left bg-white"
                >
                  <div className="text-4xl mb-4">✨</div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Create 3D Avatar
                  </h3>
                  <p className="text-gray-600 text-sm mb-4">
                    Use our advanced avatar creator to design a photorealistic 3D version of yourself
                  </p>
                  <div className="flex items-center gap-2 text-blue-600 text-sm font-medium">
                    <span>Recommended</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </motion.button>

                {/* Photo Upload Option (Coming Soon) */}
                <div className="p-8 border-2 border-dashed border-gray-200 rounded-xl text-left bg-gray-50 opacity-60">
                  <div className="text-4xl mb-4">📸</div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Upload Your Photo
                  </h3>
                  <p className="text-gray-600 text-sm mb-4">
                    Upload a photo and we'll generate a lifelike avatar from it
                  </p>
                  <div className="flex items-center gap-2 text-gray-400 text-sm font-medium">
                    <span>Coming Soon</span>
                  </div>
                </div>
              </div>

              {/* Info Cards */}
              <div className="grid md:grid-cols-3 gap-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl mb-2">🎨</div>
                  <p className="text-sm text-gray-700">
                    <span className="font-semibold">Fully Customizable</span>
                    <br />
                    Hair, eyes, skin tone, clothing—make it yours
                  </p>
                </div>

                <div className="p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl mb-2">💾</div>
                  <p className="text-sm text-gray-700">
                    <span className="font-semibold">Saved Forever</span>
                    <br />
                    Your avatar is permanently stored and retrievable
                  </p>
                </div>

                <div className="p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl mb-2">🔄</div>
                  <p className="text-sm text-gray-700">
                    <span className="font-semibold">Change Anytime</span>
                    <br />
                    You can always update your avatar later
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Ready Player Me Iframe */}
          {showIframe && (
            <motion.div
              key="iframe-container"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-card p-4 overflow-hidden"
            >
              <div className="relative w-full" style={{ paddingBottom: '75%' }}>
                <iframe
                  src="https://qayani.readyplayer.me/avatar?frameApi"
                  className="absolute top-0 left-0 w-full h-full rounded-lg"
                  allow="camera *; microphone *; clipboard-write"
                  style={{ border: 'none' }}
                />
              </div>

              <div className="mt-4 text-center">
                <p className="text-sm text-gray-600">
                  Creating your avatar in Ready Player Me...
                </p>
              </div>
            </motion.div>
          )}

          {/* Avatar Created Success */}
          {avatarUrl && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="glass-card p-12 text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200 }}
                className="inline-block mb-6"
              >
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center mx-auto">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </motion.div>

              <h2 className="text-3xl font-semibold text-gray-900 mb-4">
                Your Avatar is Ready!
              </h2>

              <p className="text-gray-600 mb-8 max-w-md mx-auto">
                Beautiful! Your digital representation has been created and saved.
                {isSaving && ' Saving to your profile...'}
              </p>

              {/* Avatar Preview */}
              <div className="mb-8 flex justify-center">
                <div className="w-64 h-64 rounded-2xl overflow-hidden shadow-2xl bg-gradient-to-br from-gray-100 to-gray-200">
                  <model-viewer
                    src={avatarUrl}
                    alt="Your 3D Avatar"
                    auto-rotate
                    camera-controls
                    style={{ width: '100%', height: '100%' }}
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={handleCreateAvatar}
                  className="btn btn-secondary"
                >
                  Create New Avatar
                </button>
                <button
                  onClick={handleContinue}
                  className="btn btn-primary"
                  disabled={isSaving}
                >
                  Continue to Voice Training →
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Add model-viewer script */}
      <script
        type="module"
        src="https://ajax.googleapis.com/ajax/libs/model-viewer/3.0.1/model-viewer.min.js"
      />
    </StepWrapper>
  );
}
