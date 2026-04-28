'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useAuth } from '../../../lib/auth/context';
import { ProtectedRoute } from '../../../lib/auth/protected-route';
import { supabase } from '../../../lib/supabase/client';
import EmptyState from '../../../components/ui/EmptyState';

interface Memory {
  id: string;
  title: string;
  content: string;
  memory_type: 'general' | 'voice_recording' | 'photo' | 'journal' | 'important_moment';
  source_file_url?: string;
  emotion_tags: string[];
  importance_score: number;
  date_mentioned?: string;
  created_at: string;
}

const icons = {
  back: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg>,
  add: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>,
  close: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>,
  thought: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.76c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076c1.14 0 2.274-.04 3.396-.121C18.627 16.71 19.75 15.33 19.75 13.73V7.27c0-1.6-1.123-2.994-2.707-3.227A48.394 48.394 0 0012 3.75c-1.764 0-3.498.105-5.043.293C5.373 4.276 4.25 5.67 4.25 7.27v5.49z" /></svg>,
  mic: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" /></svg>,
  camera: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.04l-.821 1.315z" /><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" /></svg>,
  pen: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" /></svg>,
  star: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" /></svg>,
};

const memoryTypes = [
  { value: 'general', label: 'General', icon: icons.thought },
  { value: 'voice_recording', label: 'Voice', icon: icons.mic },
  { value: 'photo', label: 'Photo', icon: icons.camera },
  { value: 'journal', label: 'Journal', icon: icons.pen },
  { value: 'important_moment', label: 'Important', icon: icons.star },
];

const emotionTags = [
  'joy', 'love', 'nostalgia', 'pride', 'gratitude',
  'hope', 'excitement', 'peace', 'wonder', 'wisdom'
];

