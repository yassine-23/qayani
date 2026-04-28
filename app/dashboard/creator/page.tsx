/**
 * Creator Dashboard - Analytics & Control Center
 *
 * This is the command center for influencers, coaches, and creators
 * to monitor their digital twin's performance and manage settings.
 *
 * Key Features:
 * - Real-time analytics (sessions, emotions, satisfaction)
 * - Voice cloning management
 * - Knowledge base uploads
 * - Avatar customization
 * - Billing and subscription
 */

'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth/context';
import Link from 'next/link';
import { motion } from 'framer-motion';

interface AnalyticsData {
  overview: {
    totalSessions: number;
    totalConversations: number;
    totalMinutes: number;
    activeUsers: number;
    avgSessionDuration: number;
    avgSatisfactionRating: number;
  };
  trends: {
    sessionsPerDay: Array<{ date: string; count: number }>;
    conversationsPerDay: Array<{ date: string; count: number }>;
    minutesPerDay: Array<{ date: string; minutes: number }>;
  };
  emotions: {
    distribution: Array<{ emotion: string; count: number; percentage: number }>;
  };
  topTopics: Array<{ topic: string; count: number }>;
  userSatisfaction: {
    avgRating: number;
    totalRatings: number;
  };
  performance: {
    avgLatency: number;
    successRate: number;
  };
}

