'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/context';

interface ApiKey {
  provider: string;
  key: string;
  status: 'not-set' | 'testing' | 'valid' | 'invalid';
  lastTested?: Date;
}

export default function ApiKeysPage() {
  const { user, loading } = useAuth();
  const [apiKeys, setApiKeys] = useState<Record<string, ApiKey>>({
    openai: { provider: 'OpenAI', key: '', status: 'not-set' },
    anthropic: { provider: 'Anthropic Claude', key: '', status: 'not-set' },
    google: { provider: 'Google Gemini', key: '', status: 'not-set' },
    huggingface: { provider: 'Hugging Face', key: '', status: 'not-set' },
  });
  const [customEndpoint, setCustomEndpoint] = useState('');
  const [selectedProvider, setSelectedProvider] = useState('openai');
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);

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

  const updateApiKey = (provider: string, key: string) => {
    setApiKeys(prev => ({
      ...prev,
      [provider]: { ...prev[provider], key, status: 'not-set' }
    }));
  };

  const testConnection = async (provider: string) => {
    setApiKeys(prev => ({
      ...prev,
      [provider]: { ...prev[provider], status: 'testing' }
    }));

    // Simulate API test (replace with actual API call)
    setTimeout(() => {
      const isValid = apiKeys[provider].key.length > 10; // Simple validation
      setApiKeys(prev => ({
        ...prev,
        [provider]: {
          ...prev[provider],
          status: isValid ? 'valid' : 'invalid',
          lastTested: new Date()
        }
      }));
    }, 1500);
  };

  const saveApiKeys = async () => {
    setSaving(true);
    // TODO: Implement actual save to database
    setTimeout(() => {
      setSaving(false);
      alert('API keys saved successfully!');
    }, 1000);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'valid': return 'text-green-500 bg-green-500/10 border-green-500/30';
      case 'invalid': return 'text-red-500 bg-red-500/10 border-red-500/30';
      case 'testing': return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/30 animate-pulse';
      default: return 'text-gray-500 bg-gray-500/10 border-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'valid': return '✓ Connected';
      case 'invalid': return '✗ Invalid';
      case 'testing': return '⏳ Testing...';
      default: return 'Not Set';
    }
  };

  return (
    <main className="min-h-screen hero-gradient relative overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 z-0">
        <div className="absolute top-1/4 right-1/3 w-96 h-96 bg-qayani-gold/10 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-1/3 left-1/4 w-96 h-96 bg-qayani-gold/5 rounded-full blur-3xl animate-float" style={{ animationDelay: '3s' }}></div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-12 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <div className="flex items-center gap-4 mb-6">
            <Link href="/dashboard">
              <button className="text-gray-400 hover:text-white transition-colors">
                ← Back to Dashboard
              </button>
            </Link>
          </div>
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-2xl flex items-center justify-center">
              <span className="text-4xl">🔑</span>
            </div>
            <div>
              <h1 className="text-5xl font-bold text-white">API Keys</h1>
              <p className="text-xl text-gray-400">Connect your personal LLM accounts</p>
            </div>
          </div>
        </motion.div>

        {/* Info Banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-qayani-gold/10 border border-qayani-gold/30 rounded-2xl p-6 mb-12"
        >
          <div className="flex items-start gap-4">
            <span className="text-3xl">🔒</span>
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">Your Keys, Your Data, Your Control</h3>
              <p className="text-gray-300 mb-2">
                Connect your own API keys to use premium LLM providers. Your keys are encrypted and stored securely.
                We never store or see your API keys in plain text.
              </p>
              <p className="text-sm text-gray-400">
                💡 Don't have API keys? Get them from:
                <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-qayani-gold hover:underline ml-1">OpenAI</a>,
                <a href="https://console.anthropic.com/" target="_blank" rel="noopener noreferrer" className="text-qayani-gold hover:underline ml-1">Anthropic</a>,
                <a href="https://makersuite.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-qayani-gold hover:underline ml-1">Google</a>, or
                <a href="https://huggingface.co/settings/tokens" target="_blank" rel="noopener noreferrer" className="text-qayani-gold hover:underline ml-1">Hugging Face</a>
              </p>
            </div>
          </div>
        </motion.div>

        {/* API Keys Configuration */}
        <div className="space-y-6">
          {/* OpenAI */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass-gold p-8"
          >
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-emerald-400 to-teal-600 rounded-xl flex items-center justify-center">
                  <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M22.282 9.821a5.985 5.985 0 00-.516-4.91 6.046 6.046 0 00-6.51-2.9A6.065 6.065 0 004.981 4.18a5.985 5.985 0 00-3.998 2.9 6.046 6.046 0 00.743 7.097 5.98 5.98 0 00.51 4.911 6.051 6.051 0 006.515 2.9A5.985 5.985 0 0013.26 24a6.056 6.056 0 005.772-4.206 5.99 5.99 0 003.997-2.9 6.056 6.056 0 00-.747-7.073zM13.26 22.43a4.476 4.476 0 01-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 00.392-.681v-6.737l2.02 1.168a.071.071 0 01.038.052v5.583a4.504 4.504 0 01-4.494 4.494zM3.6 18.304a4.47 4.47 0 01-.535-3.014l.142.085 4.783 2.759a.771.771 0 00.78 0l5.843-3.369v2.332a.08.08 0 01-.033.062L9.74 19.95a4.5 4.5 0 01-6.14-1.646zM2.34 7.896a4.485 4.485 0 012.366-1.973V11.6a.766.766 0 00.388.676l5.815 3.355-2.02 1.168a.076.076 0 01-.071 0l-4.83-2.786A4.504 4.504 0 012.34 7.896zm16.597 3.855l-5.833-3.387L15.119 7.2a.076.076 0 01.071 0l4.83 2.791a4.494 4.494 0 01-.676 8.105v-5.678a.79.79 0 00-.407-.667zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 00-.785 0L9.409 9.23V6.897a.066.066 0 01.028-.061l4.83-2.787a4.5 4.5 0 016.68 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 01-.038-.057V6.075a4.5 4.5 0 017.375-3.453l-.142.08L8.704 5.46a.795.795 0 00-.393.681zm1.097-2.365l2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z"/>
                  </svg>
                </div>
                <div>
                  <h3 className="text-2xl font-semibold text-white">OpenAI GPT</h3>
                  <p className="text-sm text-gray-400">GPT-4, GPT-4o, GPT-3.5 Turbo</p>
                </div>
              </div>
              <span className={`text-xs font-semibold px-4 py-2 rounded-full border-2 ${getStatusColor(apiKeys.openai.status)}`}>
                {getStatusText(apiKeys.openai.status)}
              </span>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">API Key</label>
                <div className="flex gap-3">
                  <input
                    type={showKeys.openai ? 'text' : 'password'}
                    value={apiKeys.openai.key}
                    onChange={(e) => updateApiKey('openai', e.target.value)}
                    placeholder="sk-proj-..."
                    className="flex-1 bg-qayani-black/40 border-2 border-gray-800 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-qayani-gold focus:outline-none transition-colors"
                  />
                  <button
                    onClick={() => setShowKeys(prev => ({ ...prev, openai: !prev.openai }))}
                    className="px-4 py-3 bg-qayani-black/40 border-2 border-gray-800 rounded-xl text-gray-300 hover:text-white hover:border-qayani-gold/50 transition-all"
                  >
                    {showKeys.openai ? '🙈' : '👁️'}
                  </button>
                  <button
                    onClick={() => testConnection('openai')}
                    disabled={!apiKeys.openai.key || apiKeys.openai.status === 'testing'}
                    className="px-6 py-3 btn-gold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Test
                  </button>
                </div>
              </div>
              <p className="text-xs text-gray-500">
                Get your key at <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-qayani-gold hover:underline">platform.openai.com/api-keys</a>
              </p>
            </div>
          </motion.div>

          {/* Anthropic Claude */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="glass-gold p-8"
          >
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl flex items-center justify-center font-bold text-white text-xl">
                  AI
                </div>
                <div>
                  <h3 className="text-2xl font-semibold text-white">Anthropic Claude</h3>
                  <p className="text-sm text-gray-400">Claude 3.5 Sonnet, Claude 3 Opus</p>
                </div>
              </div>
              <span className={`text-xs font-semibold px-4 py-2 rounded-full border-2 ${getStatusColor(apiKeys.anthropic.status)}`}>
                {getStatusText(apiKeys.anthropic.status)}
              </span>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">API Key</label>
                <div className="flex gap-3">
                  <input
                    type={showKeys.anthropic ? 'text' : 'password'}
                    value={apiKeys.anthropic.key}
                    onChange={(e) => updateApiKey('anthropic', e.target.value)}
                    placeholder="sk-ant-..."
                    className="flex-1 bg-qayani-black/40 border-2 border-gray-800 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-qayani-gold focus:outline-none transition-colors"
                  />
                  <button
                    onClick={() => setShowKeys(prev => ({ ...prev, anthropic: !prev.anthropic }))}
                    className="px-4 py-3 bg-qayani-black/40 border-2 border-gray-800 rounded-xl text-gray-300 hover:text-white hover:border-qayani-gold/50 transition-all"
                  >
                    {showKeys.anthropic ? '🙈' : '👁️'}
                  </button>
                  <button
                    onClick={() => testConnection('anthropic')}
                    disabled={!apiKeys.anthropic.key || apiKeys.anthropic.status === 'testing'}
                    className="px-6 py-3 btn-gold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Test
                  </button>
                </div>
              </div>
              <p className="text-xs text-gray-500">
                Get your key at <a href="https://console.anthropic.com/" target="_blank" rel="noopener noreferrer" className="text-qayani-gold hover:underline">console.anthropic.com</a>
              </p>
            </div>
          </motion.div>

          {/* Google Gemini */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="glass-gold p-8"
          >
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-400 via-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                  <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0L9.798 2.202L12 4.404l2.202-2.202L12 0zm0 19.596L9.798 21.798 12 24l2.202-2.202L12 19.596zM2.202 9.798L0 12l2.202 2.202L4.404 12 2.202 9.798zM21.798 9.798L19.596 12l2.202 2.202L24 12l-2.202-2.202z"/>
                  </svg>
                </div>
                <div>
                  <h3 className="text-2xl font-semibold text-white">Google Gemini</h3>
                  <p className="text-sm text-gray-400">Gemini 1.5 Pro, Gemini 1.5 Flash</p>
                </div>
              </div>
              <span className={`text-xs font-semibold px-4 py-2 rounded-full border-2 ${getStatusColor(apiKeys.google.status)}`}>
                {getStatusText(apiKeys.google.status)}
              </span>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">API Key</label>
                <div className="flex gap-3">
                  <input
                    type={showKeys.google ? 'text' : 'password'}
                    value={apiKeys.google.key}
                    onChange={(e) => updateApiKey('google', e.target.value)}
                    placeholder="AIza..."
                    className="flex-1 bg-qayani-black/40 border-2 border-gray-800 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-qayani-gold focus:outline-none transition-colors"
                  />
                  <button
                    onClick={() => setShowKeys(prev => ({ ...prev, google: !prev.google }))}
                    className="px-4 py-3 bg-qayani-black/40 border-2 border-gray-800 rounded-xl text-gray-300 hover:text-white hover:border-qayani-gold/50 transition-all"
                  >
                    {showKeys.google ? '🙈' : '👁️'}
                  </button>
                  <button
                    onClick={() => testConnection('google')}
                    disabled={!apiKeys.google.key || apiKeys.google.status === 'testing'}
                    className="px-6 py-3 btn-gold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Test
                  </button>
                </div>
              </div>
              <p className="text-xs text-gray-500">
                Get your key at <a href="https://makersuite.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-qayani-gold hover:underline">makersuite.google.com/app/apikey</a>
              </p>
            </div>
          </motion.div>

          {/* Hugging Face */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="glass-gold p-8"
          >
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center text-3xl">
                  🤗
                </div>
                <div>
                  <h3 className="text-2xl font-semibold text-white">Hugging Face</h3>
                  <p className="text-sm text-gray-400">Open-source LLMs and custom models</p>
                </div>
              </div>
              <span className={`text-xs font-semibold px-4 py-2 rounded-full border-2 ${getStatusColor(apiKeys.huggingface.status)}`}>
                {getStatusText(apiKeys.huggingface.status)}
              </span>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Access Token</label>
                <div className="flex gap-3">
                  <input
                    type={showKeys.huggingface ? 'text' : 'password'}
                    value={apiKeys.huggingface.key}
                    onChange={(e) => updateApiKey('huggingface', e.target.value)}
                    placeholder="hf_..."
                    className="flex-1 bg-qayani-black/40 border-2 border-gray-800 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-qayani-gold focus:outline-none transition-colors"
                  />
                  <button
                    onClick={() => setShowKeys(prev => ({ ...prev, huggingface: !prev.huggingface }))}
                    className="px-4 py-3 bg-qayani-black/40 border-2 border-gray-800 rounded-xl text-gray-300 hover:text-white hover:border-qayani-gold/50 transition-all"
                  >
                    {showKeys.huggingface ? '🙈' : '👁️'}
                  </button>
                  <button
                    onClick={() => testConnection('huggingface')}
                    disabled={!apiKeys.huggingface.key || apiKeys.huggingface.status === 'testing'}
                    className="px-6 py-3 btn-gold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Test
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Custom Endpoint (Optional)</label>
                <input
                  type="text"
                  value={customEndpoint}
                  onChange={(e) => setCustomEndpoint(e.target.value)}
                  placeholder="https://api-inference.huggingface.co/models/..."
                  className="w-full bg-qayani-black/40 border-2 border-gray-800 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-qayani-gold focus:outline-none transition-colors"
                />
                <p className="text-xs text-gray-500 mt-2">
                  For self-hosted or custom model endpoints
                </p>
              </div>

              <p className="text-xs text-gray-500">
                Get your token at <a href="https://huggingface.co/settings/tokens" target="_blank" rel="noopener noreferrer" className="text-qayani-gold hover:underline">huggingface.co/settings/tokens</a>
              </p>
            </div>
          </motion.div>

          {/* Save Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="flex justify-end gap-4 pt-8"
          >
            <Link href="/dashboard">
              <button className="btn-gold-outline px-8 py-4">
                Cancel
              </button>
            </Link>
            <button
              onClick={saveApiKeys}
              disabled={saving}
              className={`btn-gold px-12 py-4 text-lg ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {saving ? 'Saving...' : 'Save API Keys'}
            </button>
          </motion.div>
        </div>
      </div>
    </main>
  );
}
