'use client';

import React, { useState, useRef, useEffect } from 'react';
import UniversalAvatar from '@/components/3d/UniversalAvatar';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

interface Message {
    role: 'user' | 'ai';
    content: string;
}

export default function AvatarPage() {
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [showSettings, setShowSettings] = useState(false);

    // Configuration State
    const [config, setConfig] = useState({
        openaiKey: '',
        anthropicKey: '',
        geminiKey: '',
        elevenLabsKey: '',
        voiceId: '',
        avatarName: 'GHOST_UNIT_01'
    });

    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMessage = input;
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
        setIsLoading(true);

        try {
            // Mock response
            setTimeout(() => {
                setMessages(prev => [...prev, { role: 'ai', content: "I am ready to receive your instructions. My neural pathways are open." }]);
                setIsSpeaking(true);
                setTimeout(() => setIsSpeaking(false), 3000);
                setIsLoading(false);
            }, 1000);

        } catch (error) {
            console.error('Failed to send message:', error);
            setMessages(prev => [...prev, { role: 'ai', content: "Communication interference detected." }]);
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <main className="min-h-screen bg-[#030305] text-white overflow-hidden relative font-sans selection:bg-cyan-500/30">

            {/* Ambient Background Effects */}
            <div className="absolute inset-0 z-0 pointer-events-none">
                <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-900/20 rounded-full blur-[120px] mix-blend-screen animate-pulse-slow"></div>
                <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-cyan-900/10 rounded-full blur-[120px] mix-blend-screen animate-pulse-slow delay-1000"></div>
                <div className="absolute inset-0 opacity-[0.03]"
                    style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.65\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E")' }}
                />
            </div>

            {/* Header / Status Bar */}
            <header className="absolute top-0 left-0 right-0 z-50 p-8 flex justify-between items-start pointer-events-none">
                <Link href="/" className="pointer-events-auto group flex flex-col gap-1">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center shadow-[0_0_20px_rgba(0,200,255,0.3)] group-hover:shadow-[0_0_30px_rgba(0,200,255,0.5)] transition-all duration-500">
                            <span className="font-bold text-white text-lg">Q</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xl font-bold tracking-widest text-white group-hover:text-cyan-200 transition-colors">QAYANI</span>
                            <span className="text-[10px] font-mono text-cyan-500/80 tracking-[0.3em] uppercase">Neural Nexus</span>
                        </div>
                    </div>
                </Link>

                <button
                    onClick={() => setShowSettings(true)}
                    className="pointer-events-auto group flex items-center gap-3 px-5 py-2.5 bg-white/5 backdrop-blur-md border border-white/10 rounded-full hover:bg-white/10 hover:border-cyan-500/30 transition-all duration-300"
                >
                    <div className="flex flex-col items-end">
                        <span className="text-[10px] font-mono text-cyan-400 tracking-widest group-hover:text-cyan-300">SYSTEM STATUS</span>
                        <span className="text-xs font-bold text-white group-hover:text-cyan-100">CONNECTED</span>
                    </div>
                    <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_10px_#00ff00] animate-pulse"></div>
                </button>
            </header>

            <div className="relative z-10 flex h-screen pt-28 pb-8 px-8 gap-8 max-w-[1800px] mx-auto">

                {/* Left Panel: Holographic Chamber (Avatar) */}
                <div className="flex-[1.5] relative flex flex-col group">
                    {/* Frame Decoration */}
                    <div className="absolute -inset-[1px] bg-gradient-to-b from-cyan-500/20 via-transparent to-blue-500/20 rounded-[2rem] opacity-50 group-hover:opacity-100 transition-opacity duration-700"></div>

                    <div className="flex-1 rounded-[2rem] overflow-hidden bg-[#050508]/80 backdrop-blur-sm border border-white/5 relative shadow-2xl">

                        {/* Corner Accents */}
                        <div className="absolute top-6 left-6 w-16 h-16 border-t border-l border-cyan-500/30 rounded-tl-2xl"></div>
                        <div className="absolute top-6 right-6 w-16 h-16 border-t border-r border-cyan-500/30 rounded-tr-2xl"></div>
                        <div className="absolute bottom-6 left-6 w-16 h-16 border-b border-l border-blue-500/30 rounded-bl-2xl"></div>
                        <div className="absolute bottom-6 right-6 w-16 h-16 border-b border-r border-blue-500/30 rounded-br-2xl"></div>

                        {/* Motto */}
                        <div className="absolute top-12 left-0 right-0 text-center z-10 pointer-events-none mix-blend-overlay">
                            <h2 className="text-4xl font-thin tracking-[0.2em] text-white/20">UPLOAD YOUR MIND</h2>
                        </div>

                        {/* 3D Scene */}
                        <div className="w-full h-full opacity-80 group-hover:opacity-100 transition-opacity duration-700">
                            <UniversalAvatar
                                audioUrl={audioUrl}
                                isSpeaking={isSpeaking}
                                onAudioEnd={() => setIsSpeaking(false)}
                                primaryColor="#00f0ff"
                                secondaryColor="#2d5af5"
                            />
                        </div>

                        {/* HUD Data */}
                        <div className="absolute bottom-10 left-10 font-mono text-xs space-y-2 text-cyan-500/60 pointer-events-none">
                            <div className="flex items-center gap-3">
                                <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full"></span>
                                <span>ENTITY_ID: {config.avatarName}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className={`w-1.5 h-1.5 rounded-full ${isSpeaking ? 'bg-green-500 animate-ping' : 'bg-blue-500'}`}></span>
                                <span>VOICE_MODULE: {isSpeaking ? 'ACTIVE' : 'STANDBY'}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Panel: Data Stream (Chat) */}
                <div className="flex-1 flex flex-col relative max-w-xl">
                    <div className="absolute -inset-[1px] bg-gradient-to-b from-white/10 to-transparent rounded-[2rem] opacity-30 pointer-events-none"></div>

                    <div className="flex-1 flex flex-col bg-[#080810]/60 backdrop-blur-xl rounded-[2rem] border border-white/5 overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)]">

                        {/* Chat Header */}
                        <div className="p-6 border-b border-white/5 bg-white/2 flex justify-between items-center">
                            <span className="text-xs font-mono text-white/40 tracking-widest">NEURAL LINK V2.0</span>
                            <div className="flex gap-1">
                                <div className="w-1 h-1 rounded-full bg-white/20"></div>
                                <div className="w-1 h-1 rounded-full bg-white/20"></div>
                                <div className="w-1 h-1 rounded-full bg-white/20"></div>
                            </div>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                            {messages.length === 0 && (
                                <div className="h-full flex flex-col items-center justify-center text-white/20 space-y-6">
                                    <div className="w-20 h-20 rounded-full border border-white/10 flex items-center justify-center relative">
                                        <div className="absolute inset-0 border border-t-white/30 rounded-full animate-spin duration-[3s]"></div>
                                        <svg className="w-8 h-8 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                    </div>
                                    <p className="text-center font-light tracking-wide text-sm">
                                        AWAITING INPUT<br />
                                        <span className="text-xs opacity-50 mt-2 block font-mono">INITIALIZE NEURAL BRIDGE</span>
                                    </p>
                                </div>
                            )}

                            <AnimatePresence>
                                {messages.map((msg, idx) => (
                                    <motion.div
                                        key={idx}
                                        initial={{ opacity: 0, x: msg.role === 'user' ? 20 : -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                    >
                                        <div className={`max-w-[85%] p-5 rounded-2xl backdrop-blur-md border ${msg.role === 'user'
                                            ? 'bg-blue-600/20 border-blue-500/30 text-blue-50 rounded-tr-sm'
                                            : 'bg-white/5 border-white/10 text-gray-300 rounded-tl-sm'
                                            }`}>
                                            <p className="text-sm leading-relaxed font-light">{msg.content}</p>
                                        </div>
                                    </motion.div>
                                ))}
                                {isLoading && (
                                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                                        <div className="bg-white/5 border border-white/10 p-4 rounded-2xl rounded-tl-sm flex gap-2 items-center">
                                            <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce"></span>
                                            <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce delay-100"></span>
                                            <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce delay-200"></span>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        <div className="p-6 bg-gradient-to-t from-black/40 to-transparent">
                            <div className="relative group">
                                <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl opacity-20 group-hover:opacity-40 transition duration-500 blur"></div>
                                <div className="relative flex items-center bg-[#0a0a12] rounded-xl border border-white/10 overflow-hidden">
                                    <input
                                        type="text"
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        placeholder="Transmit data..."
                                        className="w-full bg-transparent px-6 py-4 text-white placeholder-white/20 focus:outline-none font-light tracking-wide"
                                    />
                                    <button
                                        onClick={handleSend}
                                        disabled={!input.trim() || isLoading}
                                        className="px-6 py-4 text-cyan-500 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Slide-out Connectivity Hub */}
            <AnimatePresence>
                {showSettings && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowSettings(false)}
                            className="absolute inset-0 z-[60] bg-black/60 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: "spring", damping: 30, stiffness: 300 }}
                            className="absolute top-0 right-0 bottom-0 z-[70] w-full max-w-md bg-[#050508]/95 backdrop-blur-xl border-l border-white/10 shadow-[-50px_0_100px_rgba(0,0,0,0.5)] flex flex-col"
                        >
                            <div className="p-8 border-b border-white/5 flex justify-between items-center bg-gradient-to-r from-transparent to-white/5">
                                <div>
                                    <h3 className="text-xl font-light tracking-[0.1em] text-white">CONNECTIVITY</h3>
                                    <p className="text-[10px] font-mono text-cyan-500 mt-1">SECURE PROTOCOL ESTABLISHED</p>
                                </div>
                                <button onClick={() => setShowSettings(false)} className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors text-white/50 hover:text-white">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-8 space-y-10">
                                <section className="space-y-4">
                                    <h4 className="text-xs font-mono text-white/40 tracking-widest uppercase border-b border-white/5 pb-2">Intelligence Core</h4>
                                    <div className="space-y-5">
                                        {[
                                            { label: 'OPENAI', key: 'openaiKey', placeholder: 'sk-...' },
                                            { label: 'ANTHROPIC', key: 'anthropicKey', placeholder: 'sk-ant-...' },
                                            { label: 'GEMINI', key: 'geminiKey', placeholder: 'AIza...' },
                                            { label: 'ELEVENLABS', key: 'elevenLabsKey', placeholder: 'xi-...' },
                                        ].map((field) => (
                                            <div key={field.key} className="space-y-2 group">
                                                <label className="text-[10px] font-bold text-cyan-500/70 tracking-widest group-hover:text-cyan-400 transition-colors">{field.label}</label>
                                                <input
                                                    type="password"
                                                    value={(config as any)[field.key]}
                                                    onChange={(e) => setConfig({ ...config, [field.key]: e.target.value })}
                                                    placeholder={field.placeholder}
                                                    className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-cyan-500/50 focus:bg-white/5 transition-all font-mono text-xs tracking-wider"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </section>

                                <section className="space-y-4">
                                    <h4 className="text-xs font-mono text-white/40 tracking-widest uppercase border-b border-white/5 pb-2">Memory Banks</h4>
                                    <div className="border border-dashed border-white/10 rounded-xl p-8 flex flex-col items-center justify-center gap-4 hover:border-cyan-500/30 hover:bg-cyan-900/5 transition-all cursor-pointer group">
                                        <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform">
                                            <svg className="w-5 h-5 text-cyan-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-white/80 text-sm font-light">Upload Neural Data</p>
                                            <p className="text-[10px] text-white/30 mt-1 font-mono">PDF • TXT • JSON</p>
                                        </div>
                                    </div>
                                </section>
                            </div>

                            <div className="p-8 border-t border-white/5 bg-black/20">
                                <button
                                    onClick={() => setShowSettings(false)}
                                    className="w-full py-4 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-bold tracking-widest text-xs transition-all shadow-[0_0_20px_rgba(0,200,255,0.2)] hover:shadow-[0_0_30px_rgba(0,200,255,0.4)]"
                                >
                                    SAVE CONFIGURATION
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </main>
    );
}
