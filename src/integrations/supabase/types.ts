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
      events: {
        Row: {
          address_text: string | null
          category: string | null
          cover_image_url: string | null
          created_at: string | null
          description: string | null
          end_at: string | null
          id: string
          lat: number | null
          lng: number | null
          organizer_id: string
          start_at: string
          status: Database["public"]["Enums"]["event_status"] | null
          title: string
          updated_at: string | null
          venue_name: string | null
        }
        Insert: {
          address_text?: string | null
          category?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          description?: string | null
          end_at?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          organizer_id: string
          start_at: string
          status?: Database["public"]["Enums"]["event_status"] | null
          title: string
          updated_at?: string | null
          venue_name?: string | null
        }
        Update: {
          address_text?: string | null
          category?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          description?: string | null
          end_at?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          organizer_id?: string
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
          created_at: string | null
          event_id: string
          expires_at: string | null
          id: string
          status: Database["public"]["Enums"]["order_status"] | null
          total_cents: number
          updated_at: string | null
        }
        Insert: {
          buyer_user_id: string
          created_at?: string | null
          event_id: string
          expires_at?: string | null
          id?: string
          status?: Database["public"]["Enums"]["order_status"] | null
          total_cents?: number
          updated_at?: string | null
        }
        Update: {
          buyer_user_id?: string
          created_at?: string | null
          event_id?: string
          expires_at?: string | null
          id?: string
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
          created_at: string | null
          display_name: string
          id: string
          owner_user_id: string
          status: Database["public"]["Enums"]["organizer_status"] | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          display_name: string
          id?: string
          owner_user_id: string
          status?: Database["public"]["Enums"]["organizer_status"] | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          display_name?: string
          id?: string
          owner_user_id?: string
          status?: Database["public"]["Enums"]["organizer_status"] | null
          updated_at?: string | null
        }
        Relationships: []
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
          cpf: string | null
          cpf_locked: boolean | null
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          photo_url: string | null
          updated_at: string | null
        }
        Insert: {
          cpf?: string | null
          cpf_locked?: boolean | null
          created_at?: string | null
          email: string
          full_name?: string | null
          id: string
          photo_url?: string | null
          updated_at?: string | null
        }
        Update: {
          cpf?: string | null
          cpf_locked?: boolean | null
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          photo_url?: string | null
          updated_at?: string | null
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
      [_ in never]: never
    }
    Functions: {
      get_user_organizer_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
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
      event_status: "draft" | "published" | "cancelled"
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
      event_status: ["draft", "published", "cancelled"],
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
