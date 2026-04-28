'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useAuth } from '../../../../lib/auth/context';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

interface AvatarListing {
  id: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  sale_price: number | null;
  rent_price_daily: number | null;
  rent_price_monthly: number | null;
  thumbnail_url: string;
  avatar_url: string;
  rating: number;
  review_count: number;
  purchase_count: number;
  creator_name: string;
}

const CATEGORIES = [
  { id: 'all', name: 'All', icon: '✨' },
  { id: 'realistic', name: 'Realistic', icon: '👤' },
  { id: 'cartoon', name: 'Cartoon', icon: '😊' },
  { id: 'anime', name: 'Anime', icon: '🎌' },
  { id: 'fantasy', name: 'Fantasy', icon: '🧙' },
  { id: 'sci-fi', name: 'Sci-Fi', icon: '🤖' },
];

export default function AvatarMarketplacePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [avatars, setAvatars] = useState<AvatarListing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedAvatar, setSelectedAvatar] = useState<AvatarListing | null>(null);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);

  useEffect(() => {
    loadAvatars();
  }, [selectedCategory]);

  const loadAvatars = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        ...(selectedCategory !== 'all' && { category: selectedCategory }),
        sortBy: 'popular',
        limit: '20',
      });

      const response = await fetch(`/api/marketplace?${params}`);
      if (response.ok) {
        const data = await response.json();
        setAvatars(data.avatars);
      }
    } catch (error) {
      console.error('Error loading avatars:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePurchase = async (avatar: AvatarListing) => {
    if (!user) {
      toast.error('Please sign in to purchase avatars');
      router.push('/auth?redirect=/dashboard/avatar/marketplace');
      return;
    }
    setSelectedAvatar(avatar);
    setShowPurchaseModal(true);
  };

  const confirmPurchase = async () => {
    if (!selectedAvatar) return;

    try {
      const response = await fetch('/api/marketplace/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listingId: selectedAvatar.id,
          paymentIntentId: `pi_${Date.now()}`,
        }),
      });

      if (response.ok) {
        toast.success('Avatar purchased successfully!');
        setShowPurchaseModal(false);
        setSelectedAvatar(null);
      } else {
        toast.error('Purchase failed');
      }
    } catch (error) {
      toast.error('Failed to process purchase');
    }
  };

  return (
    <>
      <main className="min-h-screen relative bg-void">
        {/* Background Image with Gradient Overlay - Dark Theme */}
        <div
          className="absolute inset-0 z-0"
          style={{
            backgroundImage: 'url(/bgimage.png)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            backgroundAttachment: 'fixed'
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-void/95 via-void/90 to-void/95"></div>
        </div>

        {/* Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-6 py-20">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.42, 0, 0.58, 1] }}
            className="text-center mb-16"
          >
            <Link
              href="/dashboard"
              className="inline-flex items-center caption text-muted hover:text-cube transition-colors mb-6"
            >
              ← Back to Dashboard
            </Link>

            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.8 }}
              className="flex flex-col items-center mb-8"
            >
              <div className="w-16 h-16 rounded-2xl overflow-hidden bg-deep shadow-sm border border-white/10 mb-6">
                <img
                  src="/qayani-logo.png"
                  alt="QAYANI"
                  className="w-full h-full object-cover"
                />
              </div>
              <h1 className="heading-xl mb-4">
                Avatar Marketplace
              </h1>
              <p className="body-lg text-subtle max-w-2xl">
                Own your digital identity. Choose from premium 3D avatars crafted by talented creators.
              </p>
            </motion.div>

            {/* Action Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.8 }}
              className="flex gap-4 justify-center"
            >
              <Link href="/dashboard/avatar/create">
                <button className="btn btn-primary">
                  Create Avatar
                </button>
              </Link>
              <Link href="/dashboard/avatar/sell">
                <button className="btn btn-secondary">
                  Become a Creator
                </button>
              </Link>
            </motion.div>
          </motion.div>

          {/* Categories */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.8 }}
            className="mb-12"
          >
            <div className="flex gap-3 justify-center flex-wrap">
              {CATEGORIES.map((category, index) => (
                <motion.button
                  key={category.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 + index * 0.1, duration: 0.5 }}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`
                    px-5 py-3 rounded-full text-sm font-medium
                    transition-all duration-300
                    ${selectedCategory === category.id
                      ? 'bg-cube text-white shadow-glow-violet'
                      : 'bg-white/5 backdrop-blur-md text-subtle hover:bg-white/10 border border-white/10'
                    }
                  `}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <span className="mr-2">{category.icon}</span>
                  {category.name}
                </motion.button>
              ))}
            </div>
          </motion.div>

          {/* Avatars Grid */}
          {isLoading ? (
            <div className="flex justify-center items-center py-20">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="w-12 h-12 border-4 border-white/10 border-t-cube rounded-full"
              />
            </div>
          ) : avatars.length > 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8, duration: 0.8 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
            >
              {avatars.map((avatar, index) => (
                <motion.div
                  key={avatar.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    delay: 0.8 + index * 0.1,
                    duration: 0.6,
                    ease: [0.42, 0, 0.58, 1]
                  }}
                  className="glass-card glass-card-hover cursor-pointer group"
                  onClick={() => handlePurchase(avatar)}
                >
                  {/* Avatar Image */}
                  <div className="relative aspect-square mb-4 rounded-xl overflow-hidden bg-deep">
                    <img
                      src={avatar.thumbnail_url || 'https://models.readyplayer.me/64bfa55f0e72c63d7c3934a6.png'}
                      alt={avatar.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    {avatar.rating > 0 && (
                      <div className="absolute top-3 right-3 bg-void/80 backdrop-blur-md text-primary px-3 py-1 rounded-full text-xs font-medium">
                        ★ {avatar.rating.toFixed(1)}
                      </div>
                    )}
                  </div>

                  {/* Avatar Info */}
                  <div className="space-y-3">
                    <h3 className="heading-sm">
                      {avatar.title}
                    </h3>

                    <p className="caption line-clamp-2">
                      {avatar.description || 'Premium 3D avatar ready to use'}
                    </p>

                    {/* Tags */}
                    {avatar.tags && avatar.tags.length > 0 && (
                      <div className="flex gap-2 flex-wrap">
                        {avatar.tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-1 bg-white/5 text-muted rounded-md text-xs"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Creator */}
                    <p className="caption">
                      by <span className="font-medium text-primary">{avatar.creator_name}</span>
                    </p>

                    {/* Pricing */}
                    <div className="pt-4 border-t border-white/10">
                      {avatar.sale_price && (
                        <div className="flex items-center justify-between">
                          <span className="body-md text-muted">Own Forever</span>
                          <span className="heading-sm">${avatar.sale_price}</span>
                        </div>
                      )}
                      {avatar.rent_price_daily && (
                        <div className="flex items-center justify-between mt-2">
                          <span className="caption text-muted">Or rent</span>
                          <span className="caption">${avatar.rent_price_daily}/day</span>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-20"
            >
              <p className="body-lg text-muted mb-6">
                No avatars found in this category yet.
              </p>
              <Link href="/dashboard/avatar/sell">
                <button className="btn btn-primary">
                  Be the First Creator
                </button>
              </Link>
            </motion.div>
          )}
        </div>
      </main>

      {/* Purchase Modal */}
      <AnimatePresence>
        {showPurchaseModal && selectedAvatar && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowPurchaseModal(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-6"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.42, 0, 0.58, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="glass-card max-w-md w-full"
            >
              {/* Modal Header */}
              <div className="mb-6">
                <h2 className="heading-lg mb-2">Purchase Avatar</h2>
                <p className="caption">Complete your purchase to own this avatar forever</p>
              </div>

              {/* Avatar Preview */}
              <div className="mb-6">
                <div className="aspect-square rounded-xl overflow-hidden bg-deep mb-4">
                  <img
                    src={selectedAvatar.thumbnail_url || 'https://models.readyplayer.me/64bfa55f0e72c63d7c3934a6.png'}
                    alt={selectedAvatar.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <h3 className="heading-md mb-2">{selectedAvatar.title}</h3>
                <p className="caption mb-4">{selectedAvatar.description}</p>
              </div>

              {/* Pricing Summary */}
              <div className="bg-deep rounded-xl p-4 mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="body-md text-muted">Price</span>
                  <span className="heading-sm">${selectedAvatar.sale_price}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="caption">✓ Instant download</span>
                  <span className="caption">✓ Lifetime access</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowPurchaseModal(false)}
                  className="btn btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmPurchase}
                  className="btn btn-primary flex-1"
                >
                  Purchase Now
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
