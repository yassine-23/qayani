'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

/* ── Step definitions ─── */
const STEPS = [
  { id: 'intelligence', label: 'Intelligence', mono: '01' },
  { id: 'memory', label: 'Memory', mono: '02' },
  { id: 'identity', label: 'Identity', mono: '03' },
  { id: 'channels', label: 'Channels', mono: '04' },
];

const PROVIDERS = [
  { id: 'openai', name: 'OpenAI', tag: 'GPT-4o', models: ['gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo'] },
  { id: 'anthropic', name: 'Anthropic', tag: 'Claude 3', models: ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'] },
  { id: 'google', name: 'Google', tag: 'Gemini', models: ['gemini-1.5-pro', 'gemini-1.5-flash'] },
  { id: 'huggingface', name: 'Hugging Face', tag: 'Open', models: ['Llama-3', 'Mistral-7B', 'Custom'] },
  { id: 'groq', name: 'Groq', tag: 'Fast', models: ['Llama-3-70b', 'Mixtral-8x7b'] },
];

const MEMORY_OPTIONS = [
  { id: 'internal', name: 'QAYANI Internal', desc: 'Encrypted vector store with semantic search. Default for all agents.' },
  { id: 'google_drive', name: 'Google Drive', desc: 'Sync documents and files from your Drive as agent context.' },
  { id: 'dropbox', name: 'Dropbox', desc: 'Connect your Dropbox workspace for document-grounded responses.' },
];

const IDENTITY_OPTIONS = [
  { id: 'photo', name: 'From Photo', desc: 'Upload a reference image. We generate a photorealistic 3D mesh.' },
  { id: 'generic', name: 'Neural Entity', desc: 'Abstract visual presence. Clean, minimal, no human likeness.' },
  { id: 'stylized', name: 'Stylized Model', desc: 'Choose from curated 3D templates. Customizable after creation.' },
];

const CHANNELS = [
  { id: 'web', name: 'Web', desc: 'Dashboard & embeddable widget' },
  { id: 'cli', name: 'CLI', desc: 'Terminal runtime via qayani run' },
  { id: 'telegram', name: 'Telegram', desc: 'Bot API integration' },
  { id: 'whatsapp', name: 'WhatsApp', desc: 'Business API bridge' },
  { id: 'discord', name: 'Discord', desc: 'Server bot deployment' },
  { id: 'slack', name: 'Slack', desc: 'Workspace app' },
];

/* ── Transition config ─── */
const pageTransition = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 },
  transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] },
};

