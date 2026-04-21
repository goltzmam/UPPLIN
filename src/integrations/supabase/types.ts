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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      admin_action_logs: {
        Row: {
          action_type: string
          admin_user_id: string
          created_at: string
          id: string
          metadata: Json | null
          reason: string | null
          target_id: string
          target_type: string
        }
        Insert: {
          action_type: string
          admin_user_id: string
          created_at?: string
          id?: string
          metadata?: Json | null
          reason?: string | null
          target_id: string
          target_type: string
        }
        Update: {
          action_type?: string
          admin_user_id?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          reason?: string | null
          target_id?: string
          target_type?: string
        }
        Relationships: []
      }
      checkin_collaborators: {
        Row: {
          created_at: string
          display_name: string
          event_id: string | null
          id: string
          organizer_id: string
          revoked_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string
          event_id?: string | null
          id?: string
          organizer_id: string
          revoked_at?: string | null
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string
          event_id?: string | null
          id?: string
          organizer_id?: string
          revoked_at?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "checkin_collaborators_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkin_collaborators_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "organizer_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          event_id: string | null
          id: string
          participant_1_id: string
          participant_2_id: string
          status: string
          subject: string | null
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          event_id?: string | null
          id?: string
          participant_1_id: string
          participant_2_id: string
          status?: string
          subject?: string | null
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          event_id?: string | null
          id?: string
          participant_1_id?: string
          participant_2_id?: string
          status?: string
          subject?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          code: string
          created_at: string | null
          discount_type: string
          discount_value: number
          event_id: string | null
          id: string
          is_active: boolean | null
          min_purchase_cents: number | null
          organizer_id: string
          updated_at: string | null
          usage_count: number | null
          usage_limit: number | null
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          discount_type: string
          discount_value: number
          event_id?: string | null
          id?: string
          is_active?: boolean | null
          min_purchase_cents?: number | null
          organizer_id: string
          updated_at?: string | null
          usage_count?: number | null
          usage_limit?: number | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          discount_type?: string
          discount_value?: number
          event_id?: string | null
          id?: string
          is_active?: boolean | null
          min_purchase_cents?: number | null
          organizer_id?: string
          updated_at?: string | null
          usage_count?: number | null
          usage_limit?: number | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coupons_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupons_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "organizer_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      cpf_change_requests: {
        Row: {
          created_at: string | null
          current_cpf: string | null
          id: string
          reason: string | null
          requested_cpf: string
          status: Database["public"]["Enums"]["cpf_request_status"] | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          current_cpf?: string | null
          id?: string
          reason?: string | null
          requested_cpf: string
          status?: Database["public"]["Enums"]["cpf_request_status"] | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          current_cpf?: string | null
          id?: string
          reason?: string | null
          requested_cpf?: string
          status?: Database["public"]["Enums"]["cpf_request_status"] | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      event_comments: {
        Row: {
          content: string
          created_at: string
          event_id: string
          id: string
          parent_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          event_id: string
          id?: string
          parent_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          event_id?: string
          id?: string
          parent_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_comments_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "event_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      event_likes: {
        Row: {
          created_at: string
          event_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      event_media: {
        Row: {
          created_at: string | null
          event_id: string
          id: string
          sort_order: number | null
          type: Database["public"]["Enums"]["media_type"]
          url: string
        }
        Insert: {
          created_at?: string | null
          event_id: string
          id?: string
          sort_order?: number | null
          type: Database["public"]["Enums"]["media_type"]
          url: string
        }
        Update: {
          created_at?: string | null
          event_id?: string
          id?: string
          sort_order?: number | null
          type?: Database["public"]["Enums"]["media_type"]
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_media_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_reviews: {
        Row: {
          comment: string | null
          created_at: string
          event_id: string
          id: string
          rating: number
          updated_at: string
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          event_id: string
          id?: string
          rating: number
          updated_at?: string
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          event_id?: string
          id?: string
          rating?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_reviews_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_rsvps: {
        Row: {
          created_at: string
          event_id: string
          id: string
          is_public: boolean
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          is_public?: boolean
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          is_public?: boolean
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_rsvps_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          address_text: string | null
          category: string | null
          commission_percent_snapshot: number | null
          cover_image_url: string | null
          created_at: string | null
          description: string | null
          end_at: string | null
          featured_until: string | null
          id: string
          is_featured: boolean | null
          is_sponsored: boolean | null
          lat: number | null
          lng: number | null
          organizer_id: string
          slug: string | null
          start_at: string
          status: Database["public"]["Enums"]["event_status"] | null
          title: string
          updated_at: string | null
          venue_name: string | null
        }
        Insert: {
          address_text?: string | null
          category?: string | null
          commission_percent_snapshot?: number | null
          cover_image_url?: string | null
          created_at?: string | null
          description?: string | null
          end_at?: string | null
          featured_until?: string | null
          id?: string
          is_featured?: boolean | null
          is_sponsored?: boolean | null
          lat?: number | null
          lng?: number | null
          organizer_id: string
          slug?: string | null
          start_at: string
          status?: Database["public"]["Enums"]["event_status"] | null
          title: string
          updated_at?: string | null
          venue_name?: string | null
        }
        Update: {
          address_text?: string | null
          category?: string | null
          commission_percent_snapshot?: number | null
          cover_image_url?: string | null
          created_at?: string | null
          description?: string | null
          end_at?: string | null
          featured_until?: string | null
          id?: string
          is_featured?: boolean | null
          is_sponsored?: boolean | null
          lat?: number | null
          lng?: number | null
          organizer_id?: string
          slug?: string | null
          start_at?: string
          status?: Database["public"]["Enums"]["event_status"] | null
          title?: string
          updated_at?: string | null
          venue_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "organizer_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      follows: {
        Row: {
          created_at: string
          id: string
          organizer_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organizer_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organizer_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "follows_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "organizer_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          read_at: string | null
          sender_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          data: Json | null
          id: string
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          data?: Json | null
          id?: string
          read_at?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          data?: Json | null
          id?: string
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string | null
          id: string
          order_id: string
          qty: number
          ticket_type_id: string
          unit_price_cents: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          order_id: string
          qty?: number
          ticket_type_id: string
          unit_price_cents: number
        }
        Update: {
          created_at?: string | null
          id?: string
          order_id?: string
          qty?: number
          ticket_type_id?: string
          unit_price_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_ticket_type_id_fkey"
            columns: ["ticket_type_id"]
            isOneToOne: false
            referencedRelation: "ticket_types"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          buyer_user_id: string
          commission_cents: number | null
          created_at: string | null
          event_id: string
          expires_at: string | null
          id: string
          mp_payment_id: string | null
          mp_preference_id: string | null
          status: Database["public"]["Enums"]["order_status"] | null
          total_cents: number
          updated_at: string | null
        }
        Insert: {
          buyer_user_id: string
          commission_cents?: number | null
          created_at?: string | null
          event_id: string
          expires_at?: string | null
          id?: string
          mp_payment_id?: string | null
          mp_preference_id?: string | null
          status?: Database["public"]["Enums"]["order_status"] | null
          total_cents?: number
          updated_at?: string | null
        }
        Update: {
          buyer_user_id?: string
          commission_cents?: number | null
          created_at?: string | null
          event_id?: string
          expires_at?: string | null
          id?: string
          mp_payment_id?: string | null
          mp_preference_id?: string | null
          status?: Database["public"]["Enums"]["order_status"] | null
          total_cents?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      organizer_accounts: {
        Row: {
          cep: string | null
          city: string | null
          cnpj: string | null
          commission_percent: number
          complement: string | null
          cpf: string | null
          created_at: string | null
          description: string | null
          display_name: string
          email: string | null
          id: string
          logo_url: string | null
          neighborhood: string | null
          owner_user_id: string
          phone: string | null
          slug: string | null
          social_facebook: string | null
          social_instagram: string | null
          social_website: string | null
          state: string | null
          status: Database["public"]["Enums"]["organizer_status"] | null
          street: string | null
          street_number: string | null
          updated_at: string | null
        }
        Insert: {
          cep?: string | null
          city?: string | null
          cnpj?: string | null
          commission_percent?: number
          complement?: string | null
          cpf?: string | null
          created_at?: string | null
          description?: string | null
          display_name: string
          email?: string | null
          id?: string
          logo_url?: string | null
          neighborhood?: string | null
          owner_user_id: string
          phone?: string | null
          slug?: string | null
          social_facebook?: string | null
          social_instagram?: string | null
          social_website?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["organizer_status"] | null
          street?: string | null
          street_number?: string | null
          updated_at?: string | null
        }
        Update: {
          cep?: string | null
          city?: string | null
          cnpj?: string | null
          commission_percent?: number
          complement?: string | null
          cpf?: string | null
          created_at?: string | null
          description?: string | null
          display_name?: string
          email?: string | null
          id?: string
          logo_url?: string | null
          neighborhood?: string | null
          owner_user_id?: string
          phone?: string | null
          slug?: string | null
          social_facebook?: string | null
          social_instagram?: string | null
          social_website?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["organizer_status"] | null
          street?: string | null
          street_number?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      organizer_mp_accounts: {
        Row: {
          connected_at: string
          id: string
          mp_access_token: string
          mp_email: string | null
          mp_public_key: string | null
          mp_refresh_token: string | null
          mp_user_id: string
          organizer_id: string
          updated_at: string
        }
        Insert: {
          connected_at?: string
          id?: string
          mp_access_token: string
          mp_email?: string | null
          mp_public_key?: string | null
          mp_refresh_token?: string | null
          mp_user_id: string
          organizer_id: string
          updated_at?: string
        }
        Update: {
          connected_at?: string
          id?: string
          mp_access_token?: string
          mp_email?: string | null
          mp_public_key?: string | null
          mp_refresh_token?: string | null
          mp_user_id?: string
          organizer_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organizer_mp_accounts_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: true
            referencedRelation: "organizer_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      organizer_subscriptions: {
        Row: {
          created_at: string
          current_period_end: string | null
          current_period_start: string
          id: string
          mp_subscription_id: string | null
          organizer_id: string
          plan_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string
          id?: string
          mp_subscription_id?: string | null
          organizer_id: string
          plan_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string
          id?: string
          mp_subscription_id?: string | null
          organizer_id?: string
          plan_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organizer_subscriptions_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: true
            referencedRelation: "organizer_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organizer_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount_cents: number
          created_at: string | null
          id: string
          method: string | null
          order_id: string
          provider: string
          provider_payment_id: string | null
          raw: Json | null
          status: Database["public"]["Enums"]["payment_status"] | null
          updated_at: string | null
        }
        Insert: {
          amount_cents: number
          created_at?: string | null
          id?: string
          method?: string | null
          order_id: string
          provider: string
          provider_payment_id?: string | null
          raw?: Json | null
          status?: Database["public"]["Enums"]["payment_status"] | null
          updated_at?: string | null
        }
        Update: {
          amount_cents?: number
          created_at?: string | null
          id?: string
          method?: string | null
          order_id?: string
          provider?: string
          provider_payment_id?: string | null
          raw?: Json | null
          status?: Database["public"]["Enums"]["payment_status"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          city: string | null
          cover_photo_url: string | null
          cpf: string | null
          cpf_locked: boolean | null
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          photo_url: string | null
          state: string | null
          status: string | null
          suspended_at: string | null
          suspended_by: string | null
          suspended_reason: string | null
          updated_at: string | null
        }
        Insert: {
          city?: string | null
          cover_photo_url?: string | null
          cpf?: string | null
          cpf_locked?: boolean | null
          created_at?: string | null
          email: string
          full_name?: string | null
          id: string
          photo_url?: string | null
          state?: string | null
          status?: string | null
          suspended_at?: string | null
          suspended_by?: string | null
          suspended_reason?: string | null
          updated_at?: string | null
        }
        Update: {
          city?: string | null
          cover_photo_url?: string | null
          cpf?: string | null
          cpf_locked?: boolean | null
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          photo_url?: string | null
          state?: string | null
          status?: string | null
          suspended_at?: string | null
          suspended_by?: string | null
          suspended_reason?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_id?: string
        }
        Relationships: []
      }
      saved_events: {
        Row: {
          created_at: string | null
          event_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          event_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          event_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_events_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      social_notifications: {
        Row: {
          actor_user_id: string
          created_at: string
          event_id: string | null
          id: string
          message: string | null
          read_at: string | null
          target_user_id: string
          type: string
        }
        Insert: {
          actor_user_id: string
          created_at?: string
          event_id?: string | null
          id?: string
          message?: string | null
          read_at?: string | null
          target_user_id: string
          type: string
        }
        Update: {
          actor_user_id?: string
          created_at?: string
          event_id?: string | null
          id?: string
          message?: string | null
          read_at?: string | null
          target_user_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_notifications_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_invoices: {
        Row: {
          amount_cents: number
          created_at: string
          id: string
          mp_payment_id: string | null
          organizer_id: string
          paid_at: string | null
          period_end: string | null
          period_start: string
          plan_id: string
          status: string
          subscription_id: string
          updated_at: string
        }
        Insert: {
          amount_cents?: number
          created_at?: string
          id?: string
          mp_payment_id?: string | null
          organizer_id: string
          paid_at?: string | null
          period_end?: string | null
          period_start: string
          plan_id: string
          status?: string
          subscription_id: string
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          id?: string
          mp_payment_id?: string | null
          organizer_id?: string
          paid_at?: string | null
          period_end?: string | null
          period_start?: string
          plan_id?: string
          status?: string
          subscription_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_invoices_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "organizer_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_invoices_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "organizer_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          commission_percent: number
          created_at: string
          features: Json | null
          id: string
          is_active: boolean
          name: string
          price_cents: number
          sort_order: number
        }
        Insert: {
          commission_percent?: number
          created_at?: string
          features?: Json | null
          id: string
          is_active?: boolean
          name: string
          price_cents?: number
          sort_order?: number
        }
        Update: {
          commission_percent?: number
          created_at?: string
          features?: Json | null
          id?: string
          is_active?: boolean
          name?: string
          price_cents?: number
          sort_order?: number
        }
        Relationships: []
      }
      ticket_types: {
        Row: {
          created_at: string | null
          currency: string | null
          event_id: string
          id: string
          name: string
          price_cents: number | null
          quantity_sold: number | null
          quantity_total: number
          sale_end_at: string | null
          sale_start_at: string | null
          status: Database["public"]["Enums"]["ticket_type_status"] | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          currency?: string | null
          event_id: string
          id?: string
          name: string
          price_cents?: number | null
          quantity_sold?: number | null
          quantity_total: number
          sale_end_at?: string | null
          sale_start_at?: string | null
          status?: Database["public"]["Enums"]["ticket_type_status"] | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          currency?: string | null
          event_id?: string
          id?: string
          name?: string
          price_cents?: number | null
          quantity_sold?: number | null
          quantity_total?: number
          sale_end_at?: string | null
          sale_start_at?: string | null
          status?: Database["public"]["Enums"]["ticket_type_status"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ticket_types_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          buyer_user_id: string
          checked_in_by: string | null
          event_id: string
          id: string
          issued_at: string | null
          order_id: string
          qr_token: string | null
          status: Database["public"]["Enums"]["ticket_status"] | null
          ticket_type_id: string
          used_at: string | null
        }
        Insert: {
          buyer_user_id: string
          checked_in_by?: string | null
          event_id: string
          id?: string
          issued_at?: string | null
          order_id: string
          qr_token?: string | null
          status?: Database["public"]["Enums"]["ticket_status"] | null
          ticket_type_id: string
          used_at?: string | null
        }
        Update: {
          buyer_user_id?: string
          checked_in_by?: string | null
          event_id?: string
          id?: string
          issued_at?: string | null
          order_id?: string
          qr_token?: string | null
          status?: Database["public"]["Enums"]["ticket_status"] | null
          ticket_type_id?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tickets_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_ticket_type_id_fkey"
            columns: ["ticket_type_id"]
            isOneToOne: false
            referencedRelation: "ticket_types"
            referencedColumns: ["id"]
          },
        ]
      }
      user_post_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          parent_id: string | null
          post_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          parent_id?: string | null
          post_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          parent_id?: string | null
          post_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_post_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "user_post_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "user_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      user_post_likes: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "user_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      user_posts: {
        Row: {
          content: string | null
          created_at: string
          event_id: string | null
          id: string
          media_type: string | null
          media_url: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          event_id?: string | null
          id?: string
          media_type?: string | null
          media_url?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string | null
          created_at?: string
          event_id?: string | null
          id?: string
          media_type?: string | null
          media_url?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_posts_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      webhook_events: {
        Row: {
          error: string | null
          event_type: string | null
          id: string
          payload: Json | null
          processed_at: string | null
          provider: string
          provider_event_id: string | null
          received_at: string | null
          status: Database["public"]["Enums"]["webhook_status"] | null
        }
        Insert: {
          error?: string | null
          event_type?: string | null
          id?: string
          payload?: Json | null
          processed_at?: string | null
          provider: string
          provider_event_id?: string | null
          received_at?: string | null
          status?: Database["public"]["Enums"]["webhook_status"] | null
        }
        Update: {
          error?: string | null
          event_type?: string | null
          id?: string
          payload?: Json | null
          processed_at?: string | null
          provider?: string
          provider_event_id?: string | null
          received_at?: string | null
          status?: Database["public"]["Enums"]["webhook_status"] | null
        }
        Relationships: []
      }
    }
    Views: {
      profiles_public: {
        Row: {
          cover_photo_url: string | null
          full_name: string | null
          id: string | null
          photo_url: string | null
        }
        Insert: {
          cover_photo_url?: string | null
          full_name?: string | null
          id?: string | null
          photo_url?: string | null
        }
        Update: {
          cover_photo_url?: string | null
          full_name?: string | null
          id?: string | null
          photo_url?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      find_user_by_email: {
        Args: { p_email: string }
        Returns: {
          full_name: string
          id: string
        }[]
      }
      get_organizer_commission: {
        Args: { p_organizer_id: string }
        Returns: number
      }
      get_user_organizer_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_quantity_sold: {
        Args: { p_increment_by: number; p_ticket_type_id: string }
        Returns: boolean
      }
      is_organizer_owner: {
        Args: { _organizer_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user" | "organizer"
      cpf_request_status: "pending" | "approved" | "rejected"
      event_status:
        | "draft"
        | "published"
        | "cancelled"
        | "paused"
        | "pending_review"
      media_type: "image" | "video"
      order_status: "pending" | "paid" | "failed" | "cancelled" | "refunded"
      organizer_status: "active" | "suspended"
      payment_status: "pending" | "paid" | "failed" | "refunded"
      ticket_status: "issued" | "used" | "cancelled"
      ticket_type_status: "active" | "paused" | "sold_out"
      webhook_status: "received" | "processed" | "failed"
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
  public: {
    Enums: {
      app_role: ["admin", "user", "organizer"],
      cpf_request_status: ["pending", "approved", "rejected"],
      event_status: [
        "draft",
        "published",
        "cancelled",
        "paused",
        "pending_review",
      ],
      media_type: ["image", "video"],
      order_status: ["pending", "paid", "failed", "cancelled", "refunded"],
      organizer_status: ["active", "suspended"],
      payment_status: ["pending", "paid", "failed", "refunded"],
      ticket_status: ["issued", "used", "cancelled"],
      ticket_type_status: ["active", "paused", "sold_out"],
      webhook_status: ["received", "processed", "failed"],
    },
  },
} as const
