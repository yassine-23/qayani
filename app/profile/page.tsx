'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useAuth } from '../../lib/auth/context';
import { ProtectedRoute } from '../../lib/auth/protected-route';
import { supabase } from '../../lib/supabase/client';
import AvatarDisplay from '../../components/AvatarDisplay';

interface UserProfile {
  id?: string;
  user_id: string;
  full_name?: string;
  bio?: string;
  personality_traits: Record<string, any>;
  speech_patterns: Record<string, any>;
  preferences: Record<string, any>;
  life_story: string;
  profile_image_url?: string;
  avatar_data?: any;
  documents: ProfileDocument[];
  created_at?: string;
  updated_at?: string;
}

interface ProfileDocument {
  id: string;
  filename: string;
  file_url: string;
  file_type: string;
  description?: string;
  created_at: string;
}

export default function ProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadDescription, setUploadDescription] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const [profileForm, setProfileForm] = useState({
    full_name: '',
    bio: '',
    life_story: '',
    core_values: '',
    hobbies: '',
    achievements: '',
    family_info: '',
    career_info: '',
    life_lessons: ''
  });

  useEffect(() => {
    if (user) {
      loadUserProfile();
    }
  }, [user]);

  const loadUserProfile = async () => {
    if (!user) return;

    try {
      setIsLoading(true);

      // Load user profile
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      // Load profile documents
      const { data: documentsData, error: documentsError } = await supabase
        .from('user_documents')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (profileData) {
        const fullProfile = {
          ...profileData,
          documents: documentsData || []
        };
        setProfile(fullProfile);
        setProfileForm({
          full_name: profileData.full_name || user.user_metadata?.full_name || '',
          bio: profileData.bio || '',
          life_story: profileData.life_story || '',
          core_values: profileData.personality_traits?.core_values || '',
          hobbies: profileData.preferences?.hobbies || '',
          achievements: profileData.personality_traits?.achievements || '',
          family_info: profileData.personality_traits?.family_info || '',
          career_info: profileData.personality_traits?.career_info || '',
          life_lessons: profileData.personality_traits?.life_lessons || ''
        });
      } else {
        // Create initial profile
        const newProfile: UserProfile = {
          user_id: user.id,
          full_name: user.user_metadata?.full_name || '',
          bio: '',
          personality_traits: {},
          speech_patterns: {},
          preferences: {},
          life_story: '',
          documents: []
        };
        setProfile(newProfile);
        setProfileForm({
          full_name: user.user_metadata?.full_name || '',
          bio: '',
          life_story: '',
          core_values: '',
          hobbies: '',
          achievements: '',
          family_info: '',
          career_info: '',
          life_lessons: ''
        });
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveProfile = async () => {
    if (!user) return;

    setIsSaving(true);
    try {
      const updatedProfile = {
        user_id: user.id,
        full_name: profileForm.full_name,
        bio: profileForm.bio,
        life_story: profileForm.life_story,
        personality_traits: {
          core_values: profileForm.core_values,
          achievements: profileForm.achievements,
          family_info: profileForm.family_info,
          career_info: profileForm.career_info,
          life_lessons: profileForm.life_lessons
        },
        preferences: {
          hobbies: profileForm.hobbies
        },
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('user_profiles')
        .upsert(updatedProfile);

      if (error) throw error;

      setProfile(prev => prev ? { ...prev, ...updatedProfile } : null);
      alert('Profile saved successfully!');
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('Failed to save profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!user) return;

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      // Upload file to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('user-documents')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('user-documents')
        .getPublicUrl(fileName);

      // Save document record
      const { data: docData, error: docError } = await supabase
        .from('user_documents')
        .insert({
          user_id: user.id,
          filename: file.name,
          file_url: publicUrl,
          file_type: file.type,
          description: uploadDescription || null
        })
        .select()
        .single();

      if (docError) throw docError;

      // Update local state
      setProfile(prev => prev ? {
        ...prev,
        documents: [docData, ...prev.documents]
      } : null);

      setShowUploadModal(false);
      setUploadDescription('');
      if (fileInputRef.current) fileInputRef.current.value = '';

    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Failed to upload file. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleProfileImageUpload = async (file: File) => {
    if (!user) return;

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `avatars/${user.id}.${fileExt}`;

      // Upload image to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('user-documents')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('user-documents')
        .getPublicUrl(fileName);

      // Update profile with image URL
      const { error: profileError } = await supabase
        .from('user_profiles')
        .upsert({
          user_id: user.id,
          profile_image_url: publicUrl
        });

      if (profileError) throw profileError;

      setProfile(prev => prev ? { ...prev, profile_image_url: publicUrl } : null);

    } catch (error) {
      console.error('Error uploading profile image:', error);
      alert('Failed to upload profile image. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return '🖼️';
    if (fileType.includes('pdf')) return '📄';
    if (fileType.includes('doc')) return '📝';
    if (fileType.includes('audio')) return '🎵';
    if (fileType.includes('video')) return '🎬';
    return '📎';
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  if (isLoading) {
    return (
      <ProtectedRoute>
        <main className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading your profile...</p>
          </div>
        </main>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <main className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <Link href="/dashboard" className="text-blue-600 hover:text-blue-700 text-sm mb-2 inline-block">
                  ← Back to Dashboard
                </Link>
                <h1 className="text-3xl font-bold text-gray-900">Your Profile</h1>
                <p className="text-gray-600 mt-2">
                  Manage your digital identity and preserve your legacy
                </p>
              </div>
              <motion.button
                onClick={saveProfile}
                disabled={isSaving}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {isSaving ? 'Saving...' : 'Save Profile'}
              </motion.button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Avatar and Quick Info */}
            <div className="space-y-6">
              {/* Avatar Section */}
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Profile Avatar</h2>
                <div className="text-center">
                  <AvatarDisplay
                    imageUrl={profile?.profile_image_url}
                    name={profileForm.full_name}
                    size="large"
                    interactive={true}
                    personality={{
                      core_values: profileForm.core_values,
                      humor_style: profile?.personality_traits?.humor_style,
                      communication_style: profile?.speech_patterns?.communication_style
                    }}
                  />
                  <div className="mt-4 space-y-2">
                    <input
                      type="file"
                      ref={imageInputRef}
                      accept="image/*"
                      onChange={(e) => e.target.files?.[0] && handleProfileImageUpload(e.target.files[0])}
                      className="hidden"
                    />
                    <button
                      onClick={() => imageInputRef.current?.click()}
                      disabled={isUploading}
                      className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm"
                    >
                      {isUploading ? 'Uploading...' : 'Upload Photo'}
                    </button>
                    <p className="text-xs text-gray-500">
                      Upload a clear photo for your 3D avatar generation
                    </p>
                  </div>
                </div>
              </div>

              {/* Documents Section */}
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">Documents</h2>
                  <button
                    onClick={() => setShowUploadModal(true)}
                    className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm hover:bg-blue-700"
                  >
                    + Add
                  </button>
                </div>

                <div className="space-y-3">
                  {profile?.documents?.length ? (
                    profile.documents.map((doc) => (
                      <div key={doc.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <span className="text-lg">{getFileIcon(doc.file_type)}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{doc.filename}</p>
                          {doc.description && (
                            <p className="text-xs text-gray-500">{doc.description}</p>
                          )}
                        </div>
                        <a
                          href={doc.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-700 text-sm"
                        >
                          View
                        </a>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-sm text-center py-4">
                      No documents uploaded yet
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column - Profile Forms */}
            <div className="lg:col-span-2 space-y-6">
              {/* Basic Info */}
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                    <input
                      type="text"
                      value={profileForm.full_name}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, full_name: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Bio</label>
                    <textarea
                      value={profileForm.bio}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, bio: e.target.value }))}
                      rows={3}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Tell people about yourself in a few sentences..."
                    />
                  </div>
                </div>
              </div>

              {/* Life Story */}
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Life Story</h2>
                <textarea
                  value={profileForm.life_story}
                  onChange={(e) => setProfileForm(prev => ({ ...prev, life_story: e.target.value }))}
                  rows={6}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Share your life story, important moments, and experiences that shaped you..."
                />
              </div>

              {/* Personal Details */}
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Personal Details</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Core Values</label>
                    <textarea
                      value={profileForm.core_values}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, core_values: e.target.value }))}
                      rows={3}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="What principles guide your life?"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Hobbies & Interests</label>
                    <textarea
                      value={profileForm.hobbies}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, hobbies: e.target.value }))}
                      rows={3}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="What do you love to do in your free time?"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Achievements</label>
                    <textarea
                      value={profileForm.achievements}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, achievements: e.target.value }))}
                      rows={3}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="What are you most proud of?"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Family Information</label>
                    <textarea
                      value={profileForm.family_info}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, family_info: e.target.value }))}
                      rows={3}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Tell us about your family and relationships..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Career Information</label>
                    <textarea
                      value={profileForm.career_info}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, career_info: e.target.value }))}
                      rows={3}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="What work has been meaningful to you?"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Life Lessons</label>
                    <textarea
                      value={profileForm.life_lessons}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, life_lessons: e.target.value }))}
                      rows={3}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="What wisdom would you want to pass on?"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Upload Modal */}
        <AnimatePresence>
          {showUploadModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => setShowUploadModal(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white rounded-xl shadow-xl max-w-lg w-full"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Upload Document</h2>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Description (optional)
                      </label>
                      <input
                        type="text"
                        value={uploadDescription}
                        onChange={(e) => setUploadDescription(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="What is this document about?"
                      />
                    </div>

                    <div>
                      <input
                        type="file"
                        ref={fileInputRef}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 mt-6">
                    <button
                      onClick={() => setShowUploadModal(false)}
                      className="flex-1 border border-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => fileInputRef.current?.files?.[0] && handleFileUpload(fileInputRef.current.files[0])}
                      disabled={isUploading || !fileInputRef.current?.files?.[0]}
                      className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      {isUploading ? 'Uploading...' : 'Upload'}
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