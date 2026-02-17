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
      products: {
        Row: {
          created_at: string
          id: string
          name: string
          price: number
          product_code: string
          quantity_current: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          price?: number
          product_code: string
          quantity_current?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          price?: number
          product_code?: string
          quantity_current?: number
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      stock_transactions: {
        Row: {
          action: Database["public"]["Enums"]["stock_action"]
          created_at: string
          id: string
          note: string | null
          performed_by: string | null
          product_id: string
          qty: number
        }
        Insert: {
          action: Database["public"]["Enums"]["stock_action"]
          created_at?: string
          id?: string
          note?: string | null
          performed_by?: string | null
          product_id: string
          qty?: number
        }
        Update: {
          action?: Database["public"]["Enums"]["stock_action"]
          created_at?: string
          id?: string
          note?: string | null
          performed_by?: string | null
          product_id?: string
          qty?: number
        }
        Relationships: [
          {
            foreignKeyName: "stock_transactions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      telegram_chats: {
        Row: {
          chat_id: number
          chat_title: string | null
          chat_type: string
          created_at: string
          first_name: string | null
          id: number
          is_active: boolean | null
          last_name: string | null
          updated_at: string
          username: string | null
        }
        Insert: {
          chat_id: number
          chat_title?: string | null
          chat_type: string
          created_at?: string
          first_name?: string | null
          id?: number
          is_active?: boolean | null
          last_name?: string | null
          updated_at?: string
          username?: string | null
        }
        Update: {
          chat_id?: number
          chat_title?: string | null
          chat_type?: string
          created_at?: string
          first_name?: string | null
          id?: number
          is_active?: boolean | null
          last_name?: string | null
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      telegram_notifications_log: {
        Row: {
          chat_id: number
          created_at: string
          error_message: string | null
          id: string
          message_id: number | null
          message_text: string
          notification_type: Database["public"]["Enums"]["notification_type"]
          product_id: string | null
          status: string
        }
        Insert: {
          chat_id: number
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: number | null
          message_text: string
          notification_type: Database["public"]["Enums"]["notification_type"]
          product_id?: string | null
          status: string
        }
        Update: {
          chat_id?: number
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: number | null
          message_text?: string
          notification_type?: Database["public"]["Enums"]["notification_type"]
          product_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "telegram_notifications_log_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      telegram_subscriptions: {
        Row: {
          chat_id: number
          created_at: string
          id: string
          is_active: boolean | null
          notification_type: Database["public"]["Enums"]["notification_type"]
          product_id: string | null
          updated_at: string
        }
        Insert: {
          chat_id: number
          created_at?: string
          id?: string
          is_active?: boolean | null
          notification_type?: Database["public"]["Enums"]["notification_type"]
          product_id?: string | null
          updated_at?: string
        }
        Update: {
          chat_id?: number
          created_at?: string
          id?: string
          is_active?: boolean | null
          notification_type?: Database["public"]["Enums"]["notification_type"]
          product_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "telegram_subscriptions_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "telegram_chats"
            referencedColumns: ["chat_id"]
          },
          {
            foreignKeyName: "telegram_subscriptions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      perform_stock_transaction: {
        Args: {
          p_action: Database["public"]["Enums"]["stock_action"]
          p_note?: string
          p_product_id: string
          p_qty: number
          p_user_id?: string
        }
        Returns: {
          created_at: string
          id: string
          name: string
          price: number
          product_code: string
          quantity_current: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "products"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      app_role: "ADMIN" | "WH_MANAGER"
      notification_type: "STOCK_IN" | "STOCK_OUT" | "NEW_PRODUCT" | "ALL"
      stock_action: "IN" | "OUT"
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
      app_role: ["ADMIN", "WH_MANAGER"],
      notification_type: ["STOCK_IN", "STOCK_OUT", "NEW_PRODUCT", "ALL"],
      stock_action: ["IN", "OUT"],
    },
  },
} as const
