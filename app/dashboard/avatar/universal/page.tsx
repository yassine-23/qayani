import UniversalAgentCreator from '@/components/UniversalAgentCreator';

export const metadata = {
  title: 'Agent Creator | QAYANI',
  description: 'Configure and deploy your autonomous agent.',
};

export default function UniversalAgentPage() {
  return (
    <main className="min-h-screen bg-surface">
      <UniversalAgentCreator />
    </main>
  );
}
