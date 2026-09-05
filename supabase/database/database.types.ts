export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
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
      agent_actions: {
        Row: {
          action_name: string
          business_id: string
          conversation_id: string
          error_message: string | null
          executed_at: string
          id: string
          input_data: Json
          output_data: Json | null
          succeeded: boolean | null
        }
        Insert: {
          action_name: string
          business_id: string
          conversation_id: string
          error_message?: string | null
          executed_at?: string
          id?: string
          input_data?: Json
          output_data?: Json | null
          succeeded?: boolean | null
        }
        Update: {
          action_name?: string
          business_id?: string
          conversation_id?: string
          error_message?: string | null
          executed_at?: string
          id?: string
          input_data?: Json
          output_data?: Json | null
          succeeded?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_actions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_actions_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_tools: {
        Row: {
          category: string | null
          code: string
          created_at: string
          description: string
          handler_key: string
          is_active: boolean
          name: string
          parameters_schema: Json
          requires_feature_code: string | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          code: string
          created_at?: string
          description: string
          handler_key: string
          is_active?: boolean
          name: string
          parameters_schema: Json
          requires_feature_code?: string | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          code?: string
          created_at?: string
          description?: string
          handler_key?: string
          is_active?: boolean
          name?: string
          parameters_schema?: Json
          requires_feature_code?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_tools_requires_feature_code_fkey"
            columns: ["requires_feature_code"]
            isOneToOne: false
            referencedRelation: "feature_definitions"
            referencedColumns: ["code"]
          },
        ]
      }
      business_tool_settings: {
        Row: {
          business_id: string
          config: Json
          created_at: string
          enabled: boolean
          tool_code: string
          updated_at: string
        }
        Insert: {
          business_id: string
          config?: Json
          created_at?: string
          enabled?: boolean
          tool_code: string
          updated_at?: string
        }
        Update: {
          business_id?: string
          config?: Json
          created_at?: string
          enabled?: boolean
          tool_code?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_tool_settings_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_tool_settings_tool_code_fkey"
            columns: ["tool_code"]
            isOneToOne: false
            referencedRelation: "agent_tools"
            referencedColumns: ["code"]
          },
        ]
      }
      agent_configs: {
        Row: {
          agent_name: string
          business_id: string
          collect_customer_name: boolean
          collect_customer_phone: boolean
          created_at: string
          elevenlabs_agent_id: string | null
          fallback_message: string
          greeting: string
          id: string
          is_active: boolean
          language_code: string
          llm_model: string
          llm_provider: string
          settings: Json
          show_transcript: boolean
          system_instructions: string | null
          tone: string
          trial_mode: boolean
          updated_at: string
          voice_id: string | null
          voice_provider: string
        }
        Insert: {
          agent_name?: string
          business_id: string
          collect_customer_name?: boolean
          collect_customer_phone?: boolean
          created_at?: string
          elevenlabs_agent_id?: string | null
          fallback_message?: string
          greeting?: string
          id?: string
          is_active?: boolean
          language_code?: string
          llm_model?: string
          llm_provider?: string
          settings?: Json
          show_transcript?: boolean
          system_instructions?: string | null
          tone?: string
          trial_mode?: boolean
          updated_at?: string
          voice_id?: string | null
          voice_provider?: string
        }
        Update: {
          agent_name?: string
          business_id?: string
          collect_customer_name?: boolean
          collect_customer_phone?: boolean
          created_at?: string
          elevenlabs_agent_id?: string | null
          fallback_message?: string
          greeting?: string
          id?: string
          is_active?: boolean
          language_code?: string
          llm_model?: string
          llm_provider?: string
          settings?: Json
          show_transcript?: boolean
          system_instructions?: string | null
          tone?: string
          trial_mode?: boolean
          updated_at?: string
          voice_id?: string | null
          voice_provider?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_configs_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: true
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          business_id: string
          catalog_item_id: string | null
          conversation_id: string | null
          created_at: string
          customer_id: string
          customer_name: string | null
          customer_phone: string | null
          ends_at: string | null
          id: string
          notes: string | null
          party_size: number | null
          resource_name: string | null
          starts_at: string
          status: Database["public"]["Enums"]["booking_status"]
          type: Database["public"]["Enums"]["booking_type"]
          updated_at: string
        }
        Insert: {
          business_id: string
          catalog_item_id?: string | null
          conversation_id?: string | null
          created_at?: string
          customer_id: string
          customer_name?: string | null
          customer_phone?: string | null
          ends_at?: string | null
          id?: string
          notes?: string | null
          party_size?: number | null
          resource_name?: string | null
          starts_at: string
          status?: Database["public"]["Enums"]["booking_status"]
          type: Database["public"]["Enums"]["booking_type"]
          updated_at?: string
        }
        Update: {
          business_id?: string
          catalog_item_id?: string | null
          conversation_id?: string | null
          created_at?: string
          customer_id?: string
          customer_name?: string | null
          customer_phone?: string | null
          ends_at?: string | null
          id?: string
          notes?: string | null
          party_size?: number | null
          resource_name?: string | null
          starts_at?: string
          status?: Database["public"]["Enums"]["booking_status"]
          type?: Database["public"]["Enums"]["booking_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_catalog_item_id_fkey"
            columns: ["catalog_item_id"]
            isOneToOne: false
            referencedRelation: "catalog_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      business_categories: {
        Row: {
          code: string
          description: string | null
          icon: string | null
          is_active: boolean
          name: string
          sort_order: number
        }
        Insert: {
          code: string
          description?: string | null
          icon?: string | null
          is_active?: boolean
          name: string
          sort_order?: number
        }
        Update: {
          code?: string
          description?: string | null
          icon?: string | null
          is_active?: boolean
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      business_features: {
        Row: {
          available_in_trial: boolean
          business_id: string
          configuration: Json
          created_at: string
          enabled: boolean
          feature_code: string
          id: string
          updated_at: string
        }
        Insert: {
          available_in_trial?: boolean
          business_id: string
          configuration?: Json
          created_at?: string
          enabled?: boolean
          feature_code: string
          id?: string
          updated_at?: string
        }
        Update: {
          available_in_trial?: boolean
          business_id?: string
          configuration?: Json
          created_at?: string
          enabled?: boolean
          feature_code?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_features_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_features_feature_code_fkey"
            columns: ["feature_code"]
            isOneToOne: false
            referencedRelation: "feature_definitions"
            referencedColumns: ["code"]
          },
        ]
      }
      business_hours: {
        Row: {
          business_id: string
          closes_at: string | null
          created_at: string
          day_of_week: number
          id: string
          is_closed: boolean
          opens_at: string | null
          updated_at: string
        }
        Insert: {
          business_id: string
          closes_at?: string | null
          created_at?: string
          day_of_week: number
          id?: string
          is_closed?: boolean
          opens_at?: string | null
          updated_at?: string
        }
        Update: {
          business_id?: string
          closes_at?: string | null
          created_at?: string
          day_of_week?: number
          id?: string
          is_closed?: boolean
          opens_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_hours_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      business_members: {
        Row: {
          business_id: string
          budget_period_starts_at: string
          created_at: string
          id: string
          is_active: boolean
          role: Database["public"]["Enums"]["member_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          business_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          role?: Database["public"]["Enums"]["member_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          business_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          role?: Database["public"]["Enums"]["member_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_members_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      business_onboarding: {
        Row: {
          activated_at: string | null
          activation_status: Database["public"]["Enums"]["onboarding_activation_status"]
          business_id: string
          channel_status: Database["public"]["Enums"]["onboarding_channel_status"]
          channel_updated_at: string | null
          completed_at: string | null
          created_at: string
          demo_completed_at: string | null
          flow_status: Database["public"]["Enums"]["onboarding_flow_status"]
          selected_scenario_key: string | null
          selected_voice_id: string | null
          template_version: string
          updated_at: string
        }
        Insert: {
          activated_at?: string | null
          activation_status?: Database["public"]["Enums"]["onboarding_activation_status"]
          business_id: string
          channel_status?: Database["public"]["Enums"]["onboarding_channel_status"]
          channel_updated_at?: string | null
          completed_at?: string | null
          created_at?: string
          demo_completed_at?: string | null
          flow_status?: Database["public"]["Enums"]["onboarding_flow_status"]
          selected_scenario_key?: string | null
          selected_voice_id?: string | null
          template_version?: string
          updated_at?: string
        }
        Update: {
          activated_at?: string | null
          activation_status?: Database["public"]["Enums"]["onboarding_activation_status"]
          business_id?: string
          channel_status?: Database["public"]["Enums"]["onboarding_channel_status"]
          channel_updated_at?: string | null
          completed_at?: string | null
          created_at?: string
          demo_completed_at?: string | null
          flow_status?: Database["public"]["Enums"]["onboarding_flow_status"]
          selected_scenario_key?: string | null
          selected_voice_id?: string | null
          template_version?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_onboarding_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: true
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      business_plans: {
        Row: {
          business_id: string
          created_at: string
          current_period_ends_at: string | null
          current_period_starts_at: string | null
          customer_demo_seconds_per_user: number
          included_budget_usd: number
          included_voice_seconds: number
          max_customer_demo_sessions: number
          owner_demo_seconds: number
          plan_code: string
          status: Database["public"]["Enums"]["plan_status"]
          trial_ends_at: string
          trial_starts_at: string
          updated_at: string
          used_budget_usd: number
          used_voice_seconds: number
        }
        Insert: {
          business_id: string
          budget_period_starts_at?: string
          created_at?: string
          current_period_ends_at?: string | null
          current_period_starts_at?: string | null
          customer_demo_seconds_per_user?: number
          included_budget_usd?: number
          included_voice_seconds?: number
          max_customer_demo_sessions?: number
          owner_demo_seconds?: number
          plan_code?: string
          status?: Database["public"]["Enums"]["plan_status"]
          trial_ends_at?: string
          trial_starts_at?: string
          updated_at?: string
          used_budget_usd?: number
          used_voice_seconds?: number
        }
        Update: {
          business_id?: string
          budget_period_starts_at?: string
          created_at?: string
          current_period_ends_at?: string | null
          current_period_starts_at?: string | null
          customer_demo_seconds_per_user?: number
          included_budget_usd?: number
          included_voice_seconds?: number
          max_customer_demo_sessions?: number
          owner_demo_seconds?: number
          plan_code?: string
          status?: Database["public"]["Enums"]["plan_status"]
          trial_ends_at?: string
          trial_starts_at?: string
          updated_at?: string
          used_budget_usd?: number
          used_voice_seconds?: number
        }
        Relationships: [
          {
            foreignKeyName: "business_plans_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: true
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      businesses: {
        Row: {
          accepts_online_bookings: boolean
          accepts_online_orders: boolean
          address: string | null
          billing_email: string | null
          category_code: string
          city: string | null
          country_code: string
          cover_url: string | null
          created_at: string
          currency: string
          description: string | null
          email: string | null
          id: string
          is_listed: boolean
          latitude: number | null
          legal_name: string | null
          logo_url: string | null
          longitude: number | null
          metadata: Json
          name: string
          owner_id: string
          phone: string | null
          province: string | null
          slug: string
          status: Database["public"]["Enums"]["business_status"]
          tax_id: string | null
          timezone: string
          updated_at: string
          website_url: string | null
          whatsapp_phone: string | null
        }
        Insert: {
          accepts_online_bookings?: boolean
          accepts_online_orders?: boolean
          address?: string | null
          billing_email?: string | null
          category_code: string
          city?: string | null
          country_code?: string
          cover_url?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          email?: string | null
          id?: string
          is_listed?: boolean
          latitude?: number | null
          legal_name?: string | null
          logo_url?: string | null
          longitude?: number | null
          metadata?: Json
          name: string
          owner_id: string
          phone?: string | null
          province?: string | null
          slug: string
          status?: Database["public"]["Enums"]["business_status"]
          tax_id?: string | null
          timezone?: string
          updated_at?: string
          website_url?: string | null
          whatsapp_phone?: string | null
        }
        Update: {
          accepts_online_bookings?: boolean
          accepts_online_orders?: boolean
          address?: string | null
          billing_email?: string | null
          category_code?: string
          city?: string | null
          country_code?: string
          cover_url?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          email?: string | null
          id?: string
          is_listed?: boolean
          latitude?: number | null
          legal_name?: string | null
          logo_url?: string | null
          longitude?: number | null
          metadata?: Json
          name?: string
          owner_id?: string
          phone?: string | null
          province?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["business_status"]
          tax_id?: string | null
          timezone?: string
          updated_at?: string
          website_url?: string | null
          whatsapp_phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "businesses_category_code_fkey"
            columns: ["category_code"]
            isOneToOne: false
            referencedRelation: "business_categories"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "businesses_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      catalog_categories: {
        Row: {
          business_id: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "catalog_categories_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      catalog_items: {
        Row: {
          business_id: string
          category_id: string | null
          created_at: string
          description: string | null
          duration_minutes: number | null
          id: string
          image_url: string | null
          is_available: boolean
          is_demo: boolean
          kind: Database["public"]["Enums"]["item_kind"]
          metadata: Json
          name: string
          price: number
          sale_price: number | null
          sku: string | null
          sort_order: number
          stock_quantity: number
          template_key: string | null
          track_stock: boolean
          updated_at: string
        }
        Insert: {
          business_id: string
          category_id?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          image_url?: string | null
          is_available?: boolean
          is_demo?: boolean
          kind?: Database["public"]["Enums"]["item_kind"]
          metadata?: Json
          name: string
          price?: number
          sale_price?: number | null
          sku?: string | null
          sort_order?: number
          stock_quantity?: number
          template_key?: string | null
          track_stock?: boolean
          updated_at?: string
        }
        Update: {
          business_id?: string
          category_id?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          image_url?: string | null
          is_available?: boolean
          is_demo?: boolean
          kind?: Database["public"]["Enums"]["item_kind"]
          metadata?: Json
          name?: string
          price?: number
          sale_price?: number | null
          sku?: string | null
          sort_order?: number
          stock_quantity?: number
          template_key?: string | null
          track_stock?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "catalog_items_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalog_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "catalog_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_messages: {
        Row: {
          audio_url: string | null
          content: string | null
          conversation_id: string
          created_at: string
          id: string
          latency_ms: number | null
          metadata: Json
          role: Database["public"]["Enums"]["message_role"]
          sequence_number: number
        }
        Insert: {
          audio_url?: string | null
          content?: string | null
          conversation_id: string
          created_at?: string
          id?: string
          latency_ms?: number | null
          metadata?: Json
          role: Database["public"]["Enums"]["message_role"]
          sequence_number: number
        }
        Update: {
          audio_url?: string | null
          content?: string | null
          conversation_id?: string
          created_at?: string
          id?: string
          latency_ms?: number | null
          metadata?: Json
          role?: Database["public"]["Enums"]["message_role"]
          sequence_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "conversation_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          business_id: string
          channel: Database["public"]["Enums"]["conversation_channel"]
          created_at: string
          customer_id: string | null
          customer_name: string | null
          customer_phone: string | null
          duration_seconds: number
          ended_at: string | null
          external_conversation_id: string | null
          id: string
          is_trial: boolean
          metadata: Json
          outcome: string | null
          started_at: string
          status: Database["public"]["Enums"]["conversation_status"]
          summary: string | null
          updated_at: string
        }
        Insert: {
          business_id: string
          channel?: Database["public"]["Enums"]["conversation_channel"]
          created_at?: string
          customer_id?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          duration_seconds?: number
          ended_at?: string | null
          external_conversation_id?: string | null
          id?: string
          is_trial?: boolean
          metadata?: Json
          outcome?: string | null
          started_at?: string
          status?: Database["public"]["Enums"]["conversation_status"]
          summary?: string | null
          updated_at?: string
        }
        Update: {
          business_id?: string
          channel?: Database["public"]["Enums"]["conversation_channel"]
          created_at?: string
          customer_id?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          duration_seconds?: number
          ended_at?: string | null
          external_conversation_id?: string | null
          id?: string
          is_trial?: boolean
          metadata?: Json
          outcome?: string | null
          started_at?: string
          status?: Database["public"]["Enums"]["conversation_status"]
          summary?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_definitions: {
        Row: {
          code: string
          description: string | null
          name: string
          sort_order: number
        }
        Insert: {
          code: string
          description?: string | null
          name: string
          sort_order?: number
        }
        Update: {
          code?: string
          description?: string | null
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      knowledge_gaps: {
        Row: {
          business_id: string
          conversation_id: string | null
          created_at: string
          customer_question: string
          id: string
          resolved_at: string | null
          resolved_by: string | null
          status: string
          suggested_answer: string | null
          updated_at: string
        }
        Insert: {
          business_id: string
          conversation_id?: string | null
          created_at?: string
          customer_question: string
          id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          suggested_answer?: string | null
          updated_at?: string
        }
        Update: {
          business_id?: string
          conversation_id?: string | null
          created_at?: string
          customer_question?: string
          id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          suggested_answer?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_gaps_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_gaps_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_gaps_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_items: {
        Row: {
          answer: string
          business_id: string
          created_at: string
          id: string
          is_active: boolean
          is_demo: boolean
          kind: string
          priority: number
          question: string | null
          template_key: string | null
          title: string
          updated_at: string
        }
        Insert: {
          answer: string
          business_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_demo?: boolean
          kind?: string
          priority?: number
          question?: string | null
          template_key?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          answer?: string
          business_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_demo?: boolean
          kind?: string
          priority?: number
          question?: string | null
          template_key?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_items_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          base_amount_usd: number
          business_id: string
          created_at: string
          id: string
          included_budget_usd: number
          marked_paid_by: string | null
          notes: string | null
          overage_amount_usd: number
          paid_at: string | null
          payment_method: string | null
          payment_reference: string | null
          period_ends_at: string
          period_starts_at: string
          plan_code: string
          status: string
          total_amount_usd: number
          updated_at: string
          usage_cost_usd: number
        }
        Insert: {
          base_amount_usd: number
          business_id: string
          created_at?: string
          id?: string
          included_budget_usd: number
          marked_paid_by?: string | null
          notes?: string | null
          overage_amount_usd?: number
          paid_at?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          period_ends_at: string
          period_starts_at: string
          plan_code: string
          status?: string
          total_amount_usd: number
          updated_at?: string
          usage_cost_usd?: number
        }
        Update: {
          base_amount_usd?: number
          business_id?: string
          created_at?: string
          id?: string
          included_budget_usd?: number
          marked_paid_by?: string | null
          notes?: string | null
          overage_amount_usd?: number
          paid_at?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          period_ends_at?: string
          period_starts_at?: string
          plan_code?: string
          status?: string
          total_amount_usd?: number
          updated_at?: string
          usage_cost_usd?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoices_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_marked_paid_by_fkey"
            columns: ["marked_paid_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_plan_code_fkey"
            columns: ["plan_code"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["code"]
          },
        ]
      }
      order_items: {
        Row: {
          catalog_item_id: string | null
          created_at: string
          id: string
          item_name_snapshot: string
          line_total: number
          modifiers: Json
          notes: string | null
          order_id: string
          quantity: number
          unit_price: number
          updated_at: string
        }
        Insert: {
          catalog_item_id?: string | null
          created_at?: string
          id?: string
          item_name_snapshot?: string
          line_total?: number
          modifiers?: Json
          notes?: string | null
          order_id: string
          quantity?: number
          unit_price?: number
          updated_at?: string
        }
        Update: {
          catalog_item_id?: string | null
          created_at?: string
          id?: string
          item_name_snapshot?: string
          line_total?: number
          modifiers?: Json
          notes?: string | null
          order_id?: string
          quantity?: number
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_items_catalog_item_id_fkey"
            columns: ["catalog_item_id"]
            isOneToOne: false
            referencedRelation: "catalog_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          business_id: string
          conversation_id: string | null
          created_at: string
          customer_id: string
          customer_name: string | null
          customer_phone: string | null
          delivery_address: string | null
          delivery_fee: number
          discount: number
          fulfillment: Database["public"]["Enums"]["fulfillment_type"]
          id: string
          notes: string | null
          order_number: number
          payment_method: string | null
          payment_status: string
          requested_for: string | null
          status: Database["public"]["Enums"]["order_status"]
          subtotal: number
          total: number
          updated_at: string
        }
        Insert: {
          business_id: string
          conversation_id?: string | null
          created_at?: string
          customer_id: string
          customer_name?: string | null
          customer_phone?: string | null
          delivery_address?: string | null
          delivery_fee?: number
          discount?: number
          fulfillment?: Database["public"]["Enums"]["fulfillment_type"]
          id?: string
          notes?: string | null
          order_number?: number
          payment_method?: string | null
          payment_status?: string
          requested_for?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          total?: number
          updated_at?: string
        }
        Update: {
          business_id?: string
          conversation_id?: string | null
          created_at?: string
          customer_id?: string
          customer_name?: string | null
          customer_phone?: string | null
          delivery_address?: string | null
          delivery_fee?: number
          discount?: number
          fulfillment?: Database["public"]["Enums"]["fulfillment_type"]
          id?: string
          notes?: string | null
          order_number?: number
          payment_method?: string | null
          payment_status?: string
          requested_for?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          base_price_usd: number
          billing_period_days: number
          code: string
          created_at: string
          included_budget_usd: number
          is_active: boolean
          name: string
          overage_multiplier: number
          updated_at: string
        }
        Insert: {
          base_price_usd: number
          billing_period_days?: number
          code: string
          created_at?: string
          included_budget_usd: number
          is_active?: boolean
          name: string
          overage_multiplier?: number
          updated_at?: string
        }
        Update: {
          base_price_usd?: number
          billing_period_days?: number
          code?: string
          created_at?: string
          included_budget_usd?: number
          is_active?: boolean
          name?: string
          overage_multiplier?: number
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          account_role: Database["public"]["Enums"]["account_role"]
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          is_active: boolean
          phone: string | null
          updated_at: string
        }
        Insert: {
          account_role?: Database["public"]["Enums"]["account_role"]
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          is_active?: boolean
          phone?: string | null
          updated_at?: string
        }
        Update: {
          account_role?: Database["public"]["Enums"]["account_role"]
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      promotion_items: {
        Row: {
          catalog_item_id: string
          promotion_id: string
        }
        Insert: {
          catalog_item_id: string
          promotion_id: string
        }
        Update: {
          catalog_item_id?: string
          promotion_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "promotion_items_catalog_item_id_fkey"
            columns: ["catalog_item_id"]
            isOneToOne: false
            referencedRelation: "catalog_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotion_items_promotion_id_fkey"
            columns: ["promotion_id"]
            isOneToOne: false
            referencedRelation: "promotions"
            referencedColumns: ["id"]
          },
        ]
      }
      promotions: {
        Row: {
          business_id: string
          created_at: string
          description: string | null
          discount_type: string
          discount_value: number | null
          ends_at: string | null
          id: string
          is_active: boolean
          name: string
          starts_at: string | null
          terms: string | null
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          description?: string | null
          discount_type?: string
          discount_value?: number | null
          ends_at?: string | null
          id?: string
          is_active?: boolean
          name: string
          starts_at?: string | null
          terms?: string | null
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          description?: string | null
          discount_type?: string
          discount_value?: number | null
          ends_at?: string | null
          id?: string
          is_active?: boolean
          name?: string
          starts_at?: string | null
          terms?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "promotions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      trial_allowances: {
        Row: {
          allowed_seconds: number
          audience: string
          business_id: string
          created_at: string
          expires_at: string | null
          id: string
          session_count: number
          updated_at: string
          used_seconds: number
          user_id: string
        }
        Insert: {
          allowed_seconds: number
          audience: string
          business_id: string
          created_at?: string
          expires_at?: string | null
          id?: string
          session_count?: number
          updated_at?: string
          used_seconds?: number
          user_id: string
        }
        Update: {
          allowed_seconds?: number
          audience?: string
          business_id?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          session_count?: number
          updated_at?: string
          used_seconds?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trial_allowances_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trial_allowances_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      usage_ledger: {
        Row: {
          business_id: string
          conversation_id: string | null
          created_at: string
          estimated_cost_usd: number
          id: string
          kind: Database["public"]["Enums"]["usage_kind"]
          metadata: Json
          provider: string | null
          quantity: number
          user_id: string | null
        }
        Insert: {
          business_id: string
          conversation_id?: string | null
          created_at?: string
          estimated_cost_usd?: number
          id?: string
          kind: Database["public"]["Enums"]["usage_kind"]
          metadata?: Json
          provider?: string | null
          quantity: number
          user_id?: string | null
        }
        Update: {
          business_id?: string
          conversation_id?: string | null
          created_at?: string
          estimated_cost_usd?: number
          id?: string
          kind?: Database["public"]["Enums"]["usage_kind"]
          metadata?: Json
          provider?: string | null
          quantity?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "usage_ledger_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usage_ledger_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usage_ledger_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_connections: {
        Row: {
          access_token: string
          business_id: string
          connected_by: string | null
          contacts_sync_status: string
          created_at: string
          history_sync_status: string
          id: string
          is_on_biz_app: boolean
          last_meta_error: string | null
          meta_business_id: string | null
          onboarding_flow: string
          phone_number: string | null
          phone_number_id: string
          phone_registered_at: string | null
          platform_type: string | null
          registration_status: string
          status: string
          token_expires_at: string | null
          updated_at: string
          verified_name: string | null
          waba_id: string
          waba_name: string | null
          webhook_subscribed_at: string | null
        }
        Insert: {
          access_token: string
          business_id: string
          connected_by?: string | null
          contacts_sync_status?: string
          created_at?: string
          history_sync_status?: string
          id?: string
          is_on_biz_app?: boolean
          last_meta_error?: string | null
          meta_business_id?: string | null
          onboarding_flow?: string
          phone_number?: string | null
          phone_number_id: string
          phone_registered_at?: string | null
          platform_type?: string | null
          registration_status?: string
          status?: string
          token_expires_at?: string | null
          updated_at?: string
          verified_name?: string | null
          waba_id: string
          waba_name?: string | null
          webhook_subscribed_at?: string | null
        }
        Update: {
          access_token?: string
          business_id?: string
          connected_by?: string | null
          contacts_sync_status?: string
          created_at?: string
          history_sync_status?: string
          id?: string
          is_on_biz_app?: boolean
          last_meta_error?: string | null
          meta_business_id?: string | null
          onboarding_flow?: string
          phone_number?: string | null
          phone_number_id?: string
          phone_registered_at?: string | null
          platform_type?: string | null
          registration_status?: string
          status?: string
          token_expires_at?: string | null
          updated_at?: string
          verified_name?: string | null
          waba_id?: string
          waba_name?: string | null
          webhook_subscribed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_connections_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: true
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_contacts: {
        Row: {
          business_id: string
          created_at: string
          first_name: string | null
          full_name: string | null
          id: string
          last_synced_at: string
          phone_number: string
          status: string
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          first_name?: string | null
          full_name?: string | null
          id?: string
          last_synced_at?: string
          phone_number: string
          status?: string
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          first_name?: string | null
          full_name?: string | null
          id?: string
          last_synced_at?: string
          phone_number?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_contacts_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_messages: {
        Row: {
          business_id: string
          conversation_id: string | null
          created_at: string
          direction: string
          from_phone: string
          id: string
          message_type: string
          phone_number_id: string
          provider_message_id: string
          provider_payload: Json
          response_message_id: string | null
          status: string
          text_body: string | null
          to_phone: string | null
          updated_at: string
        }
        Insert: {
          business_id: string
          conversation_id?: string | null
          created_at?: string
          direction: string
          from_phone: string
          id?: string
          message_type?: string
          phone_number_id: string
          provider_message_id: string
          provider_payload?: Json
          response_message_id?: string | null
          status?: string
          text_body?: string | null
          to_phone?: string | null
          updated_at?: string
        }
        Update: {
          business_id?: string
          conversation_id?: string | null
          created_at?: string
          direction?: string
          from_phone?: string
          id?: string
          message_type?: string
          phone_number_id?: string
          provider_message_id?: string
          provider_payload?: Json
          response_message_id?: string | null
          status?: string
          text_body?: string | null
          to_phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_messages_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_access_order: { Args: { target_order_id: string }; Returns: boolean }
      can_manage_business: {
        Args: { target_business_id: string }
        Returns: boolean
      }
      can_modify_order: { Args: { target_order_id: string }; Returns: boolean }
      can_view_business: {
        Args: { target_business_id: string }
        Returns: boolean
      }
      close_billing_period_and_create_invoice: {
        Args: { p_business_id: string; p_now?: string }
        Returns: Database["public"]["Tables"]["invoices"]["Row"]
      }
      create_business_for_current_user: {
        Args: {
          p_address?: string
          p_category_code: string
          p_city?: string
          p_description?: string
          p_email?: string
          p_name: string
          p_phone?: string
          p_province?: string
          p_slug?: string
          p_website_url?: string
          p_whatsapp_phone?: string
        }
        Returns: {
          accepts_online_bookings: boolean
          accepts_online_orders: boolean
          address: string | null
          billing_email: string | null
          category_code: string
          city: string | null
          country_code: string
          cover_url: string | null
          created_at: string
          currency: string
          description: string | null
          email: string | null
          id: string
          is_listed: boolean
          latitude: number | null
          legal_name: string | null
          logo_url: string | null
          longitude: number | null
          metadata: Json
          name: string
          owner_id: string
          phone: string | null
          province: string | null
          slug: string
          status: Database["public"]["Enums"]["business_status"]
          tax_id: string | null
          timezone: string
          updated_at: string
          website_url: string | null
          whatsapp_phone: string | null
        }
        SetofOptions: {
          from: "*"
          to: "businesses"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_subscription_invoice: {
        Args: { p_business_id: string; p_now?: string; p_plan_code: string }
        Returns: Database["public"]["Tables"]["invoices"]["Row"]
      }
      enforce_billing_grace_period: {
        Args: { p_grace_days?: number; p_now?: string }
        Returns: number
      }
      is_admin: { Args: never; Returns: boolean }
      is_public_business: {
        Args: { target_business_id: string }
        Returns: boolean
      }
      mark_invoice_paid: {
        Args: {
          p_admin_user_id: string
          p_invoice_id: string
          p_now?: string
          p_payment_method?: string
          p_payment_reference?: string
        }
        Returns: Database["public"]["Tables"]["invoices"]["Row"]
      }
    }
    Enums: {
      account_role: "client" | "business_owner" | "admin"
      booking_status:
        | "pending"
        | "confirmed"
        | "completed"
        | "cancelled"
        | "no_show"
      booking_type: "appointment" | "reservation"
      business_status: "draft" | "trial" | "active" | "paused" | "suspended"
      conversation_channel:
        | "web_voice"
        | "web_chat"
        | "whatsapp_voice"
        | "whatsapp_chat"
        | "phone"
      conversation_status:
        | "active"
        | "completed"
        | "transferred"
        | "abandoned"
        | "failed"
      fulfillment_type: "delivery" | "pickup" | "onsite"
      item_kind: "product" | "service"
      member_role: "owner" | "manager" | "staff" | "viewer"
      message_role: "customer" | "assistant" | "system" | "human_agent" | "tool"
      onboarding_activation_status: "preparing" | "ready" | "active"
      onboarding_channel_status: "pending" | "skipped" | "connected"
      onboarding_flow_status:
        | "business_created"
        | "demo_completed"
        | "channel_skipped"
        | "channel_connected"
        | "onboarding_completed"
      order_status:
        | "pending"
        | "confirmed"
        | "preparing"
        | "ready"
        | "completed"
        | "cancelled"
      plan_status: "trial" | "active" | "past_due" | "cancelled" | "suspended"
      usage_kind:
        | "voice_seconds"
        | "llm_tokens"
        | "messages"
        | "openai_input_tokens"
        | "openai_output_tokens"
        | "openai_audio_input_tokens"
        | "elevenlabs_characters"
        | "catalog_import"
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
      account_role: ["client", "business_owner", "admin"],
      booking_status: [
        "pending",
        "confirmed",
        "completed",
        "cancelled",
        "no_show",
      ],
      booking_type: ["appointment", "reservation"],
      business_status: ["draft", "trial", "active", "paused", "suspended"],
      conversation_channel: [
        "web_voice",
        "web_chat",
        "whatsapp_voice",
        "whatsapp_chat",
        "phone",
      ],
      conversation_status: [
        "active",
        "completed",
        "transferred",
        "abandoned",
        "failed",
      ],
      fulfillment_type: ["delivery", "pickup", "onsite"],
      item_kind: ["product", "service"],
      member_role: ["owner", "manager", "staff", "viewer"],
      message_role: ["customer", "assistant", "system", "human_agent", "tool"],
      onboarding_activation_status: ["preparing", "ready", "active"],
      onboarding_channel_status: ["pending", "skipped", "connected"],
      onboarding_flow_status: [
        "business_created",
        "demo_completed",
        "channel_skipped",
        "channel_connected",
        "onboarding_completed",
      ],
      order_status: [
        "pending",
        "confirmed",
        "preparing",
        "ready",
        "completed",
        "cancelled",
      ],
      plan_status: ["trial", "active", "past_due", "cancelled", "suspended"],
      usage_kind: [
        "voice_seconds",
        "llm_tokens",
        "messages",
        "openai_input_tokens",
        "openai_output_tokens",
        "openai_audio_input_tokens",
        "elevenlabs_characters",
        "catalog_import",
      ],
    },
  },
} as const
