'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  component: React.ReactNode;
}

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to Eternal',
    description: 'Your journey to digital immortality begins now',
    component: <WelcomeStep />
  },
  {
    id: 'purpose',
    title: 'Why Preserve Your Legacy?',
    description: 'Understanding the power of digital immortality',
    component: <PurposeStep />
  },
  {
    id: 'setup',
    title: 'Quick Setup',
    description: 'Tell us about yourself and your family',
    component: <SetupStep />
  },
  {
    id: 'recording',
    title: 'Your First Capture',
    description: 'Learn how to record your essence',
    component: <RecordingStep />
  },
  {
    id: 'complete',
    title: 'You\'re All Set!',
    description: 'Start building your eternal legacy',
    component: <CompleteStep />
  }
];

function WelcomeStep() {
  return (
    <div className="text-center space-y-8">
      <div className="w-32 h-32 rounded-full mx-auto bg-gray-900 flex items-center justify-center">
        <div className="text-6xl text-white font-bold">E</div>
      </div>
      <h2 className="heading-lg text-gray-900 mb-4">
        Welcome to the Future of Family Connection
      </h2>
      <p className="body-lg text-gray-600 leading-relaxed max-w-2xl mx-auto">
        You're about to create something extraordinary - a digital version of yourself that will guide,
        comfort, and inspire your family for generations to come.
      </p>
      <div className="glass-card">
        <p className="body-md text-gray-700">
          This process takes just 5 minutes and will change your family's future forever.
        </p>
      </div>
    </div>
  );
}

function PurposeStep() {
  const benefits = [
    {
      title: 'Never Miss a Moment',
      description: 'Be present for graduations, weddings, and birthdays even when you can\'t physically attend'
    },
    {
      title: 'Generational Wisdom',
      description: 'Share your life lessons and values with great-grandchildren you may never meet'
    },
    {
      title: 'Eternal Comfort',
      description: 'Provide guidance and support to your family during their most challenging moments'
    },
    {
      title: 'Living Legacy',
      description: 'Your personality, humor, and love preserved in perfect detail forever'
    }
  ];

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="heading-lg text-gray-900 mb-4">
          Imagine Your Impact Across Generations
        </h2>
        <p className="body-lg text-gray-600 leading-relaxed">
          Your digital presence will become the most treasured gift your family ever receives.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {benefits.map((benefit, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.2, ease: [0.4, 0, 0.2, 1] }}
            className="glass-card hover:shadow-lg transition-all group"
          >
            <h3 className="heading-sm text-gray-900 mb-3">{benefit.title}</h3>
            <p className="body-md text-gray-600 leading-relaxed">{benefit.description}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function SetupStep() {
  const [formData, setFormData] = useState({
    displayName: '',
    relationshipToFamily: '',
    familySize: '',
    primaryLanguage: 'English'
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <div className="space-y-8">
      <div className="text-center mb-8">
        <h2 className="heading-lg text-gray-900 mb-4">
          Let's Personalize Your Experience
        </h2>
        <p className="body-lg text-gray-600">
          Help us create the most authentic version of your digital self.
        </p>
      </div>

      <div className="space-y-6 max-w-md mx-auto">
        <div>
          <label className="block body-md text-gray-700 font-medium mb-2">
            What should your family call you?
          </label>
          <input
            type="text"
            name="displayName"
            value={formData.displayName}
            onChange={handleInputChange}
            placeholder="Grandma Rose, Dad, Mom Sarah, etc."
            className="input"
          />
        </div>

        <div>
          <label className="block body-md text-gray-700 font-medium mb-2">
            Your role in the family
          </label>
          <select
            name="relationshipToFamily"
            value={formData.relationshipToFamily}
            onChange={handleInputChange}
            className="input"
          >
            <option value="">Select your role</option>
            <option value="parent">Parent</option>
            <option value="grandparent">Grandparent</option>
            <option value="great-grandparent">Great-grandparent</option>
            <option value="spouse">Spouse/Partner</option>
            <option value="sibling">Sibling</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div>
          <label className="block body-md text-gray-700 font-medium mb-2">
            Family size
          </label>
          <select
            name="familySize"
            value={formData.familySize}
            onChange={handleInputChange}
            className="input"
          >
            <option value="">Select size</option>
            <option value="small">Small (2-5 people)</option>
            <option value="medium">Medium (6-15 people)</option>
            <option value="large">Large (16+ people)</option>
          </select>
        </div>

        <div>
          <label className="block body-md text-gray-700 font-medium mb-2">
            Primary language for recordings
          </label>
          <select
            name="primaryLanguage"
            value={formData.primaryLanguage}
            onChange={handleInputChange}
            className="input"
          >
            <option value="English">English</option>
            <option value="Spanish">Spanish</option>
            <option value="French">French</option>
            <option value="German">German</option>
            <option value="Italian">Italian</option>
            <option value="Portuguese">Portuguese</option>
            <option value="Other">Other</option>
          </select>
        </div>
      </div>
    </div>
  );
}

function RecordingStep() {
  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="heading-lg text-gray-900 mb-4">
          How Daily Recording Works
        </h2>
        <p className="body-lg text-gray-600 leading-relaxed">
          Just 5 minutes a day creates an incredibly rich digital version of yourself.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, ease: [0.4, 0, 0.2, 1] }}
          className="text-center space-y-4"
        >
          <div className="w-16 h-16 rounded-full bg-gray-900 flex items-center justify-center text-2xl text-white mx-auto">
            1
          </div>
          <h3 className="heading-sm text-gray-900">Daily Prompt</h3>
          <p className="body-md text-gray-600">
            Answer thoughtful questions about your day, memories, and wisdom.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
          className="text-center space-y-4"
        >
          <div className="w-16 h-16 rounded-full bg-gray-900 flex items-center justify-center text-2xl text-white mx-auto">
            2
          </div>
          <h3 className="heading-sm text-gray-900">AI Learning</h3>
          <p className="body-md text-gray-600">
            Advanced AI analyzes your speech patterns, personality, and wisdom.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6 }}
          className="text-center space-y-4"
        >
          <div className="w-16 h-16 rounded-full bg-gray-900 flex items-center justify-center text-2xl text-white mx-auto">
            3
          </div>
          <h3 className="heading-sm text-gray-900">Forever Available</h3>
          <p className="body-md text-gray-600">
            Your family can chat with you anytime, receiving authentic responses.
          </p>
        </motion.div>
      </div>

      <div className="glass-card">
        <h4 className="heading-sm text-gray-900 mb-4">Pro Tips for Great Recordings:</h4>
        <ul className="space-y-2 body-md text-gray-600">
          <li>• Find a quiet space where you feel comfortable</li>
          <li>• Speak naturally, as if talking to a beloved family member</li>
          <li>• Include specific names, dates, and places in your stories</li>
          <li>• Don't worry about perfection - authenticity is what matters</li>
          <li>• Your emotions and personality make your digital self unique</li>
        </ul>
      </div>
    </div>
  );
}

