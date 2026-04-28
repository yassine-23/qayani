'use client';

import { motion } from 'framer-motion';

interface Step {
  number: number;
  title: string;
  completed: boolean;
  active: boolean;
}

interface ProgressIndicatorProps {
  steps: Step[];
}

export default function ProgressIndicator({ steps }: ProgressIndicatorProps) {
  return (
    <div className="flex items-center justify-center gap-2 md:gap-4 mb-12">
      {steps.map((step, index) => (
        <div key={step.number} className="flex items-center">
          {/* Step circle */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: index * 0.1 }}
            className="flex flex-col items-center"
          >
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                step.completed
                  ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white'
                  : step.active
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                  : 'bg-gray-200 text-gray-500'
              }`}
            >
              {step.completed ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <span className="text-sm font-semibold">{step.number}</span>
              )}
            </div>
            <span className={`text-xs mt-2 hidden md:block ${
              step.active ? 'text-gray-900 font-semibold' : 'text-gray-500'
            }`}>
              {step.title}
            </span>
          </motion.div>

          {/* Connector line */}
          {index < steps.length - 1 && (
            <div className="w-8 md:w-16 h-0.5 mx-2 bg-gray-200">
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: step.completed ? 1 : 0 }}
                transition={{ duration: 0.5 }}
                className="h-full bg-gradient-to-r from-green-500 to-emerald-500 origin-left"
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
