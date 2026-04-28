'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useAuth } from '../../../lib/auth/context';
import { ProtectedRoute } from '../../../lib/auth/protected-route';
import { supabase } from '../../../lib/supabase/client';

interface UserProfile {
  personality_traits: Record<string, any>;
  speech_patterns: Record<string, any>;
  preferences: Record<string, any>;
  life_story: string;
  learning_phase: 'initial' | 'learning' | 'trained';
}

export default function SettingsPage() {
  const { user, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [profile, setProfile] = useState<UserProfile>({
    personality_traits: {},
    speech_patterns: {},
    preferences: {},
    life_story: '',
    learning_phase: 'initial'
  });

  const [profileForm, setProfileForm] = useState({
    full_name: user?.user_metadata?.full_name || '',
    email: user?.email || ''
  });

  const [personalityForm, setPersonalityForm] = useState({
    life_story: '',
    core_values: '',
    communication_style: '',
    humor_style: '',
    decision_making: '',
    relationships: '',
    life_philosophy: '',
    important_beliefs: ''
  });

  const tabs = [
    { id: 'profile', name: 'Profile', icon: '👤' },
    { id: 'personality', name: 'Digital Self', icon: '🧠' },
    { id: 'privacy', name: 'Privacy', icon: '🔒' },
    { id: 'account', name: 'Account', icon: '⚙️' }
  ];

  useEffect(() => {
    if (user) {
      loadUserProfile();
    }
  }, [user]);

  const loadUserProfile = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (data) {
        setProfile(data);
        setPersonalityForm({
          life_story: data.life_story || '',
          core_values: data.personality_traits?.core_values || '',
          communication_style: data.speech_patterns?.communication_style || '',
          humor_style: data.personality_traits?.humor_style || '',
          decision_making: data.personality_traits?.decision_making || '',
          relationships: data.personality_traits?.relationships || '',
          life_philosophy: data.personality_traits?.life_philosophy || '',
          important_beliefs: data.personality_traits?.important_beliefs || ''
        });
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const savePersonalityData = async () => {
    if (!user) return;

    setIsSaving(true);
    try {
      const updatedProfile = {
        user_id: user.id,
        personality_traits: {
          core_values: personalityForm.core_values,
          humor_style: personalityForm.humor_style,
          decision_making: personalityForm.decision_making,
          relationships: personalityForm.relationships,
          life_philosophy: personalityForm.life_philosophy,
          important_beliefs: personalityForm.important_beliefs
        },
        speech_patterns: {
          communication_style: personalityForm.communication_style
        },
        life_story: personalityForm.life_story,
        learning_phase: personalityForm.life_story || personalityForm.core_values ? 'learning' : 'initial'
      };

      const { error } = await supabase
        .from('user_profiles')
        .upsert(updatedProfile);

      if (error) throw error;

      setProfile(prev => ({
        ...prev,
        ...updatedProfile
      }));

      alert('Personality data saved successfully!');
    } catch (error) {
      console.error('Error saving personality data:', error);
      alert('Failed to save personality data. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
  };

  const renderProfileTab = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-subtle mb-2">
          Full Name
        </label>
        <input
          type="text"
          value={profileForm.full_name}
          onChange={(e) => setProfileForm(prev => ({ ...prev, full_name: e.target.value }))}
          className="w-full border border-white/10 bg-lifted rounded-lg px-4 py-2 text-primary focus:outline-none focus:ring-2 focus:ring-cube"
          placeholder="Enter your full name"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-subtle mb-2">
          Email Address
        </label>
        <input
          type="email"
          value={profileForm.email}
          disabled
          className="w-full border border-white/10 bg-deep rounded-lg px-4 py-2 text-muted"
        />
        <p className="text-xs text-muted mt-1">Email cannot be changed</p>
      </div>

      <div className="flex gap-3">
        <button
          className="bg-cube text-white px-6 py-2 rounded-lg hover:bg-cube/80 transition-colors"
        >
          Save Changes
        </button>
      </div>
    </div>
  );

  const renderPersonalityTab = () => (
    <div className="space-y-6">
      <div className="bg-cube/10 border border-cube/20 rounded-lg p-4 mb-6">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-2xl">✨</span>
          <h3 className="font-semibold text-primary">Train Your Digital Self</h3>
        </div>
        <p className="text-subtle text-sm">
          The more information you provide, the more authentic and meaningful your digital self becomes for your loved ones.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-subtle mb-2">
          Life Story *
        </label>
        <textarea
          value={personalityForm.life_story}
          onChange={(e) => setPersonalityForm(prev => ({ ...prev, life_story: e.target.value }))}
          rows={6}
          className="w-full border border-white/10 bg-lifted rounded-lg px-4 py-2 text-primary focus:outline-none focus:ring-2 focus:ring-cube"
          placeholder="Tell your life story... Where were you born? What shaped you? What are your most important experiences and achievements?"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-subtle mb-2">
            Core Values & Beliefs
          </label>
          <textarea
            value={personalityForm.core_values}
            onChange={(e) => setPersonalityForm(prev => ({ ...prev, core_values: e.target.value }))}
            rows={4}
            className="w-full border border-white/10 bg-lifted rounded-lg px-4 py-2 text-primary focus:outline-none focus:ring-2 focus:ring-cube"
            placeholder="What principles guide your life? What do you believe in most strongly?"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-subtle mb-2">
            Communication Style
          </label>
          <textarea
            value={personalityForm.communication_style}
            onChange={(e) => setPersonalityForm(prev => ({ ...prev, communication_style: e.target.value }))}
            rows={4}
            className="w-full border border-white/10 bg-lifted rounded-lg px-4 py-2 text-primary focus:outline-none focus:ring-2 focus:ring-cube"
            placeholder="How do you typically communicate? Are you direct, gentle, humorous, formal, casual?"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-subtle mb-2">
            Sense of Humor
          </label>
          <textarea
            value={personalityForm.humor_style}
            onChange={(e) => setPersonalityForm(prev => ({ ...prev, humor_style: e.target.value }))}
            rows={3}
            className="w-full border border-white/10 bg-lifted rounded-lg px-4 py-2 text-primary focus:outline-none focus:ring-2 focus:ring-cube"
            placeholder="What makes you laugh? Do you use sarcasm, puns, storytelling, or gentle teasing?"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-subtle mb-2">
            Decision Making Style
          </label>
          <textarea
            value={personalityForm.decision_making}
            onChange={(e) => setPersonalityForm(prev => ({ ...prev, decision_making: e.target.value }))}
            rows={3}
            className="w-full border border-white/10 bg-lifted rounded-lg px-4 py-2 text-primary focus:outline-none focus:ring-2 focus:ring-cube"
            placeholder="How do you make important decisions? Do you analyze carefully, trust your gut, consult others?"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-subtle mb-2">
            Relationships & Family
          </label>
          <textarea
            value={personalityForm.relationships}
            onChange={(e) => setPersonalityForm(prev => ({ ...prev, relationships: e.target.value }))}
            rows={3}
            className="w-full border border-white/10 bg-lifted rounded-lg px-4 py-2 text-primary focus:outline-none focus:ring-2 focus:ring-cube"
            placeholder="How do you show love? What's important to you in relationships with family and friends?"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-subtle mb-2">
            Life Philosophy
          </label>
          <textarea
            value={personalityForm.life_philosophy}
            onChange={(e) => setPersonalityForm(prev => ({ ...prev, life_philosophy: e.target.value }))}
            rows={3}
            className="w-full border border-white/10 bg-lifted rounded-lg px-4 py-2 text-primary focus:outline-none focus:ring-2 focus:ring-cube"
            placeholder="What's your philosophy on life? What wisdom would you want to pass on?"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-subtle mb-2">
          Most Important Beliefs
        </label>
        <textarea
          value={personalityForm.important_beliefs}
          onChange={(e) => setPersonalityForm(prev => ({ ...prev, important_beliefs: e.target.value }))}
          rows={4}
          className="w-full border border-white/10 bg-lifted rounded-lg px-4 py-2 text-primary focus:outline-none focus:ring-2 focus:ring-cube"
          placeholder="What beliefs, values, or life lessons are most important for your loved ones to remember about you?"
        />
      </div>

      <div className="flex gap-3 pt-4">
        <button
          onClick={savePersonalityData}
          disabled={isSaving}
          className="bg-cube text-white px-6 py-2 rounded-lg hover:bg-cube/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSaving ? 'Saving...' : 'Save Digital Self Data'}
        </button>
      </div>
    </div>
  );

  const renderPrivacyTab = () => (
    <div className="space-y-6">
      <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
        <h3 className="font-semibold text-green-400 mb-2">🔒 Your Data is Secure</h3>
        <p className="text-green-400/80 text-sm">
          All your personal data is encrypted and stored securely. Only you and those you explicitly invite can access your digital self.
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 border border-white/10 rounded-lg">
          <div>
            <h4 className="font-medium text-primary">Data Encryption</h4>
            <p className="text-sm text-muted">All personal data is encrypted at rest and in transit</p>
          </div>
          <div className="text-green-400">
            ✓ Enabled
          </div>
        </div>

        <div className="flex items-center justify-between p-4 border border-white/10 rounded-lg">
          <div>
            <h4 className="font-medium text-primary">Family Access Control</h4>
            <p className="text-sm text-muted">You control who can interact with your digital self</p>
          </div>
          <div className="text-green-400">
            ✓ Enabled
          </div>
        </div>

        <div className="flex items-center justify-between p-4 border border-white/10 rounded-lg">
          <div>
            <h4 className="font-medium text-primary">Data Portability</h4>
            <p className="text-sm text-muted">Export your data at any time</p>
          </div>
          <button className="text-cube hover:text-cube/80 text-sm">
            Export Data
          </button>
        </div>
      </div>
    </div>
  );

  const renderAccountTab = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-primary mb-4">Account Information</h3>
        <div className="bg-deep rounded-lg p-4 space-y-2">
          <div className="flex justify-between">
            <span className="text-muted">Account Created:</span>
            <span className="text-primary">
              {user ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">Email:</span>
            <span className="text-primary">{user?.email}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">Subscription:</span>
            <span className="text-primary">Free Plan</span>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10 pt-6">
        <h3 className="text-lg font-medium text-red-400 mb-4">Danger Zone</h3>

        <div className="space-y-4">
          <button
            onClick={handleSignOut}
            className="w-full border border-red-500/30 text-red-400 py-2 px-4 rounded-lg hover:bg-red-500/10 transition-colors"
          >
            Sign Out
          </button>

          <button
            className="w-full bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors"
            onClick={() => alert('Account deletion is not yet implemented. Please contact support.')}
          >
            Delete Account
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <ProtectedRoute>
      <main className="min-h-screen bg-void">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <Link href="/dashboard" className="text-cube hover:text-cube/80 text-sm mb-2 inline-block">
              ← Back to Dashboard
            </Link>
            <h1 className="text-3xl font-bold text-primary">Settings</h1>
            <p className="text-muted mt-2">
              Manage your account and configure your digital self
            </p>
          </div>

          <div className="bg-deep rounded-lg shadow-sm border border-white/10 overflow-hidden">
            {/* Tab Navigation */}
            <div className="border-b border-white/10">
              <nav className="flex space-x-8 px-6">
                {tabs.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === tab.id
                        ? 'border-cube text-cube'
                        : 'border-transparent text-muted hover:text-subtle hover:border-white/20'
                    }`}
                  >
                    <span className="mr-2">{tab.icon}</span>
                    {tab.name}
                  </button>
                ))}
              </nav>
            </div>

            {/* Tab Content */}
            <div className="p-6">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cube mx-auto mb-4"></div>
                    <p className="text-muted">Loading settings...</p>
                  </div>
                </div>
              ) : (
                <>
                  {activeTab === 'profile' && renderProfileTab()}
                  {activeTab === 'personality' && renderPersonalityTab()}
                  {activeTab === 'privacy' && renderPrivacyTab()}
                  {activeTab === 'account' && renderAccountTab()}
                </>
              )}
            </div>
          </div>
        </div>
      </main>
    </ProtectedRoute>
  );
}