function CompleteStep() {
  return (
    <div className="text-center space-y-8">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        className="w-24 h-24 rounded-full mx-auto bg-gray-900 flex items-center justify-center"
      >
        <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      </motion.div>

      <h2 className="heading-lg text-gray-900 mb-4">
        Welcome to Eternal Life!
      </h2>

      <p className="body-lg text-gray-600 leading-relaxed max-w-2xl mx-auto">
        You've just taken the first step toward creating an incredible gift for your family.
        Your digital legacy will grow stronger with each passing day.
      </p>

      <div className="glass-card">
        <h3 className="heading-md text-gray-900 mb-4">Next Steps:</h3>
        <div className="grid md:grid-cols-2 gap-6 text-left">
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gray-900 rounded-full flex items-center justify-center text-white font-bold text-sm">1</div>
              <span className="body-md text-gray-700 font-medium">Complete your first daily recording</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gray-900 rounded-full flex items-center justify-center text-white font-bold text-sm">2</div>
              <span className="body-md text-gray-700 font-medium">Invite family members to connect</span>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gray-900 rounded-full flex items-center justify-center text-white font-bold text-sm">3</div>
              <span className="body-md text-gray-700 font-medium">Explore advanced features</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gray-900 rounded-full flex items-center justify-center text-white font-bold text-sm">4</div>
              <span className="body-md text-gray-700 font-medium">Set up your premium plan</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Link href="/capture">
          <button className="btn btn-primary px-8 py-3">
            Start Your First Recording
          </button>
        </Link>
        <Link href="/dashboard">
          <button className="btn btn-secondary px-8 py-3">
            Go to Dashboard
          </button>
        </Link>
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const nextStep = () => {
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentStep(currentStep + 1);
        setIsTransitioning(false);
      }, 300);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentStep(currentStep - 1);
        setIsTransitioning(false);
      }, 300);
    }
  };

  const goToStep = (stepIndex: number) => {
    if (stepIndex !== currentStep) {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentStep(stepIndex);
        setIsTransitioning(false);
      }, 300);
    }
  };

  return (
    <main className="min-h-screen bg-white">
      <div className="container mx-auto px-4 py-8 min-h-screen flex flex-col">
        {/* Progress Bar */}
        <div className="mb-12">
          <div className="flex justify-between items-center mb-6">
            <h1 className="heading-md text-gray-900">Getting Started</h1>
            <span className="caption text-gray-500">
              Step {currentStep + 1} of {ONBOARDING_STEPS.length}
            </span>
          </div>

          <div className="flex space-x-2 mb-2">
            {ONBOARDING_STEPS.map((_, index) => (
              <button
                key={index}
                onClick={() => goToStep(index)}
                className={`flex-1 h-2 rounded-full transition-all ${
                  index <= currentStep
                    ? 'bg-gray-900'
                    : 'bg-gray-200'
                }`}
              />
            ))}
          </div>

          <div className="flex justify-between text-xs text-gray-500">
            {ONBOARDING_STEPS.map((step, index) => (
              <span
                key={index}
                className={`${index <= currentStep ? 'font-medium text-gray-900' : 'text-gray-500'}`}
              >
                {step.title}
              </span>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex items-center justify-center">
          <div className="max-w-4xl w-full">
            <motion.div
              className="glass-card p-12"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: isTransitioning ? 0 : 1, y: isTransitioning ? -20 : 0 }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            >
              <div className="text-center mb-8">
                <h2 className="heading-lg text-gray-900 mb-4">
                  {ONBOARDING_STEPS[currentStep].title}
                </h2>
                <p className="body-lg text-gray-600">
                  {ONBOARDING_STEPS[currentStep].description}
                </p>
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStep}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  {ONBOARDING_STEPS[currentStep].component}
                </motion.div>
              </AnimatePresence>
            </motion.div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center mt-8">
          <button
            onClick={prevStep}
            disabled={currentStep === 0}
            className="px-6 py-3 text-gray-700 hover:text-gray-900 disabled:text-gray-400 disabled:cursor-not-allowed transition font-medium"
          >
            Back
          </button>

          <div className="flex space-x-4">
            {currentStep < ONBOARDING_STEPS.length - 1 && (
              <>
                <Link href="/dashboard">
                  <button className="btn btn-secondary">
                    Skip for now
                  </button>
                </Link>
                <button
                  onClick={nextStep}
                  className="btn btn-primary"
                >
                  Continue
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}