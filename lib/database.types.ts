export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      achievements: {
        Row: {
          category: string
          created_at: string | null
          description: string
          icon: string
          id: string
          name: string
          points: number
          tier: string
        }
        Insert: {
          category: string
          created_at?: string | null
          description: string
          icon: string
          id: string
          name: string
          points?: number
          tier?: string
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string
          icon?: string
          id?: string
          name?: string
          points?: number
          tier?: string
        }
        Relationships: []
      }
      admin_users: {
        Row: {
          added_at: string
          added_by: string | null
          daily_report_enabled: boolean
          email: string
          id: number
          is_active: boolean
          notes: string | null
          profile_id: string
          role: string
        }
        Insert: {
          added_at?: string
          added_by?: string | null
          daily_report_enabled?: boolean
          email: string
          id?: number
          is_active?: boolean
          notes?: string | null
          profile_id: string
          role?: string
        }
        Update: {
          added_at?: string
          added_by?: string | null
          daily_report_enabled?: boolean
          email?: string
          id?: number
          is_active?: boolean
          notes?: string | null
          profile_id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_users_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_users_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_usage_logs: {
        Row: {
          cost_estimate: number | null
          created_at: string
          deleted_at: string | null
          error_message: string | null
          generation_type: string
          id: string
          metadata: Json | null
          model_used: string
          prompt_length: number | null
          success: boolean | null
          tokens_used: number | null
          user_id: string
        }
        Insert: {
          cost_estimate?: number | null
          created_at?: string
          deleted_at?: string | null
          error_message?: string | null
          generation_type: string
          id?: string
          metadata?: Json | null
          model_used: string
          prompt_length?: number | null
          success?: boolean | null
          tokens_used?: number | null
          user_id: string
        }
        Update: {
          cost_estimate?: number | null
          created_at?: string
          deleted_at?: string | null
          error_message?: string | null
          generation_type?: string
          id?: string
          metadata?: Json | null
          model_used?: string
          prompt_length?: number | null
          success?: boolean | null
          tokens_used?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_usage_logs_profile_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_admin_audit_logs: {
        Row: {
          action: string
          admin_id: string | null
          created_at: string | null
          details: Json | null
          id: number
          ip_address: string | null
          resource_id: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          admin_id?: string | null
          created_at?: string | null
          details?: Json | null
          id?: number
          ip_address?: string | null
          resource_id?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          admin_id?: string | null
          created_at?: string | null
          details?: Json | null
          id?: number
          ip_address?: string | null
          resource_id?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analytics_admin_audit_logs_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_ai_insights: {
        Row: {
          action_suggestion: string | null
          body: string
          brew_id: string | null
          brewer_notes: string | null
          brewer_reaction: string | null
          brewery_id: string
          created_at: string
          expires_at: string | null
          id: string
          insight_type: string
          is_dismissed: boolean
          is_read: boolean
          session_id: string | null
          severity: string
          source_phases: string[] | null
          title: string
          trigger_data: Json
          user_id: string | null
        }
        Insert: {
          action_suggestion?: string | null
          body: string
          brew_id?: string | null
          brewer_notes?: string | null
          brewer_reaction?: string | null
          brewery_id: string
          created_at?: string
          expires_at?: string | null
          id?: string
          insight_type: string
          is_dismissed?: boolean
          is_read?: boolean
          session_id?: string | null
          severity?: string
          source_phases?: string[] | null
          title: string
          trigger_data?: Json
          user_id?: string | null
        }
        Update: {
          action_suggestion?: string | null
          body?: string
          brew_id?: string | null
          brewer_notes?: string | null
          brewer_reaction?: string | null
          brewery_id?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          insight_type?: string
          is_dismissed?: boolean
          is_read?: boolean
          session_id?: string | null
          severity?: string
          source_phases?: string[] | null
          title?: string
          trigger_data?: Json
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analytics_ai_insights_brew_id_fkey"
            columns: ["brew_id"]
            isOneToOne: false
            referencedRelation: "brews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_ai_insights_brewery_id_fkey"
            columns: ["brewery_id"]
            isOneToOne: false
            referencedRelation: "breweries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_ai_insights_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "brewing_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_alert_history: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          created_at: string | null
          id: number
          message: string | null
          metric_value: number | null
          resolved_at: string | null
          rule_id: number | null
          triggered_at: string | null
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          created_at?: string | null
          id?: number
          message?: string | null
          metric_value?: number | null
          resolved_at?: string | null
          rule_id?: number | null
          triggered_at?: string | null
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          created_at?: string | null
          id?: number
          message?: string | null
          metric_value?: number | null
          resolved_at?: string | null
          rule_id?: number | null
          triggered_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analytics_alert_history_acknowledged_by_fkey"
            columns: ["acknowledged_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_alert_history_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "analytics_alert_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_alert_rules: {
        Row: {
          condition: string
          created_at: string | null
          description: string | null
          enabled: boolean | null
          id: number
          last_triggered_at: string | null
          metric: string
          name: string
          notification_channels: string[] | null
          priority: string
          threshold: number
          timeframe_minutes: number | null
          updated_at: string | null
        }
        Insert: {
          condition: string
          created_at?: string | null
          description?: string | null
          enabled?: boolean | null
          id?: number
          last_triggered_at?: string | null
          metric: string
          name: string
          notification_channels?: string[] | null
          priority?: string
          threshold: number
          timeframe_minutes?: number | null
          updated_at?: string | null
        }
        Update: {
          condition?: string
          created_at?: string | null
          description?: string | null
          enabled?: boolean | null
          id?: number
          last_triggered_at?: string | null
          metric?: string
          name?: string
          notification_channels?: string[] | null
          priority?: string
          threshold?: number
          timeframe_minutes?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      analytics_brewery_daily: {
        Row: {
          active_members: number | null
          bottles_scanned: number | null
          brewery_id: string
          brews_count: number | null
          btb_plays_anonymous: number | null
          btb_plays_total: number | null
          created_at: string | null
          date: string
          id: number
          members_count: number | null
          ratings_received: number | null
          sessions_count: number | null
        }
        Insert: {
          active_members?: number | null
          bottles_scanned?: number | null
          brewery_id: string
          brews_count?: number | null
          btb_plays_anonymous?: number | null
          btb_plays_total?: number | null
          created_at?: string | null
          date: string
          id?: number
          members_count?: number | null
          ratings_received?: number | null
          sessions_count?: number | null
        }
        Update: {
          active_members?: number | null
          bottles_scanned?: number | null
          brewery_id?: string
          brews_count?: number | null
          btb_plays_anonymous?: number | null
          btb_plays_total?: number | null
          created_at?: string | null
          date?: string
          id?: number
          members_count?: number | null
          ratings_received?: number | null
          sessions_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "analytics_brewery_daily_brewery_id_fkey"
            columns: ["brewery_id"]
            isOneToOne: false
            referencedRelation: "breweries"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_cohorts: {
        Row: {
          avg_brews_per_user: number | null
          avg_events_per_user: number | null
          avg_ltv: number | null
          cohort_id: string
          created_at: string | null
          paid_conversion_rate: number | null
          retention_day1: number | null
          retention_day30: number | null
          retention_day7: number | null
          retention_day90: number | null
          updated_at: string | null
          user_count: number | null
        }
        Insert: {
          avg_brews_per_user?: number | null
          avg_events_per_user?: number | null
          avg_ltv?: number | null
          cohort_id: string
          created_at?: string | null
          paid_conversion_rate?: number | null
          retention_day1?: number | null
          retention_day30?: number | null
          retention_day7?: number | null
          retention_day90?: number | null
          updated_at?: string | null
          user_count?: number | null
        }
        Update: {
          avg_brews_per_user?: number | null
          avg_events_per_user?: number | null
          avg_ltv?: number | null
          cohort_id?: string
          created_at?: string | null
          paid_conversion_rate?: number | null
          retention_day1?: number | null
          retention_day30?: number | null
          retention_day7?: number | null
          retention_day90?: number | null
          updated_at?: string | null
          user_count?: number | null
        }
        Relationships: []
      }
      analytics_content_daily: {
        Row: {
          avg_rating: number | null
          brews_created_today: number | null
          created_at: string | null
          date: string
          id: number
          private_brews: number | null
          public_brews: number | null
          sessions_created_today: number | null
          team_brews: number | null
          total_bottles: number | null
          total_brews: number | null
          total_ratings: number | null
          total_sessions: number | null
        }
        Insert: {
          avg_rating?: number | null
          brews_created_today?: number | null
          created_at?: string | null
          date: string
          id?: number
          private_brews?: number | null
          public_brews?: number | null
          sessions_created_today?: number | null
          team_brews?: number | null
          total_bottles?: number | null
          total_brews?: number | null
          total_ratings?: number | null
          total_sessions?: number | null
        }
        Update: {
          avg_rating?: number | null
          brews_created_today?: number | null
          created_at?: string | null
          date?: string
          id?: number
          private_brews?: number | null
          public_brews?: number | null
          sessions_created_today?: number | null
          team_brews?: number | null
          total_bottles?: number | null
          total_brews?: number | null
          total_ratings?: number | null
          total_sessions?: number | null
        }
        Relationships: []
      }
      analytics_daily_stats: {
        Row: {
          brew_id: string | null
          brewery_id: string
          country_code: string | null
          date: string
          device_type: string | null
          hour_distribution: Json | null
          id: string
          logged_in_scans: number
          total_scans: number
          unique_visitors: number
        }
        Insert: {
          brew_id?: string | null
          brewery_id: string
          country_code?: string | null
          date: string
          device_type?: string | null
          hour_distribution?: Json | null
          id?: string
          logged_in_scans?: number
          total_scans?: number
          unique_visitors?: number
        }
        Update: {
          brew_id?: string | null
          brewery_id?: string
          country_code?: string | null
          date?: string
          device_type?: string | null
          hour_distribution?: Json | null
          id?: string
          logged_in_scans?: number
          total_scans?: number
          unique_visitors?: number
        }
        Relationships: [
          {
            foreignKeyName: "analytics_daily_stats_brew_id_fkey"
            columns: ["brew_id"]
            isOneToOne: false
            referencedRelation: "brews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_daily_stats_brewery_id_fkey"
            columns: ["brewery_id"]
            isOneToOne: false
            referencedRelation: "breweries"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_events: {
        Row: {
          category: string
          created_at: string
          event_type: string
          id: string
          path: string | null
          payload: Json | null
          response_time_ms: number | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          category: string
          created_at?: string
          event_type: string
          id?: string
          path?: string | null
          payload?: Json | null
          response_time_ms?: number | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          event_type?: string
          id?: string
          path?: string | null
          payload?: Json | null
          response_time_ms?: number | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      analytics_feature_usage: {
        Row: {
          avg_duration_seconds: number | null
          created_at: string | null
          date: string
          error_count: number | null
          feature: string
          id: number
          success_count: number | null
          unique_users: number | null
          usage_count: number | null
        }
        Insert: {
          avg_duration_seconds?: number | null
          created_at?: string | null
          date: string
          error_count?: number | null
          feature: string
          id?: number
          success_count?: number | null
          unique_users?: number | null
          usage_count?: number | null
        }
        Update: {
          avg_duration_seconds?: number | null
          created_at?: string | null
          date?: string
          error_count?: number | null
          feature?: string
          id?: number
          success_count?: number | null
          unique_users?: number | null
          usage_count?: number | null
        }
        Relationships: []
      }
      analytics_report_logs: {
        Row: {
          brewery_id: string
          created_at: string
          email_id: string | null
          email_provider: string | null
          email_sent_to: string | null
          error_message: string | null
          id: string
          period_end: string
          period_start: string
          report_setting_id: string
          status: string
          top_brew_id: string | null
          total_scans: number | null
          unique_visitors: number | null
        }
        Insert: {
          brewery_id: string
          created_at?: string
          email_id?: string | null
          email_provider?: string | null
          email_sent_to?: string | null
          error_message?: string | null
          id?: string
          period_end: string
          period_start: string
          report_setting_id: string
          status: string
          top_brew_id?: string | null
          total_scans?: number | null
          unique_visitors?: number | null
        }
        Update: {
          brewery_id?: string
          created_at?: string
          email_id?: string | null
          email_provider?: string | null
          email_sent_to?: string | null
          error_message?: string | null
          id?: string
          period_end?: string
          period_start?: string
          report_setting_id?: string
          status?: string
          top_brew_id?: string | null
          total_scans?: number | null
          unique_visitors?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "analytics_report_logs_brewery_id_fkey"
            columns: ["brewery_id"]
            isOneToOne: false
            referencedRelation: "breweries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_report_logs_report_setting_id_fkey"
            columns: ["report_setting_id"]
            isOneToOne: false
            referencedRelation: "analytics_report_settings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_report_logs_top_brew_id_fkey"
            columns: ["top_brew_id"]
            isOneToOne: false
            referencedRelation: "brews"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_report_settings: {
        Row: {
          brewery_id: string
          created_at: string
          email: string
          enabled: boolean
          frequency: string
          id: string
          include_device_stats: boolean | null
          include_geographic_data: boolean | null
          include_time_analysis: boolean | null
          include_top_brews: boolean | null
          last_sent_at: string | null
          send_count: number | null
          send_day: number
          updated_at: string
          user_id: string
        }
        Insert: {
          brewery_id: string
          created_at?: string
          email: string
          enabled?: boolean
          frequency: string
          id?: string
          include_device_stats?: boolean | null
          include_geographic_data?: boolean | null
          include_time_analysis?: boolean | null
          include_top_brews?: boolean | null
          last_sent_at?: string | null
          send_count?: number | null
          send_day: number
          updated_at?: string
          user_id: string
        }
        Update: {
          brewery_id?: string
          created_at?: string
          email?: string
          enabled?: boolean
          frequency?: string
          id?: string
          include_device_stats?: boolean | null
          include_geographic_data?: boolean | null
          include_time_analysis?: boolean | null
          include_top_brews?: boolean | null
          last_sent_at?: string | null
          send_count?: number | null
          send_day?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "analytics_report_settings_brewery_id_fkey"
            columns: ["brewery_id"]
            isOneToOne: false
            referencedRelation: "breweries"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_system_hourly: {
        Row: {
          active_users_count: number | null
          api_calls_count: number | null
          avg_response_time_ms: number | null
          created_at: string | null
          date: string
          error_count: number | null
          hour: number
          id: number
          timestamp: string
          unique_sessions: number | null
        }
        Insert: {
          active_users_count?: number | null
          api_calls_count?: number | null
          avg_response_time_ms?: number | null
          created_at?: string | null
          date: string
          error_count?: number | null
          hour: number
          id?: number
          timestamp: string
          unique_sessions?: number | null
        }
        Update: {
          active_users_count?: number | null
          api_calls_count?: number | null
          avg_response_time_ms?: number | null
          created_at?: string | null
          date?: string
          error_count?: number | null
          hour?: number
          id?: number
          timestamp?: string
          unique_sessions?: number | null
        }
        Relationships: []
      }
      analytics_user_daily: {
        Row: {
          created_at: string | null
          date: string
          events_count: number | null
          features_used: string[] | null
          id: number
          last_event_at: string | null
          session_duration_seconds: number | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          date: string
          events_count?: number | null
          features_used?: string[] | null
          id?: number
          last_event_at?: string | null
          session_duration_seconds?: number | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          date?: string
          events_count?: number | null
          features_used?: string[] | null
          id?: number
          last_event_at?: string | null
          session_duration_seconds?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "analytics_user_daily_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      beat_friend_challenges: {
        Row: {
          brew_id: string
          challenged_id: string | null
          challenged_profile: Json | null
          challenged_score: number | null
          challenger_id: string
          challenger_profile: Json
          challenger_score: number
          completed_at: string | null
          created_at: string
          expires_at: string
          id: string
          token: string
        }
        Insert: {
          brew_id: string
          challenged_id?: string | null
          challenged_profile?: Json | null
          challenged_score?: number | null
          challenger_id: string
          challenger_profile: Json
          challenger_score: number
          completed_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          token?: string
        }
        Update: {
          brew_id?: string
          challenged_id?: string | null
          challenged_profile?: Json | null
          challenged_score?: number | null
          challenger_id?: string
          challenger_profile?: Json
          challenger_score?: number
          completed_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "beat_friend_challenges_brew_id_fkey"
            columns: ["brew_id"]
            isOneToOne: false
            referencedRelation: "brews"
            referencedColumns: ["id"]
          },
        ]
      }
      botlguide_audit_log: {
        Row: {
          brewery_id: string | null
          capability: string
          created_at: string
          credits_used: number
          error_message: string | null
          id: number
          input_summary: string | null
          ip_address: unknown
          model: string
          output_summary: string | null
          rag_sources_used: string[] | null
          response_time_ms: number | null
          status: string
          token_count_input: number | null
          token_count_output: number | null
          user_id: string
        }
        Insert: {
          brewery_id?: string | null
          capability: string
          created_at?: string
          credits_used?: number
          error_message?: string | null
          id?: never
          input_summary?: string | null
          ip_address?: unknown
          model?: string
          output_summary?: string | null
          rag_sources_used?: string[] | null
          response_time_ms?: number | null
          status?: string
          token_count_input?: number | null
          token_count_output?: number | null
          user_id: string
        }
        Update: {
          brewery_id?: string | null
          capability?: string
          created_at?: string
          credits_used?: number
          error_message?: string | null
          id?: never
          input_summary?: string | null
          ip_address?: unknown
          model?: string
          output_summary?: string | null
          rag_sources_used?: string[] | null
          response_time_ms?: number | null
          status?: string
          token_count_input?: number | null
          token_count_output?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "botlguide_audit_log_brewery_id_fkey"
            columns: ["brewery_id"]
            isOneToOne: false
            referencedRelation: "breweries"
            referencedColumns: ["id"]
          },
        ]
      }
      botlguide_embeddings: {
        Row: {
          brewery_id: string | null
          content: string
          created_at: string
          embedding: string | null
          id: string
          metadata: Json | null
          source_id: string
          source_type: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          brewery_id?: string | null
          content: string
          created_at?: string
          embedding?: string | null
          id?: string
          metadata?: Json | null
          source_id: string
          source_type: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          brewery_id?: string | null
          content?: string
          created_at?: string
          embedding?: string | null
          id?: string
          metadata?: Json | null
          source_id?: string
          source_type?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "botlguide_embeddings_brewery_id_fkey"
            columns: ["brewery_id"]
            isOneToOne: false
            referencedRelation: "breweries"
            referencedColumns: ["id"]
          },
        ]
      }
      botlguide_feedback: {
        Row: {
          capability: string | null
          context_key: string
          created_at: string | null
          feedback: string
          generated_text: string | null
          id: string
          user_id: string | null
        }
        Insert: {
          capability?: string | null
          context_key: string
          created_at?: string | null
          feedback: string
          generated_text?: string | null
          id?: string
          user_id?: string | null
        }
        Update: {
          capability?: string | null
          context_key?: string
          created_at?: string | null
          feedback?: string
          generated_text?: string | null
          id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      bottle_scans: {
        Row: {
          bottle_age_days: number | null
          bottle_id: string
          brew_id: string | null
          brewery_id: string | null
          city: string | null
          confirmed_drinking: boolean | null
          converted_to_rating: boolean | null
          country_code: string | null
          created_at: string
          detected_city: string | null
          detected_country: string | null
          detected_region: string | null
          device_type: string | null
          drinking_probability: number | null
          geo_consent_given: boolean | null
          geo_source: string | null
          geom: unknown
          id: string
          is_owner_scan: boolean | null
          latitude: number | null
          local_time: string | null
          longitude: number | null
          referrer_domain: string | null
          scan_intent: string | null
          scan_source: string | null
          scanned_at_hour: number | null
          session_hash: string | null
          user_agent_parsed: string | null
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
          viewer_user_id: string | null
          weather_category: string | null
          weather_condition: string | null
          weather_fetched_at: string | null
          weather_is_outdoor: boolean | null
          weather_temp_c: number | null
        }
        Insert: {
          bottle_age_days?: number | null
          bottle_id: string
          brew_id?: string | null
          brewery_id?: string | null
          city?: string | null
          confirmed_drinking?: boolean | null
          converted_to_rating?: boolean | null
          country_code?: string | null
          created_at?: string
          detected_city?: string | null
          detected_country?: string | null
          detected_region?: string | null
          device_type?: string | null
          drinking_probability?: number | null
          geo_consent_given?: boolean | null
          geo_source?: string | null
          geom?: unknown
          id?: string
          is_owner_scan?: boolean | null
          latitude?: number | null
          local_time?: string | null
          longitude?: number | null
          referrer_domain?: string | null
          scan_intent?: string | null
          scan_source?: string | null
          scanned_at_hour?: number | null
          session_hash?: string | null
          user_agent_parsed?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          viewer_user_id?: string | null
          weather_category?: string | null
          weather_condition?: string | null
          weather_fetched_at?: string | null
          weather_is_outdoor?: boolean | null
          weather_temp_c?: number | null
        }
        Update: {
          bottle_age_days?: number | null
          bottle_id?: string
          brew_id?: string | null
          brewery_id?: string | null
          city?: string | null
          confirmed_drinking?: boolean | null
          converted_to_rating?: boolean | null
          country_code?: string | null
          created_at?: string
          detected_city?: string | null
          detected_country?: string | null
          detected_region?: string | null
          device_type?: string | null
          drinking_probability?: number | null
          geo_consent_given?: boolean | null
          geo_source?: string | null
          geom?: unknown
          id?: string
          is_owner_scan?: boolean | null
          latitude?: number | null
          local_time?: string | null
          longitude?: number | null
          referrer_domain?: string | null
          scan_intent?: string | null
          scan_source?: string | null
          scanned_at_hour?: number | null
          session_hash?: string | null
          user_agent_parsed?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          viewer_user_id?: string | null
          weather_category?: string | null
          weather_condition?: string | null
          weather_fetched_at?: string | null
          weather_is_outdoor?: boolean | null
          weather_temp_c?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "bottle_scans_bottle_id_fkey"
            columns: ["bottle_id"]
            isOneToOne: false
            referencedRelation: "bottles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bottle_scans_brew_id_fkey"
            columns: ["brew_id"]
            isOneToOne: false
            referencedRelation: "brews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bottle_scans_brewery_id_fkey"
            columns: ["brewery_id"]
            isOneToOne: false
            referencedRelation: "breweries"
            referencedColumns: ["id"]
          },
        ]
      }
      bottles: {
        Row: {
          bottle_number: number
          brew_id: string | null
          brewery_id: string | null
          created_at: string | null
          filled_at: string | null
          id: string
          scan_count: number
          session_id: string | null
          short_code: string | null
          size_l: number | null
          user_id: string | null
        }
        Insert: {
          bottle_number?: number
          brew_id?: string | null
          brewery_id?: string | null
          created_at?: string | null
          filled_at?: string | null
          id?: string
          scan_count?: number
          session_id?: string | null
          short_code?: string | null
          size_l?: number | null
          user_id?: string | null
        }
        Update: {
          bottle_number?: number
          brew_id?: string | null
          brewery_id?: string | null
          created_at?: string | null
          filled_at?: string | null
          id?: string
          scan_count?: number
          session_id?: string | null
          short_code?: string | null
          size_l?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bottles_brew_id_fkey"
            columns: ["brew_id"]
            isOneToOne: false
            referencedRelation: "brews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bottles_brewery_id_fkey"
            columns: ["brewery_id"]
            isOneToOne: false
            referencedRelation: "breweries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bottles_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "brewing_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      bounty_claims: {
        Row: {
          bounty_id: string
          claimed_at: string
          id: string
          qualifying_event_id: string | null
          user_id: string
        }
        Insert: {
          bounty_id: string
          claimed_at?: string
          id?: string
          qualifying_event_id?: string | null
          user_id: string
        }
        Update: {
          bounty_id?: string
          claimed_at?: string
          id?: string
          qualifying_event_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bounty_claims_bounty_id_fkey"
            columns: ["bounty_id"]
            isOneToOne: false
            referencedRelation: "brewer_bounties"
            referencedColumns: ["id"]
          },
        ]
      }
      brew_measurements: {
        Row: {
          brew_id: string | null
          created_at: string
          created_by: string | null
          gravity: number | null
          id: string
          is_og: boolean | null
          measured_at: string
          note: string | null
          ph: number | null
          pressure: number | null
          session_id: string | null
          source: string | null
          temperature: number | null
        }
        Insert: {
          brew_id?: string | null
          created_at?: string
          created_by?: string | null
          gravity?: number | null
          id?: string
          is_og?: boolean | null
          measured_at?: string
          note?: string | null
          ph?: number | null
          pressure?: number | null
          session_id?: string | null
          source?: string | null
          temperature?: number | null
        }
        Update: {
          brew_id?: string | null
          created_at?: string
          created_by?: string | null
          gravity?: number | null
          id?: string
          is_og?: boolean | null
          measured_at?: string
          note?: string | null
          ph?: number | null
          pressure?: number | null
          session_id?: string | null
          source?: string | null
          temperature?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "brew_measurements_brew_id_fkey"
            columns: ["brew_id"]
            isOneToOne: false
            referencedRelation: "brews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brew_measurements_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "brewing_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      brew_views: {
        Row: {
          brew_id: string
          dwell_seconds: number | null
          id: string
          source: string | null
          user_id: string
          viewed_at: string
        }
        Insert: {
          brew_id: string
          dwell_seconds?: number | null
          id?: string
          source?: string | null
          user_id: string
          viewed_at?: string
        }
        Update: {
          brew_id?: string
          dwell_seconds?: number | null
          id?: string
          source?: string | null
          user_id?: string
          viewed_at?: string
        }
        Relationships: []
      }
      brewer_bounties: {
        Row: {
          brew_id: string | null
          brewery_id: string
          condition_type: string
          condition_value: number
          created_at: string
          description: string
          expires_at: string | null
          id: string
          is_active: boolean
          max_claims: number | null
          reward_code: string | null
          reward_type: string
          reward_value: string
          title: string
        }
        Insert: {
          brew_id?: string | null
          brewery_id: string
          condition_type: string
          condition_value: number
          created_at?: string
          description: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_claims?: number | null
          reward_code?: string | null
          reward_type: string
          reward_value: string
          title: string
        }
        Update: {
          brew_id?: string | null
          brewery_id?: string
          condition_type?: string
          condition_value?: number
          created_at?: string
          description?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_claims?: number | null
          reward_code?: string | null
          reward_type?: string
          reward_value?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "brewer_bounties_brew_id_fkey"
            columns: ["brew_id"]
            isOneToOne: false
            referencedRelation: "brews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brewer_bounties_brewery_id_fkey"
            columns: ["brewery_id"]
            isOneToOne: false
            referencedRelation: "breweries"
            referencedColumns: ["id"]
          },
        ]
      }
      breweries: {
        Row: {
          banner_url: string | null
          brewery_size: string | null
          created_at: string | null
          custom_slogan: string | null
          description: string | null
          founded_year: number | null
          id: string
          invite_code: string
          location: string | null
          logo_url: string | null
          moderated_at: string | null
          moderated_by: string | null
          moderation_rejection_reason: string | null
          moderation_status: string | null
          name: string
          slug: string | null
          tier: string
          website: string | null
        }
        Insert: {
          banner_url?: string | null
          brewery_size?: string | null
          created_at?: string | null
          custom_slogan?: string | null
          description?: string | null
          founded_year?: number | null
          id?: string
          invite_code?: string
          location?: string | null
          logo_url?: string | null
          moderated_at?: string | null
          moderated_by?: string | null
          moderation_rejection_reason?: string | null
          moderation_status?: string | null
          name: string
          slug?: string | null
          tier?: string
          website?: string | null
        }
        Update: {
          banner_url?: string | null
          brewery_size?: string | null
          created_at?: string | null
          custom_slogan?: string | null
          description?: string | null
          founded_year?: number | null
          id?: string
          invite_code?: string
          location?: string | null
          logo_url?: string | null
          moderated_at?: string | null
          moderated_by?: string | null
          moderation_rejection_reason?: string | null
          moderation_status?: string | null
          name?: string
          slug?: string | null
          tier?: string
          website?: string | null
        }
        Relationships: []
      }
      brewery_feed: {
        Row: {
          brewery_id: string
          content: Json
          created_at: string
          id: string
          type: string
          user_id: string | null
        }
        Insert: {
          brewery_id: string
          content?: Json
          created_at?: string
          id?: string
          type: string
          user_id?: string | null
        }
        Update: {
          brewery_id?: string
          content?: Json
          created_at?: string
          id?: string
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brewery_feed_brewery_id_fkey"
            columns: ["brewery_id"]
            isOneToOne: false
            referencedRelation: "breweries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brewery_feed_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      brewery_members: {
        Row: {
          brewery_id: string | null
          id: string
          joined_at: string | null
          preferences: Json | null
          role: string | null
          user_id: string | null
        }
        Insert: {
          brewery_id?: string | null
          id?: string
          joined_at?: string | null
          preferences?: Json | null
          role?: string | null
          user_id?: string | null
        }
        Update: {
          brewery_id?: string | null
          id?: string
          joined_at?: string | null
          preferences?: Json | null
          role?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brewery_members_brewery_id_fkey"
            columns: ["brewery_id"]
            isOneToOne: false
            referencedRelation: "breweries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brewery_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      brewery_saved_brews: {
        Row: {
          brew_id: string
          brewery_id: string
          created_by: string | null
          id: string
          saved_at: string
        }
        Insert: {
          brew_id: string
          brewery_id: string
          created_by?: string | null
          id?: string
          saved_at?: string
        }
        Update: {
          brew_id?: string
          brewery_id?: string
          created_by?: string | null
          id?: string
          saved_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "brewery_saved_brews_brew_id_fkey"
            columns: ["brew_id"]
            isOneToOne: false
            referencedRelation: "brews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brewery_saved_brews_brewery_id_fkey"
            columns: ["brewery_id"]
            isOneToOne: false
            referencedRelation: "breweries"
            referencedColumns: ["id"]
          },
        ]
      }
      brewery_settings: {
        Row: {
          botlguide_enabled: boolean
          botlguide_voice_config: Json | null
          brewery_id: string
          created_at: string
          id: string
          max_documents: number
          sop_upload_enabled: boolean
          updated_at: string
        }
        Insert: {
          botlguide_enabled?: boolean
          botlguide_voice_config?: Json | null
          brewery_id: string
          created_at?: string
          id?: string
          max_documents?: number
          sop_upload_enabled?: boolean
          updated_at?: string
        }
        Update: {
          botlguide_enabled?: boolean
          botlguide_voice_config?: Json | null
          brewery_id?: string
          created_at?: string
          id?: string
          max_documents?: number
          sop_upload_enabled?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "brewery_settings_brewery_id_fkey"
            columns: ["brewery_id"]
            isOneToOne: true
            referencedRelation: "breweries"
            referencedColumns: ["id"]
          },
        ]
      }
      brewing_sessions: {
        Row: {
          apparent_attenuation: number | null
          batch_code: string | null
          brew_id: string | null
          brewed_at: string | null
          brewery_id: string
          carbonation_level: number | null
          completed_at: string | null
          created_at: string
          current_gravity: number | null
          id: string
          measure_volume: number | null
          measured_abv: number | null
          measured_efficiency: number | null
          measured_fg: number | null
          measured_og: number | null
          measurements: Json | null
          notes: string | null
          phase: string | null
          session_type: string
          started_at: string | null
          status: string | null
          target_og: number | null
          timeline: Json | null
        }
        Insert: {
          apparent_attenuation?: number | null
          batch_code?: string | null
          brew_id?: string | null
          brewed_at?: string | null
          brewery_id: string
          carbonation_level?: number | null
          completed_at?: string | null
          created_at?: string
          current_gravity?: number | null
          id?: string
          measure_volume?: number | null
          measured_abv?: number | null
          measured_efficiency?: number | null
          measured_fg?: number | null
          measured_og?: number | null
          measurements?: Json | null
          notes?: string | null
          phase?: string | null
          session_type?: string
          started_at?: string | null
          status?: string | null
          target_og?: number | null
          timeline?: Json | null
        }
        Update: {
          apparent_attenuation?: number | null
          batch_code?: string | null
          brew_id?: string | null
          brewed_at?: string | null
          brewery_id?: string
          carbonation_level?: number | null
          completed_at?: string | null
          created_at?: string
          current_gravity?: number | null
          id?: string
          measure_volume?: number | null
          measured_abv?: number | null
          measured_efficiency?: number | null
          measured_fg?: number | null
          measured_og?: number | null
          measurements?: Json | null
          notes?: string | null
          phase?: string | null
          session_type?: string
          started_at?: string | null
          status?: string | null
          target_og?: number | null
          timeline?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "brewing_sessions_brew_id_fkey"
            columns: ["brew_id"]
            isOneToOne: false
            referencedRelation: "brews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brewing_sessions_brewery_id_fkey"
            columns: ["brewery_id"]
            isOneToOne: false
            referencedRelation: "breweries"
            referencedColumns: ["id"]
          },
        ]
      }
      brews: {
        Row: {
          abv: number | null
          abv_calculated: number | null
          brew_type: string | null
          brewery_id: string | null
          cap_url: string | null
          copy_count: number | null
          created_at: string | null
          data: Json | null
          description: string | null
          fermentation_type: string | null
          flavor_profile: Json | null
          ibu: number | null
          ibu_calculated: number | null
          id: string
          image_url: string | null
          ingredients_migrated: boolean | null
          is_featured: boolean
          is_public: boolean | null
          likes_count: number
          mash_method: string | null
          mash_process: string | null
          mash_steps_count: number | null
          moderated_at: string | null
          moderated_by: string | null
          moderation_rejection_reason: string | null
          moderation_status: string | null
          name: string | null
          quality_score: number | null
          remix_parent_id: string | null
          srm_calculated: number | null
          style: string | null
          times_brewed: number
          trending_score: number | null
          trending_score_override: number | null
          typical_scan_hour: number | null
          typical_temperature: number | null
          user_id: string | null
          view_count: number
        }
        Insert: {
          abv?: number | null
          abv_calculated?: number | null
          brew_type?: string | null
          brewery_id?: string | null
          cap_url?: string | null
          copy_count?: number | null
          created_at?: string | null
          data?: Json | null
          description?: string | null
          fermentation_type?: string | null
          flavor_profile?: Json | null
          ibu?: number | null
          ibu_calculated?: number | null
          id?: string
          image_url?: string | null
          ingredients_migrated?: boolean | null
          is_featured?: boolean
          is_public?: boolean | null
          likes_count?: number
          mash_method?: string | null
          mash_process?: string | null
          mash_steps_count?: number | null
          moderated_at?: string | null
          moderated_by?: string | null
          moderation_rejection_reason?: string | null
          moderation_status?: string | null
          name?: string | null
          quality_score?: number | null
          remix_parent_id?: string | null
          srm_calculated?: number | null
          style?: string | null
          times_brewed?: number
          trending_score?: number | null
          trending_score_override?: number | null
          typical_scan_hour?: number | null
          typical_temperature?: number | null
          user_id?: string | null
          view_count?: number
        }
        Update: {
          abv?: number | null
          abv_calculated?: number | null
          brew_type?: string | null
          brewery_id?: string | null
          cap_url?: string | null
          copy_count?: number | null
          created_at?: string | null
          data?: Json | null
          description?: string | null
          fermentation_type?: string | null
          flavor_profile?: Json | null
          ibu?: number | null
          ibu_calculated?: number | null
          id?: string
          image_url?: string | null
          ingredients_migrated?: boolean | null
          is_featured?: boolean
          is_public?: boolean | null
          likes_count?: number
          mash_method?: string | null
          mash_process?: string | null
          mash_steps_count?: number | null
          moderated_at?: string | null
          moderated_by?: string | null
          moderation_rejection_reason?: string | null
          moderation_status?: string | null
          name?: string | null
          quality_score?: number | null
          remix_parent_id?: string | null
          srm_calculated?: number | null
          style?: string | null
          times_brewed?: number
          trending_score?: number | null
          trending_score_override?: number | null
          typical_scan_hour?: number | null
          typical_temperature?: number | null
          user_id?: string | null
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "brews_brewery_id_fkey"
            columns: ["brewery_id"]
            isOneToOne: false
            referencedRelation: "breweries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brews_remix_parent_id_fkey"
            columns: ["remix_parent_id"]
            isOneToOne: false
            referencedRelation: "brews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brews_user_fk"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      btb_used_nonces: {
        Row: {
          bottle_id: string
          brew_id: string
          id: string
          ip_hash: string | null
          nonce: string
          session_id: string | null
          used_at: string
          user_id: string | null
        }
        Insert: {
          bottle_id: string
          brew_id: string
          id?: string
          ip_hash?: string | null
          nonce: string
          session_id?: string | null
          used_at?: string
          user_id?: string | null
        }
        Update: {
          bottle_id?: string
          brew_id?: string
          id?: string
          ip_hash?: string | null
          nonce?: string
          session_id?: string | null
          used_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "btb_used_nonces_bottle_id_fkey"
            columns: ["bottle_id"]
            isOneToOne: false
            referencedRelation: "bottles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "btb_used_nonces_brew_id_fkey"
            columns: ["brew_id"]
            isOneToOne: false
            referencedRelation: "brews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "btb_used_nonces_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "brewing_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "btb_used_nonces_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      collected_caps: {
        Row: {
          brew_id: string | null
          cap_tier: string
          claimed_via: string | null
          collected_at: string | null
          id: string
          rating_id: string | null
          user_id: string | null
        }
        Insert: {
          brew_id?: string | null
          cap_tier?: string
          claimed_via?: string | null
          collected_at?: string | null
          id?: string
          rating_id?: string | null
          user_id?: string | null
        }
        Update: {
          brew_id?: string | null
          cap_tier?: string
          claimed_via?: string | null
          collected_at?: string | null
          id?: string
          rating_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "collected_caps_brew_id_fkey"
            columns: ["brew_id"]
            isOneToOne: false
            referencedRelation: "brews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collected_caps_rating_id_fkey"
            columns: ["rating_id"]
            isOneToOne: false
            referencedRelation: "ratings"
            referencedColumns: ["id"]
          },
        ]
      }
      content_appeals: {
        Row: {
          admin_response: string | null
          appeal_text: string
          created_at: string
          id: string
          moderation_reason: string | null
          report_id: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          target_title: string | null
          target_type: string
          user_id: string
        }
        Insert: {
          admin_response?: string | null
          appeal_text: string
          created_at?: string
          id?: string
          moderation_reason?: string | null
          report_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          target_title?: string | null
          target_type: string
          user_id: string
        }
        Update: {
          admin_response?: string | null
          appeal_text?: string
          created_at?: string
          id?: string
          moderation_reason?: string | null
          report_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          target_title?: string | null
          target_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_appeals_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
        ]
      }
      enterprise_codes: {
        Row: {
          code: string
          created_at: string | null
          created_by: string | null
          current_uses: number | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          max_uses: number | null
        }
        Insert: {
          code: string
          created_at?: string | null
          created_by?: string | null
          current_uses?: number | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
        }
        Update: {
          code?: string
          created_at?: string | null
          created_by?: string | null
          current_uses?: number | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
        }
        Relationships: []
      }
      equipment_profiles: {
        Row: {
          batch_volume_l: number
          boil_off_rate: number
          brew_method: string
          brewery_id: string
          cooling_shrinkage: number
          created_at: string
          default_efficiency: number
          grain_absorption: number
          id: string
          is_default: boolean
          mash_thickness: number
          name: string
          trub_loss: number
          updated_at: string
        }
        Insert: {
          batch_volume_l?: number
          boil_off_rate?: number
          brew_method?: string
          brewery_id: string
          cooling_shrinkage?: number
          created_at?: string
          default_efficiency?: number
          grain_absorption?: number
          id?: string
          is_default?: boolean
          mash_thickness?: number
          name: string
          trub_loss?: number
          updated_at?: string
        }
        Update: {
          batch_volume_l?: number
          boil_off_rate?: number
          brew_method?: string
          brewery_id?: string
          cooling_shrinkage?: number
          created_at?: string
          default_efficiency?: number
          grain_absorption?: number
          id?: string
          is_default?: boolean
          mash_thickness?: number
          name?: string
          trub_loss?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipment_profiles_brewery_id_fkey"
            columns: ["brewery_id"]
            isOneToOne: false
            referencedRelation: "breweries"
            referencedColumns: ["id"]
          },
        ]
      }
      flavor_profiles: {
        Row: {
          bitterness: number | null
          body: number | null
          brew_id: string
          created_at: string
          fruitiness: number | null
          id: string
          ip_hash: string | null
          is_shadowbanned: boolean | null
          plausibility_score: number | null
          rating_id: string | null
          roast: number | null
          session_id: string | null
          sweetness: number | null
          user_id: string | null
        }
        Insert: {
          bitterness?: number | null
          body?: number | null
          brew_id: string
          created_at?: string
          fruitiness?: number | null
          id?: string
          ip_hash?: string | null
          is_shadowbanned?: boolean | null
          plausibility_score?: number | null
          rating_id?: string | null
          roast?: number | null
          session_id?: string | null
          sweetness?: number | null
          user_id?: string | null
        }
        Update: {
          bitterness?: number | null
          body?: number | null
          brew_id?: string
          created_at?: string
          fruitiness?: number | null
          id?: string
          ip_hash?: string | null
          is_shadowbanned?: boolean | null
          plausibility_score?: number | null
          rating_id?: string | null
          roast?: number | null
          session_id?: string | null
          sweetness?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "flavor_profiles_brew_id_fkey"
            columns: ["brew_id"]
            isOneToOne: false
            referencedRelation: "brews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flavor_profiles_rating_id_fkey"
            columns: ["rating_id"]
            isOneToOne: false
            referencedRelation: "ratings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flavor_profiles_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "brewing_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_bookmarks: {
        Row: {
          created_at: string
          id: string
          target_id: string
          target_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          target_id: string
          target_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          target_id?: string
          target_type?: string
          user_id?: string
        }
        Relationships: []
      }
      forum_categories: {
        Row: {
          created_at: string
          description: string | null
          icon: string | null
          id: string
          slug: string
          sort_order: number | null
          title: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          slug: string
          sort_order?: number | null
          title: string
        }
        Update: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          slug?: string
          sort_order?: number | null
          title?: string
        }
        Relationships: []
      }
      forum_poll_options: {
        Row: {
          id: string
          label: string
          poll_id: string
          sort_order: number
        }
        Insert: {
          id?: string
          label: string
          poll_id: string
          sort_order?: number
        }
        Update: {
          id?: string
          label?: string
          poll_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "forum_poll_options_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "forum_polls"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_poll_votes: {
        Row: {
          created_at: string
          id: string
          option_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          option_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          option_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "forum_poll_votes_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "forum_poll_options"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_polls: {
        Row: {
          created_at: string
          ends_at: string | null
          id: string
          multiple_choice: boolean
          question: string
          thread_id: string
        }
        Insert: {
          created_at?: string
          ends_at?: string | null
          id?: string
          multiple_choice?: boolean
          question: string
          thread_id: string
        }
        Update: {
          created_at?: string
          ends_at?: string | null
          id?: string
          multiple_choice?: boolean
          question?: string
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "forum_polls_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: true
            referencedRelation: "forum_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_posts: {
        Row: {
          author_id: string | null
          content: string
          created_at: string
          deleted_at: string | null
          id: string
          parent_id: string | null
          search_vector: unknown
          thread_id: string
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          content: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          parent_id?: string | null
          search_vector?: unknown
          thread_id: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          content?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          parent_id?: string | null
          search_vector?: unknown
          thread_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "forum_posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_posts_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "forum_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_posts_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "forum_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_subscriptions: {
        Row: {
          created_at: string
          id: string
          thread_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          thread_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          thread_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "forum_subscriptions_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "forum_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_threads: {
        Row: {
          author_id: string | null
          brew_id: string | null
          category_id: string
          content: string
          created_at: string
          deleted_at: string | null
          id: string
          is_locked: boolean | null
          is_pinned: boolean | null
          is_solved: boolean | null
          last_reply_at: string
          reply_count: number | null
          search_vector: unknown
          tags: string[]
          thread_type: string
          title: string
          updated_at: string
          view_count: number | null
        }
        Insert: {
          author_id?: string | null
          brew_id?: string | null
          category_id: string
          content: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_locked?: boolean | null
          is_pinned?: boolean | null
          is_solved?: boolean | null
          last_reply_at?: string
          reply_count?: number | null
          search_vector?: unknown
          tags?: string[]
          thread_type?: string
          title: string
          updated_at?: string
          view_count?: number | null
        }
        Update: {
          author_id?: string | null
          brew_id?: string | null
          category_id?: string
          content?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_locked?: boolean | null
          is_pinned?: boolean | null
          is_solved?: boolean | null
          last_reply_at?: string
          reply_count?: number | null
          search_vector?: unknown
          tags?: string[]
          thread_type?: string
          title?: string
          updated_at?: string
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "forum_threads_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_threads_brew_id_fkey"
            columns: ["brew_id"]
            isOneToOne: false
            referencedRelation: "brews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_threads_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "forum_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_votes: {
        Row: {
          created_at: string
          id: string
          reaction_type: string
          target_id: string
          target_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          reaction_type: string
          target_id: string
          target_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          reaction_type?: string
          target_id?: string
          target_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "forum_votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ingredient_import_queue: {
        Row: {
          created_at: string | null
          id: string
          import_count: number | null
          imported_by: string | null
          raw_data: Json | null
          raw_name: string
          rejection_reason: string | null
          status: string | null
          suggested_master_id: string | null
          type: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          import_count?: number | null
          imported_by?: string | null
          raw_data?: Json | null
          raw_name: string
          rejection_reason?: string | null
          status?: string | null
          suggested_master_id?: string | null
          type?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          import_count?: number | null
          imported_by?: string | null
          raw_data?: Json | null
          raw_name?: string
          rejection_reason?: string | null
          status?: string | null
          suggested_master_id?: string | null
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ingredient_import_queue_suggested_master_id_fkey"
            columns: ["suggested_master_id"]
            isOneToOne: false
            referencedRelation: "ingredient_master"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ingredient_import_queue_suggested_master_id_fkey"
            columns: ["suggested_master_id"]
            isOneToOne: false
            referencedRelation: "ingredient_usage_stats"
            referencedColumns: ["id"]
          },
        ]
      }
      ingredient_master: {
        Row: {
          aliases: string[] | null
          aliases_flat: string | null
          alpha_pct: number | null
          color_ebc: number | null
          created_at: string | null
          description: string | null
          id: string
          name: string
          potential_pts: number | null
          type: string
          updated_at: string | null
        }
        Insert: {
          aliases?: string[] | null
          aliases_flat?: string | null
          alpha_pct?: number | null
          color_ebc?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          potential_pts?: number | null
          type: string
          updated_at?: string | null
        }
        Update: {
          aliases?: string[] | null
          aliases_flat?: string | null
          alpha_pct?: number | null
          color_ebc?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          potential_pts?: number | null
          type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      ingredient_products: {
        Row: {
          alcohol_tolerance_pct: number | null
          alpha_pct: number | null
          attenuation_pct: number | null
          beta_pct: number | null
          cohumulone_pct: number | null
          color_ebc: number | null
          created_at: string | null
          flocculation: string | null
          id: string
          is_verified: boolean | null
          manufacturer: string | null
          master_id: string
          max_temp_c: number | null
          min_temp_c: number | null
          name: string
          notes: string | null
          potential_pts: number | null
          source_url: string | null
          updated_at: string | null
        }
        Insert: {
          alcohol_tolerance_pct?: number | null
          alpha_pct?: number | null
          attenuation_pct?: number | null
          beta_pct?: number | null
          cohumulone_pct?: number | null
          color_ebc?: number | null
          created_at?: string | null
          flocculation?: string | null
          id?: string
          is_verified?: boolean | null
          manufacturer?: string | null
          master_id: string
          max_temp_c?: number | null
          min_temp_c?: number | null
          name: string
          notes?: string | null
          potential_pts?: number | null
          source_url?: string | null
          updated_at?: string | null
        }
        Update: {
          alcohol_tolerance_pct?: number | null
          alpha_pct?: number | null
          attenuation_pct?: number | null
          beta_pct?: number | null
          cohumulone_pct?: number | null
          color_ebc?: number | null
          created_at?: string | null
          flocculation?: string | null
          id?: string
          is_verified?: boolean | null
          manufacturer?: string | null
          master_id?: string
          max_temp_c?: number | null
          min_temp_c?: number | null
          name?: string
          notes?: string | null
          potential_pts?: number | null
          source_url?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ingredient_products_master_id_fkey"
            columns: ["master_id"]
            isOneToOne: false
            referencedRelation: "ingredient_master"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ingredient_products_master_id_fkey"
            columns: ["master_id"]
            isOneToOne: false
            referencedRelation: "ingredient_usage_stats"
            referencedColumns: ["id"]
          },
        ]
      }
      label_templates: {
        Row: {
          brewery_id: string
          config: Json
          created_at: string | null
          description: string | null
          format_id: string
          id: string
          is_default: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          brewery_id: string
          config?: Json
          created_at?: string | null
          description?: string | null
          format_id?: string
          id?: string
          is_default?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          brewery_id?: string
          config?: Json
          created_at?: string | null
          description?: string | null
          format_id?: string
          id?: string
          is_default?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "label_templates_brewery_id_fkey"
            columns: ["brewery_id"]
            isOneToOne: false
            referencedRelation: "breweries"
            referencedColumns: ["id"]
          },
        ]
      }
      likes: {
        Row: {
          brew_id: string | null
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          brew_id?: string | null
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          brew_id?: string | null
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "likes_brew_id_fkey"
            columns: ["brew_id"]
            isOneToOne: false
            referencedRelation: "brews"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          actor_id: string | null
          created_at: string
          data: Json | null
          id: string
          is_read: boolean
          type: string
          user_id: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          data?: Json | null
          id?: string
          is_read?: boolean
          type: string
          user_id: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          data?: Json | null
          id?: string
          is_read?: boolean
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_settings: {
        Row: {
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          achievements: Json | null
          active_brewery_id: string | null
          ai_credits_reset_at: string
          ai_credits_used_this_month: number
          analytics_opt_out: boolean | null
          app_mode: string
          banner_url: string | null
          bio: string | null
          birthdate: string | null
          botlguide_insights_enabled: boolean
          custom_brewery_slogan: string | null
          display_name: string | null
          founded_year: number | null
          id: string
          joined_at: string | null
          location: string | null
          logo_url: string | null
          pending_avatar_url: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_expires_at: string | null
          subscription_started_at: string | null
          subscription_status: string
          subscription_tier: string
          tasting_iq: number
          total_bottle_fills: number | null
          total_profile_views: number | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          achievements?: Json | null
          active_brewery_id?: string | null
          ai_credits_reset_at?: string
          ai_credits_used_this_month?: number
          analytics_opt_out?: boolean | null
          app_mode?: string
          banner_url?: string | null
          bio?: string | null
          birthdate?: string | null
          botlguide_insights_enabled?: boolean
          custom_brewery_slogan?: string | null
          display_name?: string | null
          founded_year?: number | null
          id: string
          joined_at?: string | null
          location?: string | null
          logo_url?: string | null
          pending_avatar_url?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_expires_at?: string | null
          subscription_started_at?: string | null
          subscription_status?: string
          subscription_tier?: string
          tasting_iq?: number
          total_bottle_fills?: number | null
          total_profile_views?: number | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          achievements?: Json | null
          active_brewery_id?: string | null
          ai_credits_reset_at?: string
          ai_credits_used_this_month?: number
          analytics_opt_out?: boolean | null
          app_mode?: string
          banner_url?: string | null
          bio?: string | null
          birthdate?: string | null
          botlguide_insights_enabled?: boolean
          custom_brewery_slogan?: string | null
          display_name?: string | null
          founded_year?: number | null
          id?: string
          joined_at?: string | null
          location?: string | null
          logo_url?: string | null
          pending_avatar_url?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_expires_at?: string | null
          subscription_started_at?: string | null
          subscription_status?: string
          subscription_tier?: string
          tasting_iq?: number
          total_bottle_fills?: number | null
          total_profile_views?: number | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_active_brewery_id_fkey"
            columns: ["active_brewery_id"]
            isOneToOne: false
            referencedRelation: "breweries"
            referencedColumns: ["id"]
          },
        ]
      }
      rating_used_nonces: {
        Row: {
          bottle_id: string
          brew_id: string
          id: string
          ip_hash: string | null
          nonce: string
          session_id: string | null
          used_at: string
          user_id: string | null
        }
        Insert: {
          bottle_id: string
          brew_id: string
          id?: string
          ip_hash?: string | null
          nonce: string
          session_id?: string | null
          used_at?: string
          user_id?: string | null
        }
        Update: {
          bottle_id?: string
          brew_id?: string
          id?: string
          ip_hash?: string | null
          nonce?: string
          session_id?: string | null
          used_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rating_used_nonces_bottle_id_fkey"
            columns: ["bottle_id"]
            isOneToOne: false
            referencedRelation: "bottles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rating_used_nonces_brew_id_fkey"
            columns: ["brew_id"]
            isOneToOne: false
            referencedRelation: "brews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rating_used_nonces_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "brewing_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rating_used_nonces_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ratings: {
        Row: {
          appearance_clarity: string | null
          appearance_color: string | null
          aroma_intensity: number | null
          author_name: string
          brew_id: string
          comment: string | null
          created_at: string
          flagged_count: number | null
          flavor_tags: string[] | null
          id: string
          ip_address: string | null
          is_shadowbanned: boolean | null
          moderation_status: string | null
          plausibility_score: number | null
          qr_verified: boolean
          rating: number
          taste_acidity: number | null
          taste_bitterness: number | null
          taste_body: number | null
          taste_carbonation: number | null
          taste_sweetness: number | null
          user_id: string | null
        }
        Insert: {
          appearance_clarity?: string | null
          appearance_color?: string | null
          aroma_intensity?: number | null
          author_name: string
          brew_id: string
          comment?: string | null
          created_at?: string
          flagged_count?: number | null
          flavor_tags?: string[] | null
          id?: string
          ip_address?: string | null
          is_shadowbanned?: boolean | null
          moderation_status?: string | null
          plausibility_score?: number | null
          qr_verified?: boolean
          rating: number
          taste_acidity?: number | null
          taste_bitterness?: number | null
          taste_body?: number | null
          taste_carbonation?: number | null
          taste_sweetness?: number | null
          user_id?: string | null
        }
        Update: {
          appearance_clarity?: string | null
          appearance_color?: string | null
          aroma_intensity?: number | null
          author_name?: string
          brew_id?: string
          comment?: string | null
          created_at?: string
          flagged_count?: number | null
          flavor_tags?: string[] | null
          id?: string
          ip_address?: string | null
          is_shadowbanned?: boolean | null
          moderation_status?: string | null
          plausibility_score?: number | null
          qr_verified?: boolean
          rating?: number
          taste_acidity?: number | null
          taste_bitterness?: number | null
          taste_body?: number | null
          taste_carbonation?: number | null
          taste_sweetness?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ratings_brew_id_fkey"
            columns: ["brew_id"]
            isOneToOne: false
            referencedRelation: "brews"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_ingredients: {
        Row: {
          amount: number | null
          created_at: string | null
          id: string
          master_id: string | null
          override_alpha: number | null
          override_attenuation: number | null
          override_color_ebc: number | null
          product_id: string | null
          raw_name: string | null
          recipe_id: string
          sort_order: number | null
          time_minutes: number | null
          type: string | null
          unit: string | null
          usage: string | null
        }
        Insert: {
          amount?: number | null
          created_at?: string | null
          id?: string
          master_id?: string | null
          override_alpha?: number | null
          override_attenuation?: number | null
          override_color_ebc?: number | null
          product_id?: string | null
          raw_name?: string | null
          recipe_id: string
          sort_order?: number | null
          time_minutes?: number | null
          type?: string | null
          unit?: string | null
          usage?: string | null
        }
        Update: {
          amount?: number | null
          created_at?: string | null
          id?: string
          master_id?: string | null
          override_alpha?: number | null
          override_attenuation?: number | null
          override_color_ebc?: number | null
          product_id?: string | null
          raw_name?: string | null
          recipe_id?: string
          sort_order?: number | null
          time_minutes?: number | null
          type?: string | null
          unit?: string | null
          usage?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recipe_ingredients_master_id_fkey"
            columns: ["master_id"]
            isOneToOne: false
            referencedRelation: "ingredient_master"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_ingredients_master_id_fkey"
            columns: ["master_id"]
            isOneToOne: false
            referencedRelation: "ingredient_usage_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_ingredients_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "ingredient_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_ingredients_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "brews"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          created_at: string
          details: string | null
          id: string
          reason: Database["public"]["Enums"]["report_reason"]
          reporter_id: string
          resolved_at: string | null
          resolved_by: string | null
          status: Database["public"]["Enums"]["report_status"]
          target_id: string
          target_type: Database["public"]["Enums"]["report_target_type"]
        }
        Insert: {
          created_at?: string
          details?: string | null
          id?: string
          reason: Database["public"]["Enums"]["report_reason"]
          reporter_id: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          target_id: string
          target_type: Database["public"]["Enums"]["report_target_type"]
        }
        Update: {
          created_at?: string
          details?: string | null
          id?: string
          reason?: Database["public"]["Enums"]["report_reason"]
          reporter_id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          target_id?: string
          target_type?: Database["public"]["Enums"]["report_target_type"]
        }
        Relationships: []
      }
      scan_event_members: {
        Row: {
          event_id: string
          scan_id: string
        }
        Insert: {
          event_id: string
          scan_id: string
        }
        Update: {
          event_id?: string
          scan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scan_event_members_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "scan_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scan_event_members_scan_id_fkey"
            columns: ["scan_id"]
            isOneToOne: false
            referencedRelation: "bottle_scans"
            referencedColumns: ["id"]
          },
        ]
      }
      scan_events: {
        Row: {
          brew_ids: string[] | null
          brewer_label: string | null
          brewer_notes: string | null
          breweries: string[] | null
          center_lat: number
          center_lng: number
          city: string | null
          confidence: number | null
          country_code: string | null
          created_at: string
          event_end: string
          event_start: string
          event_type: string | null
          id: string
          radius_m: number | null
          total_scans: number
          unique_brews: number
          unique_sessions: number
        }
        Insert: {
          brew_ids?: string[] | null
          brewer_label?: string | null
          brewer_notes?: string | null
          breweries?: string[] | null
          center_lat: number
          center_lng: number
          city?: string | null
          confidence?: number | null
          country_code?: string | null
          created_at?: string
          event_end: string
          event_start: string
          event_type?: string | null
          id?: string
          radius_m?: number | null
          total_scans: number
          unique_brews: number
          unique_sessions: number
        }
        Update: {
          brew_ids?: string[] | null
          brewer_label?: string | null
          brewer_notes?: string | null
          breweries?: string[] | null
          center_lat?: number
          center_lng?: number
          city?: string | null
          confidence?: number | null
          country_code?: string | null
          created_at?: string
          event_end?: string
          event_start?: string
          event_type?: string | null
          id?: string
          radius_m?: number | null
          total_scans?: number
          unique_brews?: number
          unique_sessions?: number
        }
        Relationships: []
      }
      scan_intent_feedback: {
        Row: {
          actual_drinking: boolean
          context_features: Json
          created_at: string
          error_type: string | null
          id: string
          predicted_intent: string
          predicted_probability: number
          prediction_correct: boolean | null
          sampling_rate: number | null
          sampling_reason: string | null
          scan_id: string
        }
        Insert: {
          actual_drinking: boolean
          context_features?: Json
          created_at?: string
          error_type?: string | null
          id?: string
          predicted_intent: string
          predicted_probability: number
          prediction_correct?: boolean | null
          sampling_rate?: number | null
          sampling_reason?: string | null
          scan_id: string
        }
        Update: {
          actual_drinking?: boolean
          context_features?: Json
          created_at?: string
          error_type?: string | null
          id?: string
          predicted_intent?: string
          predicted_probability?: number
          prediction_correct?: boolean | null
          sampling_rate?: number | null
          sampling_reason?: string | null
          scan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scan_intent_feedback_scan_id_fkey"
            columns: ["scan_id"]
            isOneToOne: false
            referencedRelation: "bottle_scans"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_history: {
        Row: {
          changed_at: string
          changed_reason: string | null
          id: string
          metadata: Json | null
          previous_tier: string | null
          profile_id: string
          stripe_event_id: string | null
          subscription_status: string
          subscription_tier: string
        }
        Insert: {
          changed_at?: string
          changed_reason?: string | null
          id?: string
          metadata?: Json | null
          previous_tier?: string | null
          profile_id: string
          stripe_event_id?: string | null
          subscription_status: string
          subscription_tier: string
        }
        Update: {
          changed_at?: string
          changed_reason?: string | null
          id?: string
          metadata?: Json | null
          previous_tier?: string | null
          profile_id?: string
          stripe_event_id?: string | null
          subscription_status?: string
          subscription_tier?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_history_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tasting_score_events: {
        Row: {
          bottle_id: string | null
          bottle_scan_id: string | null
          brew_id: string | null
          created_at: string
          event_type: string
          id: string
          ip_hash: string | null
          is_shadowbanned: boolean | null
          match_score: number | null
          metadata: Json | null
          plausibility_score: number | null
          points_delta: number
          session_id: string | null
          session_token: string | null
          user_id: string | null
        }
        Insert: {
          bottle_id?: string | null
          bottle_scan_id?: string | null
          brew_id?: string | null
          created_at?: string
          event_type: string
          id?: string
          ip_hash?: string | null
          is_shadowbanned?: boolean | null
          match_score?: number | null
          metadata?: Json | null
          plausibility_score?: number | null
          points_delta: number
          session_id?: string | null
          session_token?: string | null
          user_id?: string | null
        }
        Update: {
          bottle_id?: string | null
          bottle_scan_id?: string | null
          brew_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
          ip_hash?: string | null
          is_shadowbanned?: boolean | null
          match_score?: number | null
          metadata?: Json | null
          plausibility_score?: number | null
          points_delta?: number
          session_id?: string | null
          session_token?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasting_score_events_bottle_id_fkey"
            columns: ["bottle_id"]
            isOneToOne: false
            referencedRelation: "bottles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasting_score_events_bottle_scan_id_fkey"
            columns: ["bottle_scan_id"]
            isOneToOne: false
            referencedRelation: "bottle_scans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasting_score_events_brew_id_fkey"
            columns: ["brew_id"]
            isOneToOne: false
            referencedRelation: "brews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasting_score_events_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "brewing_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasting_score_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      team_knowledge_base: {
        Row: {
          brewery_id: string
          chunk_count: number | null
          created_at: string
          error_message: string | null
          file_path: string
          file_size_bytes: number
          filename: string
          id: string
          metadata: Json | null
          mime_type: string
          status: string
          updated_at: string
          uploaded_by: string
        }
        Insert: {
          brewery_id: string
          chunk_count?: number | null
          created_at?: string
          error_message?: string | null
          file_path: string
          file_size_bytes?: number
          filename: string
          id?: string
          metadata?: Json | null
          mime_type?: string
          status?: string
          updated_at?: string
          uploaded_by: string
        }
        Update: {
          brewery_id?: string
          chunk_count?: number | null
          created_at?: string
          error_message?: string | null
          file_path?: string
          file_size_bytes?: number
          filename?: string
          id?: string
          metadata?: Json | null
          mime_type?: string
          status?: string
          updated_at?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_knowledge_base_brewery_id_fkey"
            columns: ["brewery_id"]
            isOneToOne: false
            referencedRelation: "breweries"
            referencedColumns: ["id"]
          },
        ]
      }
      team_knowledge_chunks: {
        Row: {
          brewery_id: string
          chunk_index: number
          content: string
          created_at: string
          document_id: string
          embedding: string | null
          id: string
          metadata: Json | null
          token_count: number | null
        }
        Insert: {
          brewery_id: string
          chunk_index: number
          content: string
          created_at?: string
          document_id: string
          embedding?: string | null
          id?: string
          metadata?: Json | null
          token_count?: number | null
        }
        Update: {
          brewery_id?: string
          chunk_index?: number
          content?: string
          created_at?: string
          document_id?: string
          embedding?: string | null
          id?: string
          metadata?: Json | null
          token_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "team_knowledge_chunks_brewery_id_fkey"
            columns: ["brewery_id"]
            isOneToOne: false
            referencedRelation: "breweries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_knowledge_chunks_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "team_knowledge_base"
            referencedColumns: ["id"]
          },
        ]
      }
      user_achievements: {
        Row: {
          achievement_id: string
          id: string
          unlocked_at: string | null
          user_id: string
        }
        Insert: {
          achievement_id: string
          id?: string
          unlocked_at?: string | null
          user_id: string
        }
        Update: {
          achievement_id?: string
          id?: string
          unlocked_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_achievements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_recommendations: {
        Row: {
          brew_id: string
          computed_at: string
          score: number
          user_id: string
        }
        Insert: {
          brew_id: string
          computed_at?: string
          score: number
          user_id: string
        }
        Update: {
          brew_id?: string
          computed_at?: string
          score?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_recommendations_brew_id_fkey"
            columns: ["brew_id"]
            isOneToOne: false
            referencedRelation: "brews"
            referencedColumns: ["id"]
          },
        ]
      }
      user_stash: {
        Row: {
          added_at: string
          brew_id: string
          id: string
          notes: string | null
          purchase_location: string | null
          user_id: string
        }
        Insert: {
          added_at?: string
          brew_id: string
          id?: string
          notes?: string | null
          purchase_location?: string | null
          user_id: string
        }
        Update: {
          added_at?: string
          brew_id?: string
          id?: string
          notes?: string | null
          purchase_location?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_stash_brew_id_fkey"
            columns: ["brew_id"]
            isOneToOne: false
            referencedRelation: "brews"
            referencedColumns: ["id"]
          },
        ]
      }
      vibe_check_used_nonces: {
        Row: {
          bottle_id: string
          brew_id: string
          id: string
          ip_hash: string | null
          nonce: string
          session_id: string | null
          used_at: string
          user_id: string | null
        }
        Insert: {
          bottle_id: string
          brew_id: string
          id?: string
          ip_hash?: string | null
          nonce: string
          session_id?: string | null
          used_at?: string
          user_id?: string | null
        }
        Update: {
          bottle_id?: string
          brew_id?: string
          id?: string
          ip_hash?: string | null
          nonce?: string
          session_id?: string | null
          used_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vibe_check_used_nonces_bottle_id_fkey"
            columns: ["bottle_id"]
            isOneToOne: false
            referencedRelation: "bottles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vibe_check_used_nonces_brew_id_fkey"
            columns: ["brew_id"]
            isOneToOne: false
            referencedRelation: "brews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vibe_check_used_nonces_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "brewing_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vibe_check_used_nonces_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      brew_style_averages: {
        Row: {
          avg_acidity: number | null
          avg_bitterness: number | null
          avg_body: number | null
          avg_carbonation: number | null
          avg_overall: number | null
          avg_sweetness: number | null
          brew_count: number | null
          rating_count: number | null
          style_display: string | null
          style_normalized: string | null
        }
        Relationships: []
      }
      brew_style_flavor_averages: {
        Row: {
          avg_bitterness: number | null
          avg_body: number | null
          avg_fruitiness: number | null
          avg_roast: number | null
          avg_sweetness: number | null
          brew_count: number | null
          profile_count: number | null
          style_display: string | null
          style_normalized: string | null
        }
        Relationships: []
      }
      ingredient_usage_stats: {
        Row: {
          id: string | null
          name: string | null
          recipe_count: number | null
          type: string | null
          usage_count: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_clear_trending_override: {
        Args: { brew_id: string }
        Returns: undefined
      }
      admin_get_empty_breweries: {
        Args: never
        Returns: {
          bottle_count: number
          brew_count: number
          created_at: string
          id: string
          member_names: string[]
          name: string
        }[]
      }
      admin_preview_ratings_backfill: {
        Args: never
        Returns: {
          total_unlinked: number
          would_link: number
        }[]
      }
      admin_preview_user_classification: {
        Args: never
        Returns: {
          already_brewer: number
          stay_drinker: number
          total_users: number
          would_become_brewer: number
        }[]
      }
      admin_run_ratings_backfill: { Args: never; Returns: number }
      admin_run_user_classification: { Args: never; Returns: number }
      admin_set_featured: {
        Args: { brew_id: string; featured: boolean }
        Returns: undefined
      }
      admin_set_trending_score: {
        Args: { brew_id: string; new_score: number }
        Returns: undefined
      }
      aggregate_cis_brew_context: { Args: never; Returns: undefined }
      append_timeline_entry: {
        Args: { p_new_entry: Json; p_session_id: string }
        Returns: Json
      }
      calculate_brew_quality_score: {
        Args: { brew_id_param: string }
        Returns: number
      }
      check_and_increment_ai_credits: {
        Args: { user_id: string }
        Returns: Record<string, unknown>
      }
      check_ingredient_duplicate: {
        Args: { p_manufacturer?: string; p_name: string; p_type: string }
        Returns: {
          manufacturer: string
          master_name: string
          product_id: string
          product_name: string
          similarity_score: number
        }[]
      }
      claim_anonymous_session: {
        Args: { p_session_token: string; p_user_id: string }
        Returns: Json
      }
      create_own_squad: { Args: { name_input: string }; Returns: Json }
      dispatch_analytics_report_for_brewery: {
        Args: { p_brewery_id: string }
        Returns: undefined
      }
      dispatch_pending_analytics_reports: { Args: never; Returns: undefined }
      execute_event_clustering: {
        Args: {
          eps_degrees?: number
          lookback_hours?: number
          min_points?: number
          min_sessions?: number
        }
        Returns: number
      }
      expire_subscriptions: {
        Args: never
        Returns: {
          expired_count: number
          expired_user_ids: string[]
        }[]
      }
      generate_short_code: { Args: never; Returns: string }
      get_auth_user_brewery_ids: { Args: never; Returns: string[] }
      get_botlguide_usage_stats: { Args: { p_days?: number }; Returns: Json }
      get_brew_flavor_profile: { Args: { p_brew_id: string }; Returns: Json }
      get_brew_taste_profile: { Args: { p_brew_id: string }; Returns: Json }
      get_collaborative_recommendations:
        | {
            Args: { p_limit?: number; p_user_id: string }
            Returns: {
              brew_id: string
              collab_score: number
            }[]
          }
        | {
            Args: {
              p_diversity_cap?: number
              p_limit?: number
              p_user_id: string
            }
            Returns: {
              brew_id: string
              collab_score: number
            }[]
          }
      get_db_health_stats: { Args: never; Returns: Json }
      get_featured_brews_public: {
        Args: never
        Returns: {
          created_at: string
          id: string
          image_url: string
          likes_count: number
          name: string
          quality_score: number
          style: string
          trending_score: number
        }[]
      }
      get_low_quality_brews: {
        Args: { threshold?: number }
        Returns: {
          created_at: string
          id: string
          image_url: string
          is_featured: boolean
          name: string
          quality_score: number
          style: string
          trending_score: number
        }[]
      }
      get_my_brewery_ids: { Args: never; Returns: string[] }
      get_quality_score_distribution: {
        Args: never
        Returns: {
          bucket: string
          bucket_count: number
        }[]
      }
      get_trending_brews: {
        Args: { limit_count?: number }
        Returns: {
          brew_type: string
          copy_count: number
          created_at: string
          fermentation_type: string
          id: string
          image_url: string
          likes_count: number
          mash_method: string
          moderation_status: string
          name: string
          quality_score: number
          remix_parent_id: string
          style: string
          times_brewed: number
          trending_score: number
          user_id: string
          view_count: number
        }[]
      }
      get_user_brew_context: {
        Args: {
          p_brewery_id?: string
          p_session_id?: string
          p_user_id: string
        }
        Returns: Json
      }
      increment_daily_stats:
        | {
            Args: {
              p_brew_id: string
              p_brewery_id: string
              p_country_code: string
              p_date: string
              p_device_type: string
              p_hour?: number
            }
            Returns: undefined
          }
        | {
            Args: {
              p_brew_id: string
              p_brewery_id: string
              p_country_code: string
              p_date: string
              p_device_type: string
              p_hour?: number
              p_is_new_visitor?: boolean
            }
            Returns: undefined
          }
        | {
            Args: {
              p_brew_id: string
              p_brewery_id: string
              p_country_code: string
              p_date: string
              p_device_type: string
              p_hour?: number
              p_is_logged_in?: boolean
              p_is_new_visitor?: boolean
            }
            Returns: undefined
          }
        | {
            Args: {
              p_brew_id: string
              p_brewery_id: string
              p_country_code: string
              p_date: string
              p_device_type: string
              p_is_unique: boolean
            }
            Returns: undefined
          }
      increment_forum_view_count: {
        Args: { thread_id: string }
        Returns: undefined
      }
      increment_import_queue_count: {
        Args: { p_queue_id: string }
        Returns: undefined
      }
      increment_profile_views: {
        Args: { p_profile_id: string }
        Returns: undefined
      }
      increment_tasting_iq: {
        Args: { p_delta: number; p_user_id: string }
        Returns: number
      }
      is_member_of: { Args: { _brewery_id: string }; Returns: boolean }
      match_ingredient: {
        Args: { search_term: string; search_type: string }
        Returns: {
          alpha_pct: number
          attenuation_pct: number
          color_ebc: number
          master_id: string
          match_level: number
          match_score: number
          name: string
          potential_pts: number
          type: string
        }[]
      }
      match_ingredients_batch: {
        Args: { p_terms: Json }
        Returns: {
          alpha_pct: number
          attenuation_pct: number
          color_ebc: number
          input_index: number
          master_id: string
          match_level: number
          match_score: number
          name: string
          potential_pts: number
          type: string
        }[]
      }
      merge_queue_item: {
        Args: {
          p_alpha_pct?: number
          p_attenuation_pct?: number
          p_beta_pct?: number
          p_color_ebc?: number
          p_manufacturer?: string
          p_master_aliases?: string[]
          p_master_id?: string
          p_master_name?: string
          p_master_type?: string
          p_notes?: string
          p_potential_pts?: number
          p_product_name?: string
          p_queue_id: string
        }
        Returns: Json
      }
      record_brew_page_view: {
        Args: { p_brew_id: string; p_user_id?: string }
        Returns: undefined
      }
      redeem_enterprise_code: {
        Args: { input_code: string; input_user_id: string }
        Returns: Json
      }
      refresh_brew_style_averages: { Args: never; Returns: undefined }
      refresh_brew_style_flavor_averages: { Args: never; Returns: undefined }
      refresh_trending_scores: { Args: never; Returns: undefined }
      reject_queue_item: {
        Args: { p_queue_id: string; p_reason?: string }
        Returns: undefined
      }
      search_botlguide_embeddings: {
        Args: {
          p_match_count?: number
          p_min_similarity?: number
          p_query_embedding: string
          p_source_type?: string
          p_user_id?: string
        }
        Returns: {
          content: string
          id: string
          metadata: Json
          similarity: number
          source_id: string
        }[]
      }
      search_team_knowledge: {
        Args: {
          p_brewery_id: string
          p_match_count?: number
          p_min_similarity?: number
          p_query_embedding: string
        }
        Returns: {
          content: string
          document_id: string
          filename: string
          id: string
          metadata: Json
          similarity: number
        }[]
      }
      set_default_equipment_profile: {
        Args: { p_brewery_id: string; p_profile_id: string }
        Returns: undefined
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      update_active_brewery: {
        Args: { brewery_id: string }
        Returns: undefined
      }
      user_has_liked: {
        Args: { brew_row: Database["public"]["Tables"]["brews"]["Row"] }
        Returns: boolean
      }
    }
    Enums: {
      report_reason: "spam" | "nsfw" | "harassment" | "copyright" | "other"
      report_status: "open" | "resolved" | "dismissed"
      report_target_type:
        | "brew"
        | "user"
        | "brewery"
        | "forum_post"
        | "comment"
        | "forum_thread"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      report_reason: ["spam", "nsfw", "harassment", "copyright", "other"],
      report_status: ["open", "resolved", "dismissed"],
      report_target_type: [
        "brew",
        "user",
        "brewery",
        "forum_post",
        "comment",
        "forum_thread",
      ],
    },
  },
} as const
