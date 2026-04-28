'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useAuth } from '../../../lib/auth/context';
import { ProtectedRoute } from '../../../lib/auth/protected-route';
import FamilyTree, { FamilyMember } from '../../../components/FamilyTree';
import EmptyState from '../../../components/ui/EmptyState';
import toast from 'react-hot-toast';

interface FamilyStats {
  totalMembers: number;
  livingMembers: number;
  deceasedMembers: number;
  digitalTwins: number;
  byGeneration: Record<string, number>;
  byRelationship: Record<string, number>;
}

const icons = {
  back: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg>,
  add: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>,
  close: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>,
  users: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg>,
  heart: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" /></svg>,
  cpu: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5m-15 3.75H3m18 0h-1.5M8.25 19.5V21M12 3v1.5m0 15V21m3.75-18v1.5m0 15V21m-9-1.5h10.5a2.25 2.25 0 002.25-2.25V6.75a2.25 2.25 0 00-2.25-2.25H6.75A2.25 2.25 0 004.5 6.75v10.5a2.25 2.25 0 002.25 2.25zm.75-12h9v9h-9v-9z" /></svg>,
  layers: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M6.429 9.75L2.25 12l4.179 2.25m0-4.5l5.571 3 5.571-3m-11.142 0L2.25 7.5 12 2.25l9.75 5.25-4.179 2.25m0 0L12 12.75 6.43 9.75m11.14 0l4.179 2.25L12 17.25 2.25 12l4.179-2.25m11.142 0l4.179 2.25L12 22.5l-9.75-5.25 4.179-2.25" /></svg>,
};

