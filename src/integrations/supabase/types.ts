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
    PostgrestVersion: "14.18"
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
      chat_presence: {
        Row: {
          conversation_id: string
          online_until: string
          typing_until: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          online_until?: string
          typing_until?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          online_until?: string
          typing_until?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_presence_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: []
      }
      conversations: {
        Row: {
          created_at: string
          event_id: string | null
          id: string
          participant_1_id: string
          participant_2_id: string
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
          {
            foreignKeyName: "coupons_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "organizer_accounts_feed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupons_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "organizer_accounts_public"
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
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
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
          moderation_status: string
          comment: string | null
          created_at: string
          event_id: string
          id: string
          rating: number
          updated_at: string
          user_id: string
        }
        Insert: {
          moderation_status?: string
          comment?: string | null
          created_at?: string
          event_id: string
          id?: string
          rating: number
          updated_at?: string
          user_id: string
        }
        Update: {
          moderation_status?: string
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
          is_store_review: boolean
          review_owner_id: string | null
          address_text: string | null
          category: string | null
          checkout_banner_url: string | null
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
          is_store_review?: boolean
          review_owner_id?: string | null
          address_text?: string | null
          category?: string | null
          checkout_banner_url?: string | null
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
          is_store_review?: boolean
          review_owner_id?: string | null
          address_text?: string | null
          category?: string | null
          checkout_banner_url?: string | null
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
          {
            foreignKeyName: "events_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "organizer_accounts_feed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "organizer_accounts_public"
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
          {
            foreignKeyName: "follows_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "organizer_accounts_feed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "organizer_accounts_public"
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
          item_index: number | null
          order_id: string
          qty: number
          ticket_type_id: string
          unit_price_cents: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          item_index?: number | null
          order_id: string
          qty?: number
          ticket_type_id: string
          unit_price_cents: number
        }
        Update: {
          created_at?: string | null
          id?: string
          item_index?: number | null
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
          buyer_user_id: string | null
          commission_cents: number | null
          coupon_id: string | null
          created_at: string | null
          discount_cents: number
          event_id: string
          expires_at: string | null
          id: string
          mp_payment_id: string | null
          mp_preference_id: string | null
          status: Database["public"]["Enums"]["order_status"] | null
          subtotal_cents: number | null
          total_cents: number
          updated_at: string | null
        }
        Insert: {
          buyer_user_id: string | null
          commission_cents?: number | null
          coupon_id?: string | null
          created_at?: string | null
          discount_cents?: number
          event_id: string
          expires_at?: string | null
          id?: string
          mp_payment_id?: string | null
          mp_preference_id?: string | null
          status?: Database["public"]["Enums"]["order_status"] | null
          subtotal_cents?: number | null
          total_cents?: number
          updated_at?: string | null
        }
        Update: {
          buyer_user_id?: string | null
          commission_cents?: number | null
          coupon_id?: string | null
          created_at?: string | null
          discount_cents?: number
          event_id?: string
          expires_at?: string | null
          id?: string
          mp_payment_id?: string | null
          mp_preference_id?: string | null
          status?: Database["public"]["Enums"]["order_status"] | null
          subtotal_cents?: number | null
          total_cents?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
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
          moderation_status: string
          is_store_review: boolean
          cep: string | null
          chat_available: boolean
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
          owner_user_id: string | null
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
          moderation_status?: string
          is_store_review?: boolean
          cep?: string | null
          chat_available?: boolean
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
          owner_user_id: string | null
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
          moderation_status?: string
          is_store_review?: boolean
          cep?: string | null
          chat_available?: boolean
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
          owner_user_id?: string | null
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
          {
            foreignKeyName: "organizer_mp_accounts_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: true
            referencedRelation: "organizer_accounts_feed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organizer_mp_accounts_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: true
            referencedRelation: "organizer_accounts_public"
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
            foreignKeyName: "organizer_subscriptions_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: true
            referencedRelation: "organizer_accounts_feed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organizer_subscriptions_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: true
            referencedRelation: "organizer_accounts_public"
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
          moderation_status: string
          city: string | null
          cover_photo_url: string | null
          cpf: string | null
          cpf_locked: boolean | null
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          last_seen_at: string | null
          photo_url: string | null
          state: string | null
          status: string | null
          suspended_at: string | null
          suspended_by: string | null
          suspended_reason: string | null
          updated_at: string | null
        }
        Insert: {
          moderation_status?: string
          city?: string | null
          cover_photo_url?: string | null
          cpf?: string | null
          cpf_locked?: boolean | null
          created_at?: string | null
          email: string
          full_name?: string | null
          id: string
          last_seen_at?: string | null
          photo_url?: string | null
          state?: string | null
          status?: string | null
          suspended_at?: string | null
          suspended_by?: string | null
          suspended_reason?: string | null
          updated_at?: string | null
        }
        Update: {
          moderation_status?: string
          city?: string | null
          cover_photo_url?: string | null
          cpf?: string | null
          cpf_locked?: boolean | null
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          last_seen_at?: string | null
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
      refund_requests: {
        Row: {
          admin_decided_at: string | null
          admin_decision_note: string | null
          attachments: Json
          created_at: string
          event_id: string
          fee_policy: string | null
          id: string
          mp_refund_id: string | null
          order_id: string
          organizer_deadline_at: string | null
          organizer_decided_at: string | null
          organizer_decision_note: string | null
          organizer_id: string
          reason: string
          refund_amount_cents: number
          refunded_at: string | null
          requester_user_id: string | null
          status: Database["public"]["Enums"]["refund_status"]
          updated_at: string
          within_guarantee: boolean
        }
        Insert: {
          admin_decided_at?: string | null
          admin_decision_note?: string | null
          attachments?: Json
          created_at?: string
          event_id: string
          fee_policy?: string | null
          id?: string
          mp_refund_id?: string | null
          order_id: string
          organizer_deadline_at?: string | null
          organizer_decided_at?: string | null
          organizer_decision_note?: string | null
          organizer_id: string
          reason: string
          refund_amount_cents?: number
          refunded_at?: string | null
          requester_user_id: string | null
          status?: Database["public"]["Enums"]["refund_status"]
          updated_at?: string
          within_guarantee?: boolean
        }
        Update: {
          admin_decided_at?: string | null
          admin_decision_note?: string | null
          attachments?: Json
          created_at?: string
          event_id?: string
          fee_policy?: string | null
          id?: string
          mp_refund_id?: string | null
          order_id?: string
          organizer_deadline_at?: string | null
          organizer_decided_at?: string | null
          organizer_decision_note?: string | null
          organizer_id?: string
          reason?: string
          refund_amount_cents?: number
          refunded_at?: string | null
          requester_user_id?: string | null
          status?: Database["public"]["Enums"]["refund_status"]
          updated_at?: string
          within_guarantee?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "refund_requests_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refund_requests_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refund_requests_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "organizer_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refund_requests_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "organizer_accounts_feed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refund_requests_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "organizer_accounts_public"
            referencedColumns: ["id"]
          },
        ]
      }
      refund_status_logs: {
        Row: {
          actor_role: string
          actor_user_id: string | null
          created_at: string
          from_status: Database["public"]["Enums"]["refund_status"] | null
          id: string
          metadata: Json
          note: string | null
          refund_request_id: string
          to_status: Database["public"]["Enums"]["refund_status"]
        }
        Insert: {
          actor_role: string
          actor_user_id?: string | null
          created_at?: string
          from_status?: Database["public"]["Enums"]["refund_status"] | null
          id?: string
          metadata?: Json
          note?: string | null
          refund_request_id: string
          to_status: Database["public"]["Enums"]["refund_status"]
        }
        Update: {
          actor_role?: string
          actor_user_id?: string | null
          created_at?: string
          from_status?: Database["public"]["Enums"]["refund_status"] | null
          id?: string
          metadata?: Json
          note?: string | null
          refund_request_id?: string
          to_status?: Database["public"]["Enums"]["refund_status"]
        }
        Relationships: [
          {
            foreignKeyName: "refund_status_logs_refund_request_id_fkey"
            columns: ["refund_request_id"]
            isOneToOne: false
            referencedRelation: "refund_requests"
            referencedColumns: ["id"]
          },
        ]
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
            foreignKeyName: "subscription_invoices_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "organizer_accounts_feed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_invoices_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "organizer_accounts_public"
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
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
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
          buyer_user_id: string | null
          checked_in_by: string | null
          event_id: string
          id: string
          issued_at: string | null
          item_index: number | null
          order_id: string
          qr_token: string | null
          status: Database["public"]["Enums"]["ticket_status"] | null
          ticket_number: number | null
          ticket_type_id: string
          used_at: string | null
        }
        Insert: {
          buyer_user_id: string | null
          checked_in_by?: string | null
          event_id: string
          id?: string
          issued_at?: string | null
          item_index?: number | null
          order_id: string
          qr_token?: string | null
          status?: Database["public"]["Enums"]["ticket_status"] | null
          ticket_number?: number | null
          ticket_type_id: string
          used_at?: string | null
        }
        Update: {
          buyer_user_id?: string | null
          checked_in_by?: string | null
          event_id?: string
          id?: string
          issued_at?: string | null
          item_index?: number | null
          order_id?: string
          qr_token?: string | null
          status?: Database["public"]["Enums"]["ticket_status"] | null
          ticket_number?: number | null
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
          moderation_status: string
          content: string
          created_at: string
          id: string
          parent_id: string | null
          post_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          moderation_status?: string
          content: string
          created_at?: string
          id?: string
          parent_id?: string | null
          post_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          moderation_status?: string
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
          moderation_status: string
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
          moderation_status?: string
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
          moderation_status?: string
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
      organizer_accounts_feed: {
        Row: {
          id: string | null
          owner_user_id: string | null
          status: Database["public"]["Enums"]["organizer_status"] | null
        }
        Insert: {
          id?: string | null
          owner_user_id?: string | null
          status?: Database["public"]["Enums"]["organizer_status"] | null
        }
        Update: {
          id?: string | null
          owner_user_id?: string | null
          status?: Database["public"]["Enums"]["organizer_status"] | null
        }
        Relationships: []
      }
      organizer_accounts_public: {
        Row: {
          city: string | null
          created_at: string | null
          description: string | null
          display_name: string | null
          id: string | null
          logo_url: string | null
          slug: string | null
          social_facebook: string | null
          social_instagram: string | null
          social_website: string | null
          state: string | null
          status: Database["public"]["Enums"]["organizer_status"] | null
          updated_at: string | null
        }
        Insert: {
          city?: string | null
          created_at?: string | null
          description?: string | null
          display_name?: string | null
          id?: string | null
          logo_url?: string | null
          slug?: string | null
          social_facebook?: string | null
          social_instagram?: string | null
          social_website?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["organizer_status"] | null
          updated_at?: string | null
        }
        Update: {
          city?: string | null
          created_at?: string | null
          description?: string | null
          display_name?: string | null
          id?: string | null
          logo_url?: string | null
          slug?: string | null
          social_facebook?: string | null
          social_instagram?: string | null
          social_website?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["organizer_status"] | null
          updated_at?: string | null
        }
        Relationships: []
      }
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
      ugc_user_blocked: { Args: { p_other: string }; Returns: boolean }
      my_blocked_users: { Args: never; Returns: { user_id: string; display_name: string; created_at: string }[] }
      set_user_block: { Args: { p_user_id: string; p_blocked: boolean }; Returns: undefined }
      report_content: { Args: { p_kind: string; p_target: string; p_reason: string; p_details?: string }; Returns: string }
      moderation_queue: { Args: never; Returns: Json }
      review_ugc: { Args: { p_kind: string; p_id: string; p_action: string; p_report_id?: string; p_note?: string }; Returns: undefined }
      save_organizer_event: {
        Args: { p_event_id: string | null; p_event: Json; p_tickets: Json; p_media: Json }
        Returns: string
      }
      account_is_active: { Args: Record<PropertyKey, never>; Returns: boolean }
      get_chat_identities: {
        Args: { p_conversation_ids: string[] }
        Returns: { conversation_id: string; user_id: string; full_name: string; photo_url: string | null; cover_photo_url: string | null; is_support: boolean; is_organizer: boolean; profile_path: string | null }[]
      }
      start_chat: { Args: { p_type: string; p_event_id?: string }; Returns: string }
      mark_chat_read: { Args: { p_conversation_id: string }; Returns: undefined }
      _refund_log: {
        Args: {
          p_actor: string
          p_from: Database["public"]["Enums"]["refund_status"]
          p_meta?: Json
          p_note?: string
          p_request_id: string
          p_role: string
          p_to: Database["public"]["Enums"]["refund_status"]
        }
        Returns: undefined
      }
      _refund_notify: {
        Args: {
          p_body: string
          p_request_id: string
          p_title: string
          p_user_id: string
        }
        Returns: undefined
      }
      admin_force_refund: {
        Args: { p_note?: string; p_request_id: string }
        Returns: Json
      }
      admin_reject_refund: {
        Args: { p_note?: string; p_request_id: string }
        Returns: Json
      }
      apply_coupon_to_order: {
        Args: { p_code: string; p_order_id: string }
        Returns: Json
      }
      check_in_ticket: {
        Args: { p_event_id?: string; p_ticket_code: string }
        Returns: Json
      }
      confirm_free_order: { Args: { p_order_id: string }; Returns: Json }
      confirm_paid_order: {
        Args: {
          p_amount_cents: number
          p_method: string
          p_order_id: string
          p_provider: string
          p_provider_payment_id: string
          p_raw?: Json
        }
        Returns: Json
      }
      decide_refund: {
        Args: { p_decision: string; p_note?: string; p_request_id: string }
        Returns: Json
      }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      email_queue_dispatch: { Args: never; Returns: undefined }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      find_refund_by_payment: {
        Args: { p_mp_payment_id: string }
        Returns: string
      }
      find_user_by_email: {
        Args: { p_email: string }
        Returns: {
          full_name: string
          id: string
        }[]
      }
      get_active_users_metrics: { Args: never; Returns: Json }
      get_collaborator_scanner_stats: {
        Args: { p_event_id: string }
        Returns: {
          checked_in: number
          my_checkins: number
          pending: number
          total: number
        }[]
      }
      get_event_organizer_status: {
        Args: { p_event_id: string }
        Returns: Json
      }
      get_organizer_commission: {
        Args: { p_organizer_id: string }
        Returns: number
      }
      get_organizer_leads: {
        Args: { p_organizer_id: string }
        Returns: {
          buyer_user_id: string
          email: string
          event_id: string
          event_start_at: string
          event_title: string
          full_name: string
          last_order_at: string
          orders_count: number
          photo_url: string
          tickets_count: number
          total_cents: number
        }[]
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
      mark_refund_completed: {
        Args: { p_mp_refund_id?: string; p_request_id: string }
        Returns: Json
      }
      mark_refund_failed: {
        Args: { p_note?: string; p_request_id: string }
        Returns: Json
      }
      mark_refund_pending: {
        Args: {
          p_fee_policy?: string
          p_mp_refund_id?: string
          p_request_id: string
        }
        Returns: Json
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      open_event_conversation: { Args: { p_event_id: string }; Returns: Json }
      open_organizer_conversation_with_user: {
        Args: { p_event_id: string; p_user_id: string }
        Returns: Json
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      release_pending_order: {
        Args: {
          p_order_id: string
          p_payment_id?: string
          p_target_status: string
        }
        Returns: boolean
      }
      remove_coupon_from_order: { Args: { p_order_id: string }; Returns: Json }
      request_refund: {
        Args: { p_attachments?: Json; p_order_id: string; p_reason: string }
        Returns: Json
      }
      set_chat_presence: {
        Args: {
          p_conversation_id: string
          p_online?: boolean
          p_typing?: boolean
        }
        Returns: undefined
      }
      touch_last_seen: { Args: never; Returns: undefined }
    }
    Enums: {
      app_role: "admin" | "user" | "organizer" | "marketing" | "support"
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
      refund_status:
        | "requested"
        | "approved"
        | "rejected"
        | "disputed"
        | "pending_refund"
        | "refunded"
        | "failed"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "user", "organizer", "marketing", "support"],
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
      refund_status: [
        "requested",
        "approved",
        "rejected",
        "disputed",
        "pending_refund",
        "refunded",
        "failed",
      ],
      ticket_status: ["issued", "used", "cancelled"],
      ticket_type_status: ["active", "paused", "sold_out"],
      webhook_status: ["received", "processed", "failed"],
    },
  },
} as const
