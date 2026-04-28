/**
 * Creator Analytics API
 *
 * Provides comprehensive analytics for creators to understand
 * how their digital twin is performing and engaging with users.
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { withAuthErrorHandling, successResponse } from '@/lib/errors/handler';
import { Errors } from '@/lib/errors/types';
import { withRateLimitAndErrorHandling } from '@/lib/middleware/rate-limit';

interface CreatorAnalytics {
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
    trends: Array<{ date: string; happy: number; sad: number; excited: number }>;
  };
  topTopics: Array<{
    topic: string;
    count: number;
    avgSentiment: number;
  }>;
  userSatisfaction: {
    ratings: Array<{ rating: number; count: number; percentage: number }>;
    avgRating: number;
    totalRatings: number;
  };
  performance: {
    avgLatency: number;
    p95Latency: number;
    successRate: number;
    errorCount: number;
  };
}

async function getCreatorAnalyticsHandler(
  request: NextRequest,
  userId: string
): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const timeRange = searchParams.get('timeRange') || '7d'; // 7d, 30d, 90d, all

  // Calculate date range
  const endDate = new Date();
  const startDate = new Date();

  switch (timeRange) {
    case '7d':
      startDate.setDate(endDate.getDate() - 7);
      break;
    case '30d':
      startDate.setDate(endDate.getDate() - 30);
      break;
    case '90d':
      startDate.setDate(endDate.getDate() - 90);
      break;
    case 'all':
      startDate.setFullYear(2020); // Beginning of time
      break;
  }

  // 1. Overview Stats
  const { data: sessions, error: sessionsError } = await supabaseAdmin
    .from('live_chat_sessions')
    .select('*')
    .eq('user_id', userId)
    .gte('started_at', startDate.toISOString())
    .lte('started_at', endDate.toISOString());

  if (sessionsError) {
    throw Errors.database('fetch sessions', sessionsError);
  }

  const totalSessions = sessions?.length || 0;
  const totalConversations = sessions?.reduce((sum, s) => sum + (s.message_count || 0), 0) || 0;
  const totalMinutes = sessions?.reduce((sum, s) => sum + (s.total_duration_seconds || 0), 0) / 60 || 0;
  const avgSessionDuration = totalSessions > 0 ? totalMinutes / totalSessions : 0;
  const avgSatisfactionRating = sessions?.reduce((sum, s) => sum + (s.user_satisfaction_rating || 0), 0) / totalSessions || 0;

  // Active users (unique sessions in last 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const { count: activeUsers } = await supabaseAdmin
    .from('live_chat_sessions')
    .select('id', { count: 'exact' })
    .eq('user_id', userId)
    .gte('started_at', sevenDaysAgo.toISOString());

  // 2. Trends (Sessions per day)
  const sessionsPerDay = generateDailyTrends(sessions || [], startDate, endDate, 'sessions');
  const conversationsPerDay = generateDailyTrends(sessions || [], startDate, endDate, 'conversations');
  const minutesPerDay = generateDailyTrends(sessions || [], startDate, endDate, 'minutes');

  // 3. Emotion Analytics
  const { data: messages } = await supabaseAdmin
    .from('live_chat_messages')
    .select('emotion_detected, timestamp')
    .eq('user_id', userId)
    .gte('timestamp', startDate.toISOString())
    .not('emotion_detected', 'is', null);

  const emotionDistribution = calculateEmotionDistribution(messages || []);
  const emotionTrends = calculateEmotionTrends(messages || [], startDate, endDate);

  // 4. Top Topics (from analytics table)
  const { data: analytics } = await supabaseAdmin
    .from('live_chat_analytics')
    .select('topics_discussed, conversation_summary')
    .eq('user_id', userId)
    .gte('created_at', startDate.toISOString())
    .limit(100);

  const topTopics = extractTopTopics(analytics || []);

  // 5. User Satisfaction
  const ratings = sessions
    ?.filter(s => s.user_satisfaction_rating)
    .map(s => s.user_satisfaction_rating) || [];

  const userSatisfaction = calculateSatisfactionMetrics(ratings);

  // 6. Performance Metrics
  const { data: performanceData } = await supabaseAdmin
    .from('live_chat_messages')
    .select('latency_ms')
    .eq('user_id', userId)
    .eq('role', 'assistant')
    .gte('timestamp', startDate.toISOString())
    .not('latency_ms', 'is', null);

  const performance = calculatePerformanceMetrics(performanceData || [], sessions || []);

  const analyticsData: CreatorAnalytics = {
    overview: {
      totalSessions,
      totalConversations,
      totalMinutes: Math.round(totalMinutes),
      activeUsers: activeUsers || 0,
      avgSessionDuration: Math.round(avgSessionDuration * 10) / 10,
      avgSatisfactionRating: Math.round(avgSatisfactionRating * 10) / 10,
    },
    trends: {
      sessionsPerDay,
      conversationsPerDay,
      minutesPerDay,
    },
    emotions: {
      distribution: emotionDistribution,
      trends: emotionTrends,
    },
    topTopics,
    userSatisfaction,
    performance,
  };

  return successResponse(analyticsData);
}

/**
 * Helper: Generate daily trends
 */