export default function MemoriesPage() {
  const { user } = useAuth();
  const [memories, setMemories] = useState<Memory[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [newMemory, setNewMemory] = useState({
    title: '',
    content: '',
    memory_type: 'general' as const,
    importance_score: 5,
    date_mentioned: '',
    emotion_tags: [] as string[]
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAddMemory = async () => {
    if (!user || !newMemory.title.trim() || !newMemory.content.trim()) return;

    setIsUploading(true);
    try {
      const { data, error } = await supabase
        .from('user_memories')
        .insert({
          user_id: user.id,
          title: newMemory.title,
          content: newMemory.content,
          memory_type: newMemory.memory_type,
          importance_score: newMemory.importance_score,
          date_mentioned: newMemory.date_mentioned || null,
          emotion_tags: newMemory.emotion_tags
        } as any)
        .select()
        .single();

      if (error) throw error;

      setMemories(prev => [data, ...prev]);
      setShowUploadModal(false);
      setNewMemory({
        title: '',
        content: '',
        memory_type: 'general',
        importance_score: 5,
        date_mentioned: '',
        emotion_tags: []
      });
    } catch (error) {
      console.error('Error adding memory:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const toggleEmotionTag = (tag: string) => {
    setNewMemory(prev => ({
      ...prev,
      emotion_tags: prev.emotion_tags.includes(tag)
        ? prev.emotion_tags.filter(t => t !== tag)
        : [...prev.emotion_tags, tag]
    }));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getTypeIcon = (type: string) => {
    return memoryTypes.find(t => t.value === type)?.icon || icons.thought;
  };

  return (
    <ProtectedRoute>
      <main className="min-h-screen bg-surface">
        <div className="max-w-6xl mx-auto px-6 py-16">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-10"
          >
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 text-[12px] font-mono uppercase tracking-[0.2em] text-white/25 hover:text-neon/60 transition-colors mb-5"
            >
              {icons.back} Dashboard
            </Link>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[12px] font-mono uppercase tracking-[0.25em] text-neon/60 mb-3">
                  // memories
                </p>
                <h1 className="text-3xl font-bold tracking-[-0.035em] text-white">
                  Your Memories
                </h1>
                <p className="mt-2 text-[14px] text-white/30">
                  Stories, moments, and wisdom that shape your digital legacy
                </p>
              </div>
              <motion.button
                onClick={() => setShowUploadModal(true)}
                className="inline-flex items-center gap-2 rounded-lg bg-neon/[0.1] border border-neon/15 px-5 py-2.5 text-[13px] font-semibold text-neon/80 hover:bg-neon/[0.15] transition-all"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {icons.add} Add Memory
              </motion.button>
            </div>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-3 gap-3 mb-10"
          >
            {[
              { label: 'Total Memories', value: memories.length, icon: icons.thought },
              { label: 'Voice Recordings', value: memories.filter(m => m.memory_type === 'voice_recording').length, icon: icons.mic },
              { label: 'Important Moments', value: memories.filter(m => m.importance_score >= 8).length, icon: icons.star },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-xl border border-white/[0.06] bg-white/[0.015] p-5"
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className="text-white/20">{s.icon}</div>
                  <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-white/20">{s.label}</span>
                </div>
                <p className="text-2xl font-semibold text-white/80">{s.value}</p>
              </div>
            ))}
          </motion.div>

          {/* Memories Grid or Empty State */}
          {memories.length > 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3"
            >
              <AnimatePresence>
                {memories.map((memory, index) => (
                  <motion.div
                    key={memory.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ delay: index * 0.05 }}
                    className="group rounded-xl border border-white/[0.06] bg-white/[0.015] p-6 hover:border-white/[0.12] hover:bg-white/[0.03] transition-all"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/[0.03] border border-white/[0.06] text-white/40">
                          {getTypeIcon(memory.memory_type)}
                        </div>
                        <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-white/20">
                          {memoryTypes.find(t => t.value === memory.memory_type)?.label}
                        </span>
                      </div>
                      <div className="flex gap-0.5">
                        {Array.from({ length: 5 }, (_, i) => (
                          <div
                            key={i}
                            className={`w-1.5 h-1.5 rounded-full ${
                              i < Math.ceil(memory.importance_score / 2)
                                ? 'bg-neon/40'
                                : 'bg-white/[0.06]'
                            }`}
                          />
                        ))}
                      </div>
                    </div>

                    <h3 className="text-[15px] font-semibold text-white/80 mb-2">{memory.title}</h3>
                    <p className="text-[13px] text-white/30 line-clamp-3 leading-relaxed mb-4">{memory.content}</p>

                    {memory.emotion_tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {memory.emotion_tags.map(tag => (
                          <span
                            key={tag}
                            className="px-2 py-0.5 rounded-md bg-neon/[0.06] border border-neon/[0.08] text-[10px] font-mono text-neon/50"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    <p className="text-[11px] font-mono text-white/15">
                      {formatDate(memory.created_at)}
                    </p>
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          ) : (
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.015]">
              <EmptyState
                variant="memories"
                title="No memories yet"
                description="Your digital legacy starts with a single memory. Share a story, a lesson learned, or a moment that matters to you."
                hint="memories are the foundation of your digital twin's personality"
                actions={[
                  { label: 'Add Your First Memory', onClick: () => setShowUploadModal(true) },
                  { label: 'Record a Story', href: '/capture', primary: false },
                ]}
              />
            </div>
          )}
        </div>

        {/* Upload Modal */}
        <AnimatePresence>
          {showUploadModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => setShowUploadModal(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="rounded-2xl border border-white/[0.08] bg-surface-100 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-8">
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <p className="text-[11px] font-mono uppercase tracking-[0.2em] text-neon/50 mb-1">new entry</p>
                      <h2 className="text-xl font-semibold text-white">Add Memory</h2>
                    </div>
                    <button
                      onClick={() => setShowUploadModal(false)}
                      className="p-2 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/[0.05] transition-all"
                    >
                      {icons.close}
                    </button>
                  </div>

                  <div className="space-y-6">
                    {/* Title */}
                    <div>
                      <label className="block text-[12px] font-mono uppercase tracking-[0.15em] text-white/30 mb-2">
                        Title
                      </label>
                      <input
                        type="text"
                        value={newMemory.title}
                        onChange={(e) => setNewMemory(prev => ({ ...prev, title: e.target.value }))}
                        className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-[14px] text-white placeholder-white/20 focus:outline-none focus:border-neon/30 focus:bg-neon/[0.02] transition-all"
                        placeholder="Give your memory a meaningful title..."
                      />
                    </div>

                    {/* Memory Type */}
                    <div>
                      <label className="block text-[12px] font-mono uppercase tracking-[0.15em] text-white/30 mb-2">
                        Type
                      </label>
                      <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
                        {memoryTypes.map(type => (
                          <button
                            key={type.value}
                            onClick={() => setNewMemory(prev => ({ ...prev, memory_type: type.value as typeof prev.memory_type }))}
                            className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-[12px] font-medium transition-all ${
                              newMemory.memory_type === type.value
                                ? 'border-neon/25 bg-neon/[0.06] text-neon/80'
                                : 'border-white/[0.06] bg-white/[0.02] text-white/35 hover:bg-white/[0.04]'
                            }`}
                          >
                            {type.icon}
                            {type.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Content */}
                    <div>
                      <label className="block text-[12px] font-mono uppercase tracking-[0.15em] text-white/30 mb-2">
                        Content
                      </label>
                      <textarea
                        value={newMemory.content}
                        onChange={(e) => setNewMemory(prev => ({ ...prev, content: e.target.value }))}
                        rows={5}
                        className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-[14px] text-white placeholder-white/20 focus:outline-none focus:border-neon/30 focus:bg-neon/[0.02] transition-all resize-none"
                        placeholder="Share your memory, story, or thoughts..."
                      />
                    </div>

                    {/* Importance */}
                    <div>
                      <label className="block text-[12px] font-mono uppercase tracking-[0.15em] text-white/30 mb-2">
                        Importance: {newMemory.importance_score}/10
                      </label>
                      <input
                        type="range"
                        min="1"
                        max="10"
                        value={newMemory.importance_score}
                        onChange={(e) => setNewMemory(prev => ({ ...prev, importance_score: parseInt(e.target.value) }))}
                        className="w-full accent-neon"
                      />
                      <div className="flex justify-between text-[10px] font-mono text-white/15 mt-1">
                        <span>casual</span>
                        <span>life-defining</span>
                      </div>
                    </div>

                    {/* Date */}
                    <div>
                      <label className="block text-[12px] font-mono uppercase tracking-[0.15em] text-white/30 mb-2">
                        When did this happen?
                      </label>
                      <input
                        type="date"
                        value={newMemory.date_mentioned}
                        onChange={(e) => setNewMemory(prev => ({ ...prev, date_mentioned: e.target.value }))}
                        className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-[14px] text-white/60 focus:outline-none focus:border-neon/30 transition-all"
                      />
                    </div>

                    {/* Emotion Tags */}
                    <div>
                      <label className="block text-[12px] font-mono uppercase tracking-[0.15em] text-white/30 mb-2">
                        Emotions
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {emotionTags.map(emotion => (
                          <button
                            key={emotion}
                            onClick={() => toggleEmotionTag(emotion)}
                            className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all ${
                              newMemory.emotion_tags.includes(emotion)
                                ? 'bg-neon/[0.12] border border-neon/20 text-neon/80'
                                : 'bg-white/[0.03] border border-white/[0.06] text-white/30 hover:bg-white/[0.06]'
                            }`}
                          >
                            {emotion}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 mt-8 pt-6 border-t border-white/[0.06]">
                    <button
                      onClick={() => setShowUploadModal(false)}
                      className="flex-1 rounded-lg border border-white/[0.08] bg-white/[0.03] py-2.5 text-[13px] font-medium text-white/40 hover:bg-white/[0.06] transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddMemory}
                      disabled={isUploading || !newMemory.title.trim() || !newMemory.content.trim()}
                      className="flex-1 rounded-lg bg-neon/[0.12] border border-neon/20 py-2.5 text-[13px] font-semibold text-neon hover:bg-neon/[0.18] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    >
                      {isUploading ? 'Saving...' : 'Save Memory'}
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </ProtectedRoute>
  );
}
