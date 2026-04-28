// Database types generated from Supabase schema
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          subscription_tier: 'free' | 'premium' | 'family'
          subscription_status: 'active' | 'canceled' | 'past_due' | 'trialing'
          stripe_customer_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          subscription_tier?: 'free' | 'premium' | 'family'
          subscription_status?: 'active' | 'canceled' | 'past_due' | 'trialing'
          stripe_customer_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          subscription_tier?: 'free' | 'premium' | 'family'
          subscription_status?: 'active' | 'canceled' | 'past_due' | 'trialing'
          stripe_customer_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      personalities: {
        Row: {
          id: string
          user_id: string
          name: string
          date_of_birth: string | null
          date_of_passing: string | null
          relationship_to_creator: string | null
          voice_profile: Json
          voice_sample_urls: string[]
          personality_traits: Json
          memories: string[]
          life_events: Json[]
          preferences: Json
          speech_patterns: Json
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          date_of_birth?: string | null
          date_of_passing?: string | null
          relationship_to_creator?: string | null
          voice_profile?: Json
          voice_sample_urls?: string[]
          personality_traits?: Json
          memories?: string[]
          life_events?: Json[]
          preferences?: Json
          speech_patterns?: Json
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          date_of_birth?: string | null
          date_of_passing?: string | null
          relationship_to_creator?: string | null
          voice_profile?: Json
          voice_sample_urls?: string[]
          personality_traits?: Json
          memories?: string[]
          life_events?: Json[]
          preferences?: Json
          speech_patterns?: Json
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      recordings: {
        Row: {
          id: string
          personality_id: string
          user_id: string
          file_url: string
          file_size: number | null
          duration: number | null
          transcript: string | null
          processed_content: Json
          extracted_memories: string[]
          emotion_analysis: Json
          topics: string[]
          metadata: Json
          processing_status: 'pending' | 'processing' | 'completed' | 'failed'
          created_at: string
          processed_at: string | null
        }
        Insert: {
          id?: string
          personality_id: string
          user_id: string
          file_url: string
          file_size?: number | null
          duration?: number | null
          transcript?: string | null
          processed_content?: Json
          extracted_memories?: string[]
          emotion_analysis?: Json
          topics?: string[]
          metadata?: Json
          processing_status?: 'pending' | 'processing' | 'completed' | 'failed'
          created_at?: string
          processed_at?: string | null
        }
        Update: {
          id?: string
          personality_id?: string
          user_id?: string
          file_url?: string
          file_size?: number | null
          duration?: number | null
          transcript?: string | null
          processed_content?: Json
          extracted_memories?: string[]
          emotion_analysis?: Json
          topics?: string[]
          metadata?: Json
          processing_status?: 'pending' | 'processing' | 'completed' | 'failed'
          created_at?: string
          processed_at?: string | null
        }
      }
      conversations: {
        Row: {
          id: string
          personality_id: string
          family_member_id: string
          title: string | null
          last_message_at: string
          message_count: number
          is_archived: boolean
          created_at: string
        }
        Insert: {
          id?: string
          personality_id: string
          family_member_id: string
          title?: string | null
          last_message_at?: string
          message_count?: number
          is_archived?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          personality_id?: string
          family_member_id?: string
          title?: string | null
          last_message_at?: string
          message_count?: number
          is_archived?: boolean
          created_at?: string
        }
      }
      messages: {
        Row: {
          id: string
          conversation_id: string
          sender_type: 'user' | 'personality' | 'system'
          sender_id: string | null
          content: string
          voice_url: string | null
          emotion: string | null
          attachments: Json
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          conversation_id: string
          sender_type: 'user' | 'personality' | 'system'
          sender_id?: string | null
          content: string
          voice_url?: string | null
          emotion?: string | null
          attachments?: Json
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          conversation_id?: string
          sender_type?: 'user' | 'personality' | 'system'
          sender_id?: string | null
          content?: string
          voice_url?: string | null
          emotion?: string | null
          attachments?: Json
          metadata?: Json
          created_at?: string
        }
      }
      family_connections: {
        Row: {
          id: string
          personality_id: string
          inviter_id: string
          member_id: string | null
          member_email: string
          member_name: string | null
          relationship: string
          access_level: 'viewer' | 'contributor' | 'admin'
          invitation_token: string | null
          invitation_status: 'pending' | 'accepted' | 'declined' | 'expired'
          invited_at: string
          accepted_at: string | null
        }
        Insert: {
          id?: string
          personality_id: string
          inviter_id: string
          member_id?: string | null
          member_email: string
          member_name?: string | null
          relationship: string
          access_level?: 'viewer' | 'contributor' | 'admin'
          invitation_token?: string | null
          invitation_status?: 'pending' | 'accepted' | 'declined' | 'expired'
          invited_at?: string
          accepted_at?: string | null
        }
        Update: {
          id?: string
          personality_id?: string
          inviter_id?: string
          member_id?: string | null
          member_email?: string
          member_name?: string | null
          relationship?: string
          access_level?: 'viewer' | 'contributor' | 'admin'
          invitation_token?: string | null
          invitation_status?: 'pending' | 'accepted' | 'declined' | 'expired'
          invited_at?: string
          accepted_at?: string | null
        }
      }
      scheduled_messages: {
        Row: {
          id: string
          personality_id: string
          recipient_id: string | null
          recipient_email: string | null
          trigger_date: string
          trigger_time: string | null
          recurrence_pattern: 'once' | 'yearly' | 'monthly' | 'weekly'
          message_type: 'birthday' | 'anniversary' | 'holiday' | 'custom'
          content: string
          voice_message_url: string | null
          is_active: boolean
          last_sent_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          personality_id: string
          recipient_id?: string | null
          recipient_email?: string | null
          trigger_date: string
          trigger_time?: string | null
          recurrence_pattern?: 'once' | 'yearly' | 'monthly' | 'weekly'
          message_type: 'birthday' | 'anniversary' | 'holiday' | 'custom'
          content: string
          voice_message_url?: string | null
          is_active?: boolean
          last_sent_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          personality_id?: string
          recipient_id?: string | null
          recipient_email?: string | null
          trigger_date?: string
          trigger_time?: string | null
          recurrence_pattern?: 'once' | 'yearly' | 'monthly' | 'weekly'
          message_type?: 'birthday' | 'anniversary' | 'holiday' | 'custom'
          content?: string
          voice_message_url?: string | null
          is_active?: boolean
          last_sent_at?: string | null
          created_at?: string
        }
      }
      voice_profiles: {
        Row: {
          id: string
          personality_id: string
          elevenlabs_voice_id: string | null
          voice_name: string | null
          sample_urls: string[]
          voice_settings: Json
          training_status: 'pending' | 'training' | 'ready' | 'failed'
          quality_score: number | null
          created_at: string
          trained_at: string | null
        }
        Insert: {
          id?: string
          personality_id: string
          elevenlabs_voice_id?: string | null
          voice_name?: string | null
          sample_urls?: string[]
          voice_settings?: Json
          training_status?: 'pending' | 'training' | 'ready' | 'failed'
          quality_score?: number | null
          created_at?: string
          trained_at?: string | null
        }
        Update: {
          id?: string
          personality_id?: string
          elevenlabs_voice_id?: string | null
          voice_name?: string | null
          sample_urls?: string[]
          voice_settings?: Json
          training_status?: 'pending' | 'training' | 'ready' | 'failed'
          quality_score?: number | null
          created_at?: string
          trained_at?: string | null
        }
      }
      subscription_history: {
        Row: {
          id: string
          user_id: string
          stripe_subscription_id: string | null
          plan_name: string
          plan_tier: string
          amount: number
          currency: string
          status: string
          started_at: string
          ended_at: string | null
          metadata: Json
        }
        Insert: {
          id?: string
          user_id: string
          stripe_subscription_id?: string | null
          plan_name: string
          plan_tier: string
          amount: number
          currency?: string
          status: string
          started_at: string
          ended_at?: string | null
          metadata?: Json
        }
        Update: {
          id?: string
          user_id?: string
          stripe_subscription_id?: string | null
          plan_name?: string
          plan_tier?: string
          amount?: number
          currency?: string
          status?: string
          started_at?: string
          ended_at?: string | null
          metadata?: Json
        }
      }
      usage_tracking: {
        Row: {
          id: string
          user_id: string
          feature: string
          usage_count: number
          usage_date: string
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          feature: string
          usage_count?: number
          usage_date?: string
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          feature?: string
          usage_count?: number
          usage_date?: string
          metadata?: Json
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      track_usage: {
        Args: {
          p_user_id: string
          p_feature: string
          p_metadata?: Json
        }
        Returns: void
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}