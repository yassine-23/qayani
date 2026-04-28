import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import Navigation from '../components/Navigation';
import { AuthProvider } from '../lib/auth/context';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  title: {
    default: 'QAYANI | Digital Twin Platform for AI Agents',
    template: '%s | QAYANI',
  },
  description:
    'Build digital twins, design AI agent workflows visually, export agent packages, and deploy from GUI to CLI across macOS, Linux, and Windows.',
  keywords: [
    'digital twin platform',
    'AI agent builder',
    'visual workflow builder',
    'agent deployment platform',
    'multi agent orchestration',
    'cross platform CLI',
    'AI digital twin',
    'GUI to CLI deployment',
  ],
  category: 'technology',
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon-16x16.png',
    apple: '/apple-touch-icon.png',
    other: [
      {
        rel: 'icon',
        type: 'image/png',
        sizes: '32x32',
        url: '/favicon-32x32.png',
      },
      {
        rel: 'icon',
        type: 'image/png',
        sizes: '16x16',
        url: '/favicon-16x16.png',
      },
      {
        rel: 'manifest',
        url: '/site.webmanifest',
      },
    ],
  },
  openGraph: {
    title: 'QAYANI | Digital Twin Platform for AI Agents',
    description:
      'Create digital twins, visualize workflows, export deployable agent packages, and run them through a cross-platform CLI.',
    images: ['/qayani-logo.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'QAYANI | Digital Twin Platform for AI Agents',
    description:
      'A browser-first digital twin and agent platform with workflow visualization and cross-platform CLI deployment.',
    images: ['/qayani-logo.png'],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="bg-void text-primary antialiased">
        <AuthProvider>
          <Navigation />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
