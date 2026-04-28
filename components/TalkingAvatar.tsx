'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface TalkingAvatarProps {
  audioUrl?: string | null;
  avatarUrl?: string;
  isSpeaking?: boolean;
  onAudioEnd?: () => void;
  size?: 'small' | 'medium' | 'large';
  name?: string;
}

export default function TalkingAvatar(props: TalkingAvatarProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  
  useEffect(() => {
    if (props.audioUrl && audioRef.current) {
      audioRef.current.src = props.audioUrl;
      audioRef.current.play().catch(console.error);
    }
  }, [props.audioUrl]);
  
  const speaking = isPlaying || props.isSpeaking;
  
  return (
    <div className="flex flex-col items-center">
      <audio ref={audioRef} onPlay={() => setIsPlaying(true)} onEnded={() => { setIsPlaying(false); props.onAudioEnd?.(); }} style={{ display: 'none' }} />
      <motion.div className="w-64 h-64 rounded-full bg-gradient-to-br from-purple-400 to-indigo-500 shadow-xl" animate={{ scale: speaking ? 1.05 : 1 }}>
        {props.avatarUrl ? <img src={props.avatarUrl} alt="Avatar" className="w-full h-full object-cover rounded-full" /> : <div className="w-full h-full flex items-center justify-center text-white text-6xl">👤</div>}
      </motion.div>
    </div>
  );
}