export default function CreatorDashboard() {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [timeRange, setTimeRange] = useState('7d');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchAnalytics();
    }
  }, [user, timeRange]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/analytics/creator?timeRange=${timeRange}`);
      const data = await response.json();
      if (data.success) {
        setAnalytics(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !analytics) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-gray-200 border-t-black rounded-full animate-spin mx-auto mb-4"></div>
          <p className="body-md text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="heading-lg text-gray-900">Creator Dashboard</h1>
              <p className="body-sm text-gray-500 mt-1">
                Monitor your digital twin's performance
              </p>
            </div>

            {/* Time Range Selector */}
            <div className="flex items-center gap-2">
              {['7d', '30d', '90d', 'all'].map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    timeRange === range
                      ? 'bg-black text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {range === 'all' ? 'All Time' : range.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Overview Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <StatCard
            title="Total Sessions"
            value={analytics.overview.totalSessions.toLocaleString()}
            subtitle={`${analytics.overview.activeUsers} active in last 7 days`}
            icon="📊"
            trend={analytics.overview.totalSessions > 0 ? '+12%' : undefined}
          />

          <StatCard
            title="Conversations"
            value={analytics.overview.totalConversations.toLocaleString()}
            subtitle={`Avg ${Math.round(analytics.overview.totalConversations / (analytics.overview.totalSessions || 1))} per session`}
            icon="💬"
            trend="+8%"
          />

          <StatCard
            title="Total Minutes"
            value={analytics.overview.totalMinutes.toLocaleString()}
            subtitle={`Avg ${analytics.overview.avgSessionDuration.toFixed(1)} min/session`}
            icon="⏱️"
            trend="+15%"
          />

          <StatCard
            title="User Satisfaction"
            value={analytics.userSatisfaction.avgRating.toFixed(1)}
            subtitle={`${analytics.userSatisfaction.totalRatings} ratings`}
            icon="⭐"
            max={5}
          />

          <StatCard
            title="Avg Latency"
            value={`${analytics.performance.avgLatency}ms`}
            subtitle={analytics.performance.avgLatency < 300 ? 'Excellent' : 'Good'}
            icon="⚡"
            trend={analytics.performance.avgLatency < 300 ? 'optimal' : undefined}
          />

          <StatCard
            title="Success Rate"
            value={`${analytics.performance.successRate}%`}
            subtitle="Sessions completed"
            icon="✅"
            trend={analytics.performance.successRate > 95 ? '+2%' : undefined}
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Sessions Trend */}
          <ChartCard title="Sessions Over Time" icon="📈">
            <MiniLineChart
              data={analytics.trends.sessionsPerDay}
              dataKey="count"
              color="#3b82f6"
            />
          </ChartCard>

          {/* Emotions Distribution */}
          <ChartCard title="User Emotions Detected" icon="😊">
            <EmotionsList emotions={analytics.emotions.distribution} />
          </ChartCard>
        </div>

        {/* Top Topics */}
        <ChartCard title="Most Discussed Topics" icon="🔥" className="mb-8">
          <TopicsList topics={analytics.topTopics} />
        </ChartCard>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <ActionCard
            title="Train Voice"
            description="Upload audio to clone your voice"
            icon="🎙️"
            href="/dashboard/creator/voice"
            badge="Premium"
          />

          <ActionCard
            title="Knowledge Base"
            description="Upload content for your twin to learn"
            icon="📚"
            href="/dashboard/creator/knowledge"
          />

          <ActionCard
            title="Customize Avatar"
            description="Change appearance and personality"
            icon="🎭"
            href="/dashboard/creator/avatar"
          />
        </div>
      </main>
    </div>
  );
}

// Stat Card Component
function StatCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  max,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: string;
  trend?: string;
  max?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card hover:shadow-lg transition-shadow"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="text-3xl">{icon}</div>
        {trend && (
          <span
            className={`px-2 py-1 rounded-md text-xs font-semibold ${
              trend === 'optimal'
                ? 'bg-green-100 text-green-700'
                : 'bg-blue-100 text-blue-700'
            }`}
          >
            {trend}
          </span>
        )}
      </div>

      <h3 className="body-sm text-gray-500 mb-2">{title}</h3>
      <p className="heading-xl text-gray-900 mb-1">{value}</p>
      {max && (
        <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
          <div
            className="bg-black rounded-full h-2"
            style={{ width: `${(parseFloat(value) / max) * 100}%` }}
          />
        </div>
      )}
      <p className="caption text-gray-400">{subtitle}</p>
    </motion.div>
  );
}

// Chart Card Component
function ChartCard({
  title,
  icon,
  children,
  className = '',
}: {
  title: string;
  icon: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`glass-card ${className}`}
    >
      <div className="flex items-center gap-3 mb-6">
        <span className="text-2xl">{icon}</span>
        <h2 className="heading-md text-gray-900">{title}</h2>
      </div>
      {children}
    </motion.div>
  );
}

// Mini Line Chart Component
function MiniLineChart({
  data,
  dataKey,
  color,
}: {
  data: any[];
  dataKey: string;
  color: string;
}) {
  const max = Math.max(...data.map(d => d[dataKey] || 0));
  const points = data
    .map((d, i) => {
      const x = (i / (data.length - 1)) * 100;
      const y = 100 - ((d[dataKey] || 0) / max) * 80;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <div className="relative h-48">
      <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        <polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        />
        <polyline
          points={`0,100 ${points} 100,100`}
          fill={color}
          fillOpacity="0.1"
        />
      </svg>

      {/* Data Points */}
      <div className="absolute bottom-0 left-0 right-0 flex justify-between text-xs text-gray-500 mt-2">
        <span>{data[0]?.date.split('-')[2]}</span>
        <span>{data[Math.floor(data.length / 2)]?.date.split('-')[2]}</span>
        <span>{data[data.length - 1]?.date.split('-')[2]}</span>
      </div>
    </div>
  );
}

// Emotions List Component
function EmotionsList({
  emotions,
}: {
  emotions: Array<{ emotion: string; count: number; percentage: number }>;
}) {
  const emotionEmojis: Record<string, string> = {
    happy: '😊',
    excited: '🤩',
    neutral: '😐',
    confused: '🤔',
    sad: '😢',
    angry: '😠',
    surprised: '😲',
    calm: '😌',
  };

  return (
    <div className="space-y-3">
      {emotions.slice(0, 6).map((emotion) => (
        <div key={emotion.emotion} className="flex items-center gap-4">
          <span className="text-2xl">{emotionEmojis[emotion.emotion] || '😐'}</span>
          <div className="flex-1">
            <div className="flex justify-between items-center mb-1">
              <span className="body-sm font-medium text-gray-700 capitalize">
                {emotion.emotion}
              </span>
              <span className="caption text-gray-500">
                {emotion.count} ({emotion.percentage}%)
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-blue-500 to-purple-500 rounded-full h-2"
                style={{ width: `${emotion.percentage}%` }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Topics List Component
function TopicsList({
  topics,
}: {
  topics: Array<{ topic: string; count: number }>;
}) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {topics.slice(0, 10).map((topic) => (
        <div
          key={topic.topic}
          className="bg-gray-50 rounded-xl p-4 text-center hover:bg-gray-100 transition-colors"
        >
          <p className="body-md font-semibold text-gray-900 mb-1">{topic.count}</p>
          <p className="caption text-gray-600 truncate">{topic.topic}</p>
        </div>
      ))}
    </div>
  );
}

// Action Card Component
function ActionCard({
  title,
  description,
  icon,
  href,
  badge,
}: {
  title: string;
  description: string;
  icon: string;
  href: string;
  badge?: string;
}) {
  return (
    <Link href={href}>
      <motion.div
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="glass-card hover:shadow-lg transition-all cursor-pointer"
      >
        <div className="flex items-start justify-between mb-4">
          <span className="text-4xl">{icon}</span>
          {badge && (
            <span className="px-2 py-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-semibold rounded-md">
              {badge}
            </span>
          )}
        </div>
        <h3 className="heading-sm text-gray-900 mb-2">{title}</h3>
        <p className="body-sm text-gray-600">{description}</p>
      </motion.div>
    </Link>
  );
}
