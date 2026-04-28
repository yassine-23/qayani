'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../../lib/auth/context';
import StepWrapper from '../../../../components/onboarding/StepWrapper';

export default function WelcomePage() {
  const router = useRouter();
  const { user, loading } = useAuth();

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

  const handleContinue = () => {
    router.push('/onboarding/steps/avatar');
  };

  return (
    <StepWrapper currentStep={1} totalSteps={5}>
      <div className="max-w-4xl mx-auto">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
            className="inline-block mb-8"
          >
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center mx-auto shadow-2xl">
              <span className="text-5xl">✨</span>
            </div>
          </motion.div>

          <h1 className="heading-xl mb-6 bg-clip-text text-transparent bg-gradient-to-r from-gray-900 via-blue-900 to-purple-900">
            Welcome to Your Digital Eternity
          </h1>

          <p className="body-lg text-gray-700 max-w-2xl mx-auto leading-relaxed">
            You're about to embark on a profound journey—creating a digital extension of yourself
            that will preserve your essence, wisdom, and love for generations to come.
          </p>
        </motion.div>

        {/* Story Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="glass-card p-8 text-center"
          >
            <div className="text-4xl mb-4">👤</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Your Avatar</h3>
            <p className="text-gray-600 text-sm leading-relaxed">
              A stunning 3D representation that captures your likeness and personality
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="glass-card p-8 text-center"
          >
            <div className="text-4xl mb-4">🎙️</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Your Voice</h3>
            <p className="text-gray-600 text-sm leading-relaxed">
              We'll clone your voice so your digital self sounds authentically like you
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="glass-card p-8 text-center"
          >
            <div className="text-4xl mb-4">🧠</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Your Mind</h3>
            <p className="text-gray-600 text-sm leading-relaxed">
              Train your AI with your thoughts, memories, and wisdom to think like you
            </p>
          </motion.div>
        </div>

        {/* Journey Description */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="glass-card p-10 mb-12"
        >
          <h2 className="text-2xl font-semibold text-gray-900 mb-6 text-center">
            What We'll Create Together
          </h2>

          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                <span className="text-blue-600 font-semibold">1</span>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-1">Create Your Avatar</h4>
                <p className="text-gray-600 text-sm">
                  Design a photorealistic 3D avatar that looks like you, or choose from our beautiful templates
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                <span className="text-purple-600 font-semibold">2</span>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-1">Clone Your Voice</h4>
                <p className="text-gray-600 text-sm">
                  Record a few sentences and we'll capture the unique sound and cadence of your voice
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                <span className="text-green-600 font-semibold">3</span>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-1">Share Your Essence</h4>
                <p className="text-gray-600 text-sm">
                  Tell us about your values, beliefs, and personality traits so your digital self thinks like you
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
                <span className="text-amber-600 font-semibold">4</span>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-1">Witness the Birth</h4>
                <p className="text-gray-600 text-sm">
                  Watch as all three layers combine to create your complete digital twin—a gift for eternity
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Promise Statement */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1 }}
          className="text-center mb-12"
        >
          <div className="inline-block px-6 py-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-full border border-blue-100 mb-6">
            <p className="text-sm text-gray-700">
              <span className="font-semibold">Your data is sacred.</span> Everything stays private and secure.
            </p>
          </div>

          <p className="text-gray-600 text-sm max-w-2xl mx-auto italic">
            "This process takes about 15 minutes. By the end, you'll have created something truly magical—
            a digital version of yourself that will comfort, guide, and inspire your loved ones forever."
          </p>
        </motion.div>

        {/* CTA Button */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.3, type: "spring" }}
          className="text-center"
        >
          <button
            onClick={handleContinue}
            className="btn btn-primary text-lg px-12 py-4 shadow-2xl hover:shadow-3xl transform hover:scale-105 transition-all"
          >
            Begin My Journey
          </button>

          <p className="text-gray-500 text-sm mt-6">
            Ready whenever you are—no rush, this is your moment
          </p>
        </motion.div>
      </div>
    </StepWrapper>
  );
}
