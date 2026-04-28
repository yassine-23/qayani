import type { Metadata } from 'next';
import dynamic from 'next/dynamic';

const ViralLanding = dynamic(() => import('@/components/landing/ViralLanding'), { ssr: false });

export const metadata: Metadata = {
  title: 'QAYANI — Your Voice. Your Wisdom. Forever.',
  description:
    'Build an AI digital twin that speaks like you, thinks like you, and preserves your legacy forever. Voice cloning, 3D avatars, agentic workflows, and family connections.',
  alternates: {
    canonical: '/',
  },
  keywords: [
    'digital twin',
    'AI avatar',
    'voice cloning',
    'digital legacy',
    'AI agent builder',
    'family preservation',
    'agentic workflows',
    'platonic solid agents',
  ],
  openGraph: {
    title: 'QAYANI — Your Voice. Your Wisdom. Forever.',
    description:
      'Create an AI digital twin with your personality, voice, and memories. Your family talks to you forever.',
    url: '/',
    type: 'website',
    images: ['/qayani-logo.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'QAYANI — Your Voice. Your Wisdom. Forever.',
    description:
      'Build an AI that speaks like you and preserves your legacy for the people you love.',
    images: ['/qayani-logo.png'],
  },
};

export default function Home() {
  return <ViralLanding />;
}