export default function FamilyPage() {
  const { user } = useAuth();
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [stats, setStats] = useState<FamilyStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    if (user) {
      loadFamilyTree();
    }
  }, [user]);

  const loadFamilyTree = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/family');
      if (response.ok) {
        const data = await response.json();
        setMembers(
          data.members.map((m: any) => ({
            id: m.id,
            name: m.name,
            dateOfBirth: m.date_of_birth,
            dateOfPassing: m.date_of_passing,
            relationshipToCreator: m.relationship_to_creator,
            generation: m.generation,
            isDigitalTwin: m.has_digital_twin,
            avatarUrl: m.avatar_url,
            personalityId: m.personality_id,
          }))
        );
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error loading family tree:', error);
      toast.error('Failed to load family tree');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMemberClick = (member: FamilyMember) => {
    setSelectedMember(member);
  };

  return (
    <ProtectedRoute>
      <main className="min-h-screen bg-void">
        <div className="max-w-6xl mx-auto px-6 py-16">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-10"
          >
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 text-[12px] font-mono uppercase tracking-[0.2em] text-white/25 hover:text-cube/60 transition-colors mb-5"
            >
              {icons.back} Dashboard
            </Link>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[12px] font-mono uppercase tracking-[0.25em] text-cube/60 mb-3">
                  // family
                </p>
                <h1 className="text-3xl font-bold tracking-[-0.035em] text-white">
                  Family Tree
                </h1>
                <p className="mt-2 text-[14px] text-white/30">
                  Your multi-generational digital twin network
                </p>
              </div>
              <motion.button
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center gap-2 rounded-lg bg-cube/[0.1] border border-cube/15 px-5 py-2.5 text-[13px] font-semibold text-cube/80 hover:bg-cube/[0.15] transition-all"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {icons.add} Add Member
              </motion.button>
            </div>
          </motion.div>

          {/* Stats */}
          {stats && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-10"
            >
              {[
                { label: 'Total Members', value: stats.totalMembers, icon: icons.users },
                { label: 'Living', value: stats.livingMembers, icon: icons.heart },
                { label: 'Digital Twins', value: stats.digitalTwins, icon: icons.cpu },
                { label: 'Generations', value: Object.keys(stats.byGeneration || {}).length, icon: icons.layers },
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
          )}

          {/* Family Tree Visualization or Empty State */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-xl border border-white/[0.06] bg-white/[0.015] overflow-hidden"
          >
            {isLoading ? (
              <div className="h-[500px] flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-cube/20 border-t-cube rounded-full animate-spin" />
              </div>
            ) : members.length === 0 ? (
              <EmptyState
                variant="family"
                title="Start building your family tree"
                description="Add family members to create a multi-generational network. Each member can have their own digital twin that preserves their unique personality and stories."
                hint="family connections enable shared memories and cross-generational conversations"
                actions={[
                  { label: 'Add First Member', onClick: () => setShowAddModal(true) },
                ]}
              />
            ) : (
              <div className="h-[500px]">
                <FamilyTree
                  members={members}
                  onMemberClick={handleMemberClick}
                  creatorId={user?.id || ''}
                />
              </div>
            )}
          </motion.div>

          {/* Legend */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-4 rounded-xl border border-white/[0.06] bg-white/[0.015] px-6 py-4"
          >
            <div className="flex flex-wrap gap-6 text-[12px]">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-cube/50" />
                <span className="text-white/30">Living Member</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-white/15" />
                <span className="text-white/30">Deceased</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded border border-cube/40 bg-cube/[0.08]" />
                <span className="text-white/30">Digital Twin Active</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-px bg-white/10" />
                <span className="text-white/30">Connection</span>
              </div>
            </div>
          </motion.div>
        </div>
      </main>

      {/* Member Details Modal */}
      <AnimatePresence>
        {selectedMember && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedMember(null)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="rounded-2xl border border-white/[0.08] bg-surface-100 shadow-2xl max-w-md w-full p-8"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-white">{selectedMember.name}</h2>
                <button
                  onClick={() => setSelectedMember(null)}
                  className="p-2 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/[0.05] transition-all"
                >
                  {icons.close}
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-[11px] font-mono uppercase tracking-[0.15em] text-white/25">Relationship</label>
                  <p className="text-[14px] text-white/70 mt-1">{selectedMember.relationshipToCreator}</p>
                </div>

                {selectedMember.dateOfBirth && (
                  <div>
                    <label className="text-[11px] font-mono uppercase tracking-[0.15em] text-white/25">Date of Birth</label>
                    <p className="text-[14px] text-white/70 mt-1">
                      {new Date(selectedMember.dateOfBirth).toLocaleDateString()}
                    </p>
                  </div>
                )}

                {selectedMember.dateOfPassing && (
                  <div>
                    <label className="text-[11px] font-mono uppercase tracking-[0.15em] text-white/25">Date of Passing</label>
                    <p className="text-[14px] text-white/70 mt-1">
                      {new Date(selectedMember.dateOfPassing).toLocaleDateString()}
                    </p>
                  </div>
                )}

                <div>
                  <label className="text-[11px] font-mono uppercase tracking-[0.15em] text-white/25">Generation</label>
                  <p className="text-[14px] text-white/70 mt-1">
                    {selectedMember.generation === 0
                      ? 'You'
                      : selectedMember.generation > 0
                      ? `+${selectedMember.generation} (Children)`
                      : `${selectedMember.generation} (Parents/Ancestors)`}
                  </p>
                </div>

                {selectedMember.isDigitalTwin && (
                  <div className="rounded-lg border border-cube/15 bg-cube/[0.04] p-4 mt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="text-cube/60">{icons.cpu}</div>
                      <span className="text-[13px] font-semibold text-cube/70">Digital Twin Active</span>
                    </div>
                    <p className="text-[12px] text-white/30 mb-3">
                      This family member has an active digital twin that can be interacted with.
                    </p>
                    {selectedMember.personalityId && (
                      <Link
                        href={`/dashboard/chat?personality=${selectedMember.personalityId}`}
                        className="block text-center rounded-lg bg-cube/[0.1] border border-cube/20 px-4 py-2 text-[12px] font-semibold text-cube/80 hover:bg-cube/[0.15] transition-all"
                      >
                        Talk to Digital Twin
                      </Link>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </ProtectedRoute>
  );
}
