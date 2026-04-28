'use client';

import React, { useState, Suspense, lazy } from 'react';
import { motion } from 'framer-motion';

// Avatar3D temporarily disabled for production build
// const Avatar3D = lazy(() => import('./Avatar3D'));

interface AvatarDisplayProps {
  imageUrl?: string;
  name?: string;
  size?: 'small' | 'medium' | 'large';
  showInitials?: boolean;
  interactive?: boolean;
  personality?: {
    core_values?: string;
    humor_style?: string;
    communication_style?: string;
  };
}

export default function AvatarDisplay({
  imageUrl,
  name = 'User',
  size = 'medium',
  showInitials = true,
  interactive = false,
  personality
}: AvatarDisplayProps) {
  const [imageError, setImageError] = useState(false);
  const [is3DMode, setIs3DMode] = useState(false);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'small': return 'w-10 h-10 text-sm';
      case 'large': return 'w-32 h-32 text-4xl';
      default: return 'w-16 h-16 text-xl';
    }
  };

  const showImage = imageUrl && !imageError;
  const initials = getInitials(name);

  // 3D mode temporarily disabled for production build compatibility
  // if (is3DMode && personality) {
  //   const avatarSize = size === 'large' ? 320 : size === 'medium' ? 160 : 80;
  //   return (
  //     <div className="relative">
  //       <Suspense fallback={<div className={`${getSizeClasses()} rounded-lg bg-gray-100 flex items-center justify-center`}><div className="animate-spin text-2xl">🔄</div></div>}>
  //         <Avatar3D imageUrl={imageUrl} name={name} personality={personality} size={avatarSize} interactive={interactive} />
  //       </Suspense>
  //       {interactive && (<motion.button className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full text-xs shadow-lg" whileHover={{ scale: 1.1 }} onClick={() => setIs3DMode(false)}>2D</motion.button>)}
  //     </div>
  //   );
  // }

  return (
    <div className="relative">
      <motion.div
        className={`
          rounded-full overflow-hidden border-2 border-gray-200 bg-gradient-to-br from-blue-400 to-purple-500
          flex items-center justify-center text-white font-semibold shadow-lg
          ${getSizeClasses()}
          ${interactive ? 'cursor-pointer hover:shadow-xl transition-all duration-200' : ''}
        `}
        whileHover={interactive ? { scale: 1.05 } : {}}
        whileTap={interactive ? { scale: 0.95 } : {}}
        onClick={interactive ? () => setIs3DMode(!is3DMode) : undefined}
      >
        {showImage ? (
          <img
            src={imageUrl}
            alt={`${name}'s avatar`}
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
          />
        ) : showInitials ? (
          <span>{initials}</span>
        ) : (
          <div className="text-gray-400">
            <svg className="w-1/2 h-1/2" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
            </svg>
          </div>
        )}
      </motion.div>

      {/* 3D Mode Indicator */}
      {interactive && (
        <motion.div
          className={`
            absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-2 border-white shadow-md
            flex items-center justify-center text-xs
            ${is3DMode ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'}
          `}
          whileHover={{ scale: 1.1 }}
          onClick={(e) => {
            e.stopPropagation();
            setIs3DMode(!is3DMode);
          }}
        >
          {is3DMode ? '3D' : '2D'}
        </motion.div>
      )}

      {/* Status Indicator */}
      {size === 'large' && (
        <div className="mt-4 text-center">
          <h3 className="font-semibold text-gray-900">{name}</h3>
          <div className="flex items-center justify-center gap-2 mt-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-sm text-gray-600">Profile Active</span>
          </div>

          {interactive && (
            <motion.button
              className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIs3DMode(!is3DMode)}
            >
              {is3DMode ? 'View 2D Avatar' : 'Generate 3D Avatar'}
            </motion.button>
          )}
        </div>
      )}

      {/* 3D Avatar Preview (Placeholder for now) */}
      {is3DMode && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          className="absolute inset-0 bg-gray-900 bg-opacity-90 rounded-full flex items-center justify-center"
        >
          <div className="text-center text-white">
            <div className="animate-spin text-2xl mb-2">🔄</div>
            <div className="text-xs">3D Avatar</div>
            <div className="text-xs opacity-75">Coming Soon</div>
          </div>
        </motion.div>
      )}
    </div>
  );
}