function generateDailyTrends(
  sessions: any[],
  startDate: Date,
  endDate: Date,
  type: 'sessions' | 'conversations' | 'minutes'
): Array<{ date: string; count?: number; minutes?: number }> {
  const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const trends: any[] = [];

  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];

    const daySessions = sessions.filter(s => {
      const sessionDate = new Date(s.started_at).toISOString().split('T')[0];
      return sessionDate === dateStr;
    });

    if (type === 'sessions') {
      trends.push({ date: dateStr, count: daySessions.length });
    } else if (type === 'conversations') {
      const count = daySessions.reduce((sum, s) => sum + (s.message_count || 0), 0);
      trends.push({ date: dateStr, count });
    } else if (type === 'minutes') {
      const minutes = daySessions.reduce((sum, s) => sum + (s.total_duration_seconds || 0), 0) / 60;
      trends.push({ date: dateStr, minutes: Math.round(minutes) });
    }
  }

  return trends;
}

/**
 * Helper: Calculate emotion distribution
 */
function calculateEmotionDistribution(
  messages: any[]
): Array<{ emotion: string; count: number; percentage: number }> {
  const emotionCounts: Record<string, number> = {};

  messages.forEach(m => {
    const emotion = m.emotion_detected;
    emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1;
  });

  const total = messages.length;
  return Object.entries(emotionCounts)
    .map(([emotion, count]) => ({
      emotion,
      count,
      percentage: Math.round((count / total) * 100),
    }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Helper: Calculate emotion trends over time
 */
function calculateEmotionTrends(
  messages: any[],
  startDate: Date,
  endDate: Date
): Array<{ date: string; happy: number; sad: number; excited: number }> {
  const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const trends: any[] = [];

  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];

    const dayMessages = messages.filter(m => {
      const msgDate = new Date(m.timestamp).toISOString().split('T')[0];
      return msgDate === dateStr;
    });

    const happy = dayMessages.filter(m => m.emotion_detected === 'happy').length;
    const sad = dayMessages.filter(m => m.emotion_detected === 'sad').length;
    const excited = dayMessages.filter(m => m.emotion_detected === 'excited').length;

    trends.push({ date: dateStr, happy, sad, excited });
  }

  return trends;
}

/**
 * Helper: Extract top topics
 */
function extractTopTopics(
  analytics: any[]
): Array<{ topic: string; count: number; avgSentiment: number }> {
  const topicCounts: Record<string, { count: number; sentiments: number[] }> = {};

  analytics.forEach(a => {
    const topics = a.topics_discussed || [];
    topics.forEach((topic: string) => {
      if (!topicCounts[topic]) {
        topicCounts[topic] = { count: 0, sentiments: [] };
      }
      topicCounts[topic].count++;
    });
  });

  return Object.entries(topicCounts)
    .map(([topic, data]) => ({
      topic,
      count: data.count,
      avgSentiment: data.sentiments.length > 0
        ? data.sentiments.reduce((sum, s) => sum + s, 0) / data.sentiments.length
        : 0,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
}

/**
 * Helper: Calculate satisfaction metrics
 */
function calculateSatisfactionMetrics(ratings: number[]) {
  const ratingCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

  ratings.forEach(r => {
    if (r >= 1 && r <= 5) {
      ratingCounts[r]++;
    }
  });

  const total = ratings.length;
  const avgRating = total > 0 ? ratings.reduce((sum, r) => sum + r, 0) / total : 0;

  return {
    ratings: Object.entries(ratingCounts).map(([rating, count]) => ({
      rating: parseInt(rating),
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0,
    })),
    avgRating: Math.round(avgRating * 10) / 10,
    totalRatings: total,
  };
}

/**
 * Helper: Calculate performance metrics
 */
function calculatePerformanceMetrics(performanceData: any[], sessions: any[]) {
  const latencies = performanceData.map(p => p.latency_ms).filter(l => l != null);
  const avgLatency = latencies.length > 0
    ? Math.round(latencies.reduce((sum, l) => sum + l, 0) / latencies.length)
    : 0;

  // P95 latency
  const sortedLatencies = [...latencies].sort((a, b) => a - b);
  const p95Index = Math.floor(sortedLatencies.length * 0.95);
  const p95Latency = sortedLatencies[p95Index] || 0;

  // Success rate
  const completedSessions = sessions.filter(s => s.session_status === 'completed').length;
  const successRate = sessions.length > 0
    ? Math.round((completedSessions / sessions.length) * 100)
    : 0;

  const errorCount = sessions.filter(s => s.error_count > 0).length;

  return {
    avgLatency,
    p95Latency,
    successRate,
    errorCount,
  };
}

// GET /api/analytics/creator - Get creator analytics
export const GET = withRateLimitAndErrorHandling(
  withAuthErrorHandling(getCreatorAnalyticsHandler),
  { requests: 30, window: '1 m' }
);
