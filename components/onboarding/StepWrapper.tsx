'use client';

import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';

interface StepWrapperProps {
  children: ReactNode;
  currentStep: number;
  totalSteps: number;
  onBack?: () => void;
  showSkip?: boolean;
  onSkip?: () => void;
}

export default function StepWrapper({
  children,
  currentStep,
  totalSteps,
  onBack,
  showSkip,
  onSkip,
}: StepWrapperProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 relative overflow-hidden">
      {/* Animated background orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.1, 0.15, 0.1],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute top-0 right-0 w-96 h-96 bg-blue-200 rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.08, 0.12, 0.08],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1
          }}
          className="absolute bottom-0 left-0 w-96 h-96 bg-purple-200 rounded-full blur-3xl"
        />
      </div>

      {/* Header with logo and progress */}
      <div className="relative z-10 container mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-8">
          <Link href="/">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-2 cursor-pointer"
            >
              <div className="w-8 h-8 rounded-lg overflow-hidden bg-white shadow-sm border border-gray-200">
                <img
                  src="/qayani-logo.png"
                  alt="QAYANI"
                  className="w-full h-full object-cover"
                />
              </div>
              <span className="text-xl font-semibold text-gray-900">QAYANI</span>
            </motion.div>
          </Link>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-sm text-gray-600"
          >
            Step {currentStep} of {totalSteps}
          </motion.div>
        </div>

        {/* Progress bar */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          className="h-1 bg-gray-200 rounded-full overflow-hidden"
        >
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${(currentStep / totalSteps) * 100}%` }}
            transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="h-full bg-gradient-to-r from-blue-600 to-purple-600"
          />
        </motion.div>
      </div>

      {/* Main content */}
      <div className="relative z-10 container mx-auto px-4 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
        >
          {children}
        </motion.div>
      </div>

      {/* Footer navigation */}
      {(onBack || showSkip) && (
        <div className="relative z-10 container mx-auto px-4 pb-8">
          <div className="flex items-center justify-between">
            {onBack ? (
              <button
                onClick={onBack}
                className="text-gray-600 hover:text-gray-900 transition-colors flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </button>
            ) : (
              <div />
            )}

            {showSkip && onSkip && (
              <button
                onClick={onSkip}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                Skip for now
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
