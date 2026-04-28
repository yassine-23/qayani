'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useAuth } from '../../../../lib/auth/context';
import { ProtectedRoute } from '../../../../lib/auth/protected-route';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

const CATEGORIES = ['realistic', 'cartoon', 'anime', 'fantasy', 'sci-fi', 'celebrity'];

const POPULAR_TAGS = [
  'professional', 'gaming', 'business', 'casual', 'formal',
  'creative', 'sports', 'artistic', 'futuristic', 'vintage'
];

export default function SellAvatarPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'realistic' as string,
    tags: [] as string[],
    listingType: 'both' as 'sale' | 'rent' | 'both',
    salePrice: '',
    rentPriceDaily: '',
    avatarUrl: '',
    thumbnailUrl: '',
  });

  const updateField = (field: string, value: any) => {
    setFormData({ ...formData, [field]: value });
  };

  const toggleTag = (tag: string) => {
    if (formData.tags.includes(tag)) {
      updateField('tags', formData.tags.filter(t => t !== tag));
    } else {
      updateField('tags', [...formData.tags, tag]);
    }
  };

  const handleSubmit = async () => {
    if (!formData.title || !formData.avatarUrl) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/marketplace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          category: formData.category,
          tags: formData.tags,
          listingType: formData.listingType,
          salePrice: formData.salePrice ? parseFloat(formData.salePrice) : null,
          rentPriceDaily: formData.rentPriceDaily ? parseFloat(formData.rentPriceDaily) : null,
          avatarUrl: formData.avatarUrl,
          thumbnailUrl: formData.thumbnailUrl,
        }),
      });

      if (response.ok) {
        toast.success('Avatar listed successfully!');
        router.push('/dashboard/avatar/marketplace');
      } else {
        toast.error('Failed to create listing');
      }
    } catch (error) {
      toast.error('An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ProtectedRoute>
      <main className="min-h-screen relative">
        {/* Background - Qayani Style */}
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
          <div className="absolute inset-0 bg-gradient-to-b from-white/95 via-white/90 to-white/95"></div>
        </div>

        {/* Content */}
        <div className="relative z-10 max-w-3xl mx-auto px-6 py-20">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.42, 0, 0.58, 1] }}
            className="text-center mb-12"
          >
            <Link
              href="/dashboard/avatar/marketplace"
              className="inline-flex items-center caption text-gray-600 hover:text-black transition-colors mb-6"
            >
              ← Back to Marketplace
            </Link>

            <h1 className="heading-xl mb-4">
              List Your Avatar
            </h1>
            <p className="body-lg text-gray-700 max-w-xl mx-auto">
              Share your creation with the world. Simple, transparent, and rewarding.
            </p>
          </motion.div>

          {/* Progress Steps */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="mb-12"
          >
            <div className="flex items-center justify-center gap-3">
              {[1, 2, 3].map((s) => (
                <div key={s} className="flex items-center">
                  <div
                    className={`
                      w-10 h-10 rounded-full flex items-center justify-center
                      text-sm font-medium transition-all duration-300
                      ${step >= s
                        ? 'bg-black text-white'
                        : 'bg-gray-200 text-gray-500'
                      }
                    `}
                  >
                    {s}
                  </div>
                  {s < 3 && (
                    <div
                      className={`
                        w-16 h-1 mx-2 rounded-full transition-all duration-300
                        ${step > s ? 'bg-black' : 'bg-gray-200'}
                      `}
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="flex items-center justify-center gap-20 mt-3">
              {['Details', 'Pricing', 'Preview'].map((label, index) => (
                <span
                  key={label}
                  className={`caption ${step >= index + 1 ? 'text-black font-medium' : 'text-gray-500'}`}
                >
                  {label}
                </span>
              ))}
            </div>
          </motion.div>

          {/* Form */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="glass-card"
          >
            {/* Step 1: Details */}
            {step === 1 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <h2 className="heading-md mb-6">Avatar Details</h2>

                <div>
                  <label className="caption block mb-2">Avatar Title *</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => updateField('title', e.target.value)}
                    placeholder="Professional Business Avatar"
                    className="input"
                  />
                </div>

                <div>
                  <label className="caption block mb-2">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => updateField('description', e.target.value)}
                    placeholder="Describe your avatar..."
                    rows={4}
                    className="input resize-none"
                  />
                </div>

                <div>
                  <label className="caption block mb-2">Category *</label>
                  <div className="grid grid-cols-3 gap-3">
                    {CATEGORIES.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => updateField('category', cat)}
                        className={`
                          py-3 rounded-xl text-sm font-medium capitalize
                          transition-all duration-300
                          ${formData.category === cat
                            ? 'bg-black text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }
                        `}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="caption block mb-2">Tags (select up to 5)</label>
                  <div className="flex flex-wrap gap-2">
                    {POPULAR_TAGS.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleTag(tag)}
                        disabled={formData.tags.length >= 5 && !formData.tags.includes(tag)}
                        className={`
                          px-3 py-2 rounded-lg text-xs font-medium
                          transition-all duration-300
                          ${formData.tags.includes(tag)
                            ? 'bg-black text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }
                          disabled:opacity-50 disabled:cursor-not-allowed
                        `}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="caption block mb-2">Avatar URL * (Ready Player Me)</label>
                  <input
                    type="url"
                    value={formData.avatarUrl}
                    onChange={(e) => updateField('avatarUrl', e.target.value)}
                    placeholder="https://models.readyplayer.me/..."
                    className="input"
                  />
                </div>

                <div>
                  <label className="caption block mb-2">Thumbnail URL (optional)</label>
                  <input
                    type="url"
                    value={formData.thumbnailUrl}
                    onChange={(e) => updateField('thumbnailUrl', e.target.value)}
                    placeholder="https://..."
                    className="input"
                  />
                </div>

                <button
                  onClick={() => setStep(2)}
                  disabled={!formData.title || !formData.avatarUrl}
                  className="btn btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continue to Pricing
                </button>
              </motion.div>
            )}

            {/* Step 2: Pricing */}
            {step === 2 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <h2 className="heading-md mb-6">Set Your Price</h2>

                <div>
                  <label className="caption block mb-2">Listing Type</label>
                  <div className="grid grid-cols-3 gap-3">
                    {['sale', 'rent', 'both'].map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => updateField('listingType', type)}
                        className={`
                          py-3 rounded-xl text-sm font-medium capitalize
                          transition-all duration-300
                          ${formData.listingType === type
                            ? 'bg-black text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }
                        `}
                      >
                        {type === 'both' ? 'Sale & Rent' : type}
                      </button>
                    ))}
                  </div>
                </div>

                {(formData.listingType === 'sale' || formData.listingType === 'both') && (
                  <div>
                    <label className="caption block mb-2">Sale Price (USD)</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                      <input
                        type="number"
                        value={formData.salePrice}
                        onChange={(e) => updateField('salePrice', e.target.value)}
                        placeholder="49.99"
                        className="input pl-8"
                        step="0.01"
                        min="0"
                      />
                    </div>
                    {formData.salePrice && (
                      <p className="caption mt-2 text-gray-600">
                        You'll receive: ${(parseFloat(formData.salePrice) * 0.9).toFixed(2)} (90%)
                      </p>
                    )}
                  </div>
                )}

                {(formData.listingType === 'rent' || formData.listingType === 'both') && (
                  <div>
                    <label className="caption block mb-2">Daily Rental Price (USD)</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                      <input
                        type="number"
                        value={formData.rentPriceDaily}
                        onChange={(e) => updateField('rentPriceDaily', e.target.value)}
                        placeholder="4.99"
                        className="input pl-8"
                        step="0.01"
                        min="0"
                      />
                    </div>
                    {formData.rentPriceDaily && (
                      <p className="caption mt-2 text-gray-600">
                        You'll receive: ${(parseFloat(formData.rentPriceDaily) * 0.9).toFixed(2)}/day (90%)
                      </p>
                    )}
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => setStep(1)}
                    className="btn btn-secondary flex-1"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => setStep(3)}
                    disabled={
                      (formData.listingType === 'sale' && !formData.salePrice) ||
                      (formData.listingType === 'rent' && !formData.rentPriceDaily) ||
                      (formData.listingType === 'both' && (!formData.salePrice || !formData.rentPriceDaily))
                    }
                    className="btn btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Continue to Preview
                  </button>
                </div>
              </motion.div>
            )}

            {/* Step 3: Preview */}
            {step === 3 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <h2 className="heading-md mb-6">Preview Your Listing</h2>

                <div className="glass-card bg-white/50">
                  <div className="aspect-square rounded-xl overflow-hidden bg-gray-100 mb-4">
                    <img
                      src={formData.thumbnailUrl || formData.avatarUrl}
                      alt={formData.title}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <h3 className="heading-sm mb-2">{formData.title}</h3>
                  <p className="caption mb-4">{formData.description || 'No description'}</p>

                  <div className="flex gap-2 flex-wrap mb-4">
                    {formData.tags.map((tag) => (
                      <span key={tag} className="px-2 py-1 bg-gray-100 text-gray-600 rounded-md text-xs">
                        {tag}
                      </span>
                    ))}
                  </div>

                  <div className="pt-4 border-t border-gray-200">
                    {formData.salePrice && (
                      <div className="flex items-center justify-between mb-2">
                        <span className="body-md text-gray-600">Own Forever</span>
                        <span className="heading-sm">${formData.salePrice}</span>
                      </div>
                    )}
                    {formData.rentPriceDaily && (
                      <div className="flex items-center justify-between">
                        <span className="caption text-gray-500">Or rent</span>
                        <span className="caption">${formData.rentPriceDaily}/day</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="caption text-gray-600">
                    ✓ Your avatar will appear in the marketplace immediately after listing<br/>
                    ✓ You keep 90% of all sales and rentals<br/>
                    ✓ You can edit or remove your listing anytime
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setStep(2)}
                    className="btn btn-secondary flex-1"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="btn btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? 'Publishing...' : 'Publish Listing'}
                  </button>
                </div>
              </motion.div>
            )}
          </motion.div>
        </div>
      </main>
    </ProtectedRoute>
  );
}