export default function UniversalAgentCreator() {
  const [step, setStep] = useState(0);
  const [deployed, setDeployed] = useState(false);
  const [form, setForm] = useState({
    provider: 'openai',
    model: 'gpt-4o',
    apiKey: '',
    memory: 'internal',
    identity: 'generic',
    channels: ['web'] as string[],
  });

  const next = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const prev = () => setStep((s) => Math.max(s - 1, 0));
  const toggleChannel = (id: string) =>
    setForm((f) => ({
      ...f,
      channels: f.channels.includes(id)
        ? f.channels.filter((c) => c !== id)
        : [...f.channels, id],
    }));

  const deploy = () => setDeployed(true);

  if (deployed) {
    return <DeployedView form={form} />;
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-16">
      {/* ── Header ── */}
      <div className="mb-12">
        <p className="text-[12px] font-mono uppercase tracking-[0.25em] text-neon/60 mb-3">
          // agent_creator
        </p>
        <h1 className="text-4xl font-bold tracking-[-0.035em] text-white">
          Configure your agent
        </h1>
        <p className="mt-3 text-[15px] text-white/35">
          Intelligence, memory, identity, and deployment channels. Each step is independent.
        </p>
      </div>

      {/* ── Stepper ── */}
      <div className="flex items-center gap-1 mb-12 p-1.5 rounded-xl bg-white/[0.02] border border-white/[0.06]">
        {STEPS.map((s, i) => {
          const active = i === step;
          const done = i < step;
          return (
            <button
              key={s.id}
              onClick={() => setStep(i)}
              className={`flex-1 flex items-center justify-center gap-3 px-4 py-3 rounded-lg text-[13px] font-medium transition-all duration-300 ${
                active
                  ? 'bg-neon/[0.1] text-neon border border-neon/20'
                  : done
                  ? 'text-white/50 hover:text-white/70'
                  : 'text-white/25 hover:text-white/40'
              }`}
            >
              <span className={`font-mono text-[11px] tracking-wider ${active ? 'text-neon' : done ? 'text-neon/40' : 'text-white/20'}`}>
                {s.mono}
              </span>
              <span className="hidden sm:inline">{s.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── Step content ── */}
      <AnimatePresence mode="wait">
        <motion.div key={STEPS[step].id} {...pageTransition}>
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.015] p-8 sm:p-10">
            {step === 0 && <StepIntelligence form={form} setForm={setForm} onNext={next} />}
            {step === 1 && <StepMemory form={form} setForm={setForm} onNext={next} onPrev={prev} />}
            {step === 2 && <StepIdentity form={form} setForm={setForm} onNext={next} onPrev={prev} />}
            {step === 3 && (
              <StepChannels form={form} toggleChannel={toggleChannel} onPrev={prev} onDeploy={deploy} />
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/* ═══════════════════════════════════════
   STEP 1 — Intelligence
   ��══════════════════════════════════════ */
function StepIntelligence({
  form,
  setForm,
  onNext,
}: {
  form: any;
  setForm: any;
  onNext: () => void;
}) {
  const selectedProvider = PROVIDERS.find((p) => p.id === form.provider);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-white mb-2">Select provider</h2>
        <p className="text-[14px] text-white/35">
          The language model that powers your agent's reasoning and generation.
        </p>
      </div>

      {/* Provider grid */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {PROVIDERS.map((p) => {
          const active = form.provider === p.id;
          return (
            <button
              key={p.id}
              onClick={() => setForm({ ...form, provider: p.id, model: p.models[0] })}
              className={`relative rounded-lg border p-4 text-left transition-all duration-300 ${
                active
                  ? 'border-neon/30 bg-neon/[0.05] shadow-neon-sm'
                  : 'border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12]'
              }`}
            >
              <p className={`text-[14px] font-semibold ${active ? 'text-white' : 'text-white/60'}`}>
                {p.name}
              </p>
              <p className={`text-[11px] font-mono mt-1 ${active ? 'text-neon/70' : 'text-white/25'}`}>
                {p.tag}
              </p>
              {active && (
                <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-neon shadow-[0_0_8px_rgba(0,255,102,0.6)]" />
              )}
            </button>
          );
        })}
      </div>

      {/* Model + API key */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-[11px] font-mono uppercase tracking-[0.2em] text-white/30 mb-2">
            Model
          </label>
          <select
            value={form.model}
            onChange={(e) => setForm({ ...form, model: e.target.value })}
            className="w-full rounded-lg border border-white/[0.08] bg-surface-100 px-4 py-3 text-[14px] text-white/80 outline-none transition-all focus:border-neon/30 focus:shadow-[0_0_0_3px_rgba(0,255,102,0.08)]"
          >
            {selectedProvider?.models.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[11px] font-mono uppercase tracking-[0.2em] text-white/30 mb-2">
            API Key
          </label>
          <input
            type="password"
            placeholder="sk-..."
            value={form.apiKey}
            onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
            className="w-full rounded-lg border border-white/[0.08] bg-surface-100 px-4 py-3 text-[14px] text-white/80 font-mono placeholder:text-white/15 outline-none transition-all focus:border-neon/30 focus:shadow-[0_0_0_3px_rgba(0,255,102,0.08)]"
          />
        </div>
      </div>

      {/* Nav */}
      <div className="flex justify-end pt-4">
        <button
          onClick={onNext}
          className="inline-flex items-center gap-2 rounded-lg bg-neon px-6 py-3 text-[14px] font-semibold text-black transition-all hover:shadow-neon-md hover:-translate-y-0.5"
        >
          Continue
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
            <path d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
          </svg>
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════
   STEP 2 — Memory
   ═══════��═══════════════════════════════ */
function StepMemory({
  form,
  setForm,
  onNext,
  onPrev,
}: {
  form: any;
  setForm: any;
  onNext: () => void;
  onPrev: () => void;
}) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-white mb-2">Memory provider</h2>
        <p className="text-[14px] text-white/35">
          Where your agent stores and retrieves knowledge between sessions.
        </p>
      </div>

      <div className="space-y-3">
        {MEMORY_OPTIONS.map((m) => {
          const active = form.memory === m.id;
          return (
            <button
              key={m.id}
              onClick={() => setForm({ ...form, memory: m.id })}
              className={`w-full rounded-lg border p-5 text-left transition-all duration-300 ${
                active
                  ? 'border-neon/30 bg-neon/[0.05]'
                  : 'border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12]'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className={`text-[15px] font-semibold ${active ? 'text-white' : 'text-white/60'}`}>
                    {m.name}
                  </p>
                  <p className={`text-[13px] mt-1 ${active ? 'text-white/45' : 'text-white/25'}`}>
                    {m.desc}
                  </p>
                </div>
                <div className={`mt-1 w-4 h-4 rounded-full border-2 transition-all ${
                  active ? 'border-neon bg-neon shadow-[0_0_8px_rgba(0,255,102,0.5)]' : 'border-white/15'
                }`} />
              </div>
            </button>
          );
        })}
      </div>

      <NavButtons onPrev={onPrev} onNext={onNext} />
    </div>
  );
}

/* ═══════════════════════════════════════
   STEP 3 — Identity
   ════════════════════════��══════════════ */
function StepIdentity({
  form,
  setForm,
  onNext,
  onPrev,
}: {
  form: any;
  setForm: any;
  onNext: () => void;
  onPrev: () => void;
}) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-white mb-2">Visual identity</h2>
        <p className="text-[14px] text-white/35">
          How your agent appears in conversations and on the web.
        </p>
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        {IDENTITY_OPTIONS.map((opt) => {
          const active = form.identity === opt.id;
          return (
            <button
              key={opt.id}
              onClick={() => setForm({ ...form, identity: opt.id })}
              className={`group relative rounded-lg border p-5 text-left transition-all duration-300 ${
                active
                  ? 'border-neon/30 bg-neon/[0.05]'
                  : 'border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12]'
              }`}
            >
              {active && (
                <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-neon shadow-[0_0_8px_rgba(0,255,102,0.6)]" />
              )}
              <p className={`text-[15px] font-semibold mb-2 ${active ? 'text-white' : 'text-white/60'}`}>
                {opt.name}
              </p>
              <p className={`text-[13px] leading-relaxed ${active ? 'text-white/45' : 'text-white/25'}`}>
                {opt.desc}
              </p>
            </button>
          );
        })}
      </div>

      <NavButtons onPrev={onPrev} onNext={onNext} />
    </div>
  );
}

/* ══════��══════════════════════════════���═
   STEP 4 — Channels
   ═══════════════════════════════════════ */
function StepChannels({
  form,
  toggleChannel,
  onPrev,
  onDeploy,
}: {
  form: any;
  toggleChannel: (id: string) => void;
  onPrev: () => void;
  onDeploy: () => void;
}) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-white mb-2">Deployment channels</h2>
        <p className="text-[14px] text-white/35">
          Select one or more platforms where your agent will be reachable.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {CHANNELS.map((ch) => {
          const active = form.channels.includes(ch.id);
          return (
            <button
              key={ch.id}
              onClick={() => toggleChannel(ch.id)}
              className={`rounded-lg border p-4 text-left transition-all duration-300 ${
                active
                  ? 'border-neon/30 bg-neon/[0.05]'
                  : 'border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12]'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <p className={`text-[14px] font-semibold ${active ? 'text-white' : 'text-white/60'}`}>
                  {ch.name}
                </p>
                <div className={`w-3.5 h-3.5 rounded border-2 flex items-center justify-center transition-all ${
                  active ? 'border-neon bg-neon' : 'border-white/15'
                }`}>
                  {active && (
                    <svg viewBox="0 0 12 12" className="w-2 h-2 text-black">
                      <path d="M2 6l3 3 5-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
              </div>
              <p className={`text-[12px] ${active ? 'text-white/35' : 'text-white/20'}`}>{ch.desc}</p>
            </button>
          );
        })}
      </div>

      {/* Deploy nav */}
      <div className="flex items-center justify-between pt-4">
        <button
          onClick={onPrev}
          className="text-[14px] text-white/30 hover:text-white/60 transition-colors"
        >
          Back
        </button>
        <button
          onClick={onDeploy}
          disabled={form.channels.length === 0}
          className={`inline-flex items-center gap-2 rounded-lg px-8 py-3.5 text-[15px] font-semibold transition-all ${
            form.channels.length === 0
              ? 'bg-white/[0.05] text-white/20 cursor-not-allowed'
              : 'bg-neon text-black hover:shadow-neon-lg hover:-translate-y-0.5'
          }`}
        >
          Deploy Agent
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
            <path d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
          </svg>
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════
   DEPLOYED VIEW
   ═══════════════════════════════���═══════ */
function DeployedView({ form }: { form: any }) {
  const provider = PROVIDERS.find((p) => p.id === form.provider);

  return (
    <div className="max-w-3xl mx-auto px-6 py-20">
      <div className="text-center mb-12">
        {/* Success indicator */}
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', damping: 14 }}
          className="w-16 h-16 rounded-2xl bg-neon/[0.1] border border-neon/20 flex items-center justify-center mx-auto mb-8"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="#00FF66" strokeWidth={2.5} className="w-8 h-8">
            <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </motion.div>

        <h1 className="text-4xl font-bold tracking-[-0.035em] text-white mb-3">Agent deployed</h1>
        <p className="text-[16px] text-white/40">
          Your agent is live across {form.channels.length} channel{form.channels.length !== 1 ? 's' : ''}.
          Configuration can be changed anytime from the dashboard.
        </p>
      </div>

      {/* Config summary */}
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.015] divide-y divide-white/[0.06]">
        <SummaryRow label="Provider" value={`${provider?.name} / ${form.model}`} />
        <SummaryRow label="Memory" value={MEMORY_OPTIONS.find((m) => m.id === form.memory)?.name ?? form.memory} />
        <SummaryRow label="Identity" value={IDENTITY_OPTIONS.find((o) => o.id === form.identity)?.name ?? form.identity} />
        <SummaryRow
          label="Channels"
          value={form.channels.map((c: string) => CHANNELS.find((ch) => ch.id === c)?.name ?? c).join(', ')}
        />
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 mt-10 justify-center">
        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-neon px-6 py-3.5 text-[14px] font-semibold text-black transition-all hover:shadow-neon-md"
        >
          Open Dashboard
        </Link>
        <Link
          href="/eternal"
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.03] px-6 py-3.5 text-[14px] font-medium text-white/70 transition-all hover:bg-white/[0.06]"
        >
          Test Agent
        </Link>
      </div>
    </div>
  );
}

/* ── Shared components ── */
function NavButtons({ onPrev, onNext }: { onPrev: () => void; onNext: () => void }) {
  return (
    <div className="flex items-center justify-between pt-4">
      <button
        onClick={onPrev}
        className="text-[14px] text-white/30 hover:text-white/60 transition-colors"
      >
        Back
      </button>
      <button
        onClick={onNext}
        className="inline-flex items-center gap-2 rounded-lg bg-neon px-6 py-3 text-[14px] font-semibold text-black transition-all hover:shadow-neon-md hover:-translate-y-0.5"
      >
        Continue
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
          <path d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
        </svg>
      </button>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-6 py-4">
      <span className="text-[12px] font-mono uppercase tracking-[0.2em] text-white/25">{label}</span>
      <span className="text-[14px] font-medium text-white/70">{value}</span>
    </div>
  );
}
