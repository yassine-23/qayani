'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../../lib/auth/context';
import { supabase } from '../../../../lib/supabase/client';
import StepWrapper from '../../../../components/onboarding/StepWrapper';

interface PersonalityQuestion {
  id: string;
  question: string;
  placeholder: string;
  category: string;
}

const PERSONALITY_QUESTIONS: PersonalityQuestion[] = [
  {
    id: 'values',
    question: 'What are your core values?',
    placeholder: 'e.g., Family, honesty, perseverance, kindness, learning...',
    category: 'Values'
  },
  {
    id: 'beliefs',
    question: 'What do you believe about life and the world?',
    placeholder: 'e.g., People are inherently good, hard work pays off, everything happens for a reason...',
    category: 'Beliefs'
  },
  {
    id: 'personality',
    question: 'How would you describe your personality?',
    placeholder: 'e.g., Optimistic, analytical, compassionate, adventurous, introverted...',
    category: 'Traits'
  },
  {
    id: 'wisdom',
    question: 'What\'s the most important lesson life has taught you?',
    placeholder: 'Share your wisdom that you want passed down...',
    category: 'Wisdom'
  },
];

export default function PersonalitySetupPage() {
  const router = useRouter();
  const { user, loading, session } = useAuth();

  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [personalityId, setPersonalityId] = useState<string | null>(null);

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

  const handleAnswer = (answer: string) => {
    const question = PERSONALITY_QUESTIONS[currentQuestion];
    setAnswers(prev => ({
      ...prev,
      [question.id]: answer
    }));
  };

  const handleNext = () => {
    if (currentQuestion < PERSONALITY_QUESTIONS.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const handleComplete = async () => {
    if (!user || !session) return;

    setIsSaving(true);

    try {
      // Create personality profile
      const { data: personality, error } = await supabase
        .from('personalities')
        .upsert({
          user_id: user.id,
          name: user.user_metadata?.full_name || 'My Digital Self',
          relationship_to_creator: 'Self',
          core_values: answers.values,
          beliefs: answers.beliefs,
          personality_traits: answers.personality,
          life_lessons: answers.wisdom,
          is_active: true,
        }, {
          onConflict: 'user_id'
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      setPersonalityId(personality.id);
      console.log('Personality created:', personality);
    } catch (error) {
      console.error('Error saving personality:', error);
      alert('Failed to save personality. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleContinue = () => {
    router.push('/onboarding/steps/complete');
  };

  const currentQ = PERSONALITY_QUESTIONS[currentQuestion];
  const currentAnswer = answers[currentQ?.id] || '';
  const isLastQuestion = currentQuestion === PERSONALITY_QUESTIONS.length - 1;

  return (
    <StepWrapper
      currentStep={4}
      totalSteps={5}
      onBack={() => router.push('/onboarding/steps/voice')}
    >
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-block mb-6">
            <motion.div
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="text-6xl"
            >
              🧠
            </motion.div>
          </div>

          <h1 className="heading-xl mb-4">
            Define Your Essence
          </h1>

          <p className="body-lg text-gray-600 max-w-2xl mx-auto">
            Help your digital self think like you by sharing what makes you uniquely you.
            These answers will guide how your AI responds to your loved ones.
          </p>
        </motion.div>

        {/* Main Content */}
        <AnimatePresence mode="wait">
          {!personalityId ? (
            <motion.div
              key="questions"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              {/* Progress */}
              <div className="mb-8">
                <div className="flex justify-between text-sm text-gray-600 mb-2">
                  <span>Question {currentQuestion + 1} of {PERSONALITY_QUESTIONS.length}</span>
                  <span>{Math.round(((currentQuestion + 1) / PERSONALITY_QUESTIONS.length) * 100)}% Complete</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <motion.div
                    className="h-2 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600"
                    initial={{ width: 0 }}
                    animate={{ width: `${((currentQuestion + 1) / PERSONALITY_QUESTIONS.length) * 100}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              </div>

              {/* Question Card */}
              <motion.div
                key={currentQuestion}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                className="glass-card p-12"
              >
                {/* Category Badge */}
                <div className="inline-block px-4 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm font-medium mb-6">
                  {currentQ.category}
                </div>

                {/* Question */}
                <h2 className="text-3xl font-semibold text-gray-900 mb-8">
                  {currentQ.question}
                </h2>

                {/* Text Area */}
                <textarea
                  value={currentAnswer}
                  onChange={(e) => handleAnswer(e.target.value)}
                  placeholder={currentQ.placeholder}
                  className="w-full h-48 p-6 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none resize-none text-gray-800 placeholder-gray-400"
                  autoFocus
                />

                {/* Navigation */}
                <div className="flex items-center justify-between mt-8">
                  <button
                    onClick={handleBack}
                    disabled={currentQuestion === 0}
                    className="text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Previous
                  </button>

                  <button
                    onClick={handleNext}
                    disabled={!currentAnswer.trim() || isSaving}
                    className="btn btn-primary"
                  >
                    {isSaving ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Saving...
                      </div>
                    ) : isLastQuestion ? (
                      'Complete Setup →'
                    ) : (
                      'Next Question →'
                    )}
                  </button>
                </div>

                {/* Tip */}
                <div className="mt-6 p-4 bg-indigo-50 rounded-lg">
                  <p className="text-sm text-indigo-900">
                    <span className="font-semibold">💡 Tip:</span> Be authentic and specific. The more detailed your answers,
                    the more accurately your digital self will reflect your true essence.
                  </p>
                </div>
              </motion.div>

              {/* Quick Review */}
              {Object.keys(answers).length > 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-8 glass-card p-6"
                >
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Answers So Far:</h3>
                  <div className="space-y-3">
                    {PERSONALITY_QUESTIONS.slice(0, currentQuestion + 1).map((q, index) => (
                      answers[q.id] && (
                        <div key={q.id} className="p-3 bg-white rounded-lg">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="w-2 h-2 rounded-full bg-green-500" />
                            <span className="text-sm font-medium text-gray-700">{q.category}</span>
                          </div>
                          <p className="text-sm text-gray-600 line-clamp-2">{answers[q.id]}</p>
                        </div>
                      )
                    ))}
                  </div>
                </motion.div>
              )}
            </motion.div>
          ) : (
            /* Success State */
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
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
                Your Personality is Defined!
              </h2>

              <p className="text-gray-600 mb-8 max-w-md mx-auto">
                Wonderful! Your digital self now understands your values, beliefs, and unique perspective.
              </p>

              <div className="grid md:grid-cols-2 gap-4 mb-8 max-w-xl mx-auto">
                {Object.entries(answers).map(([key, value]) => {
                  const question = PERSONALITY_QUESTIONS.find(q => q.id === key);
                  return (
                    <div key={key} className="p-4 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg text-left">
                      <div className="text-xs font-semibold text-indigo-600 uppercase mb-1">
                        {question?.category}
                      </div>
                      <p className="text-sm text-gray-700 line-clamp-3">{value}</p>
                    </div>
                  );
                })}
              </div>

              <button
                onClick={handleContinue}
                className="btn btn-primary px-12 py-4 text-lg"
              >
                See the Magic Happen →
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </StepWrapper>
  );
}
