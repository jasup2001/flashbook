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
      flash_designs: {
        Row: {
          asset_id: string
          created_at: string
          id: string
          sort_order: number
          status: string
        }
        Insert: {
          asset_id: string
          created_at?: string
          id?: string
          sort_order?: number
          status?: string
        }
        Update: {
          asset_id?: string
          created_at?: string
          id?: string
          sort_order?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "flash_designs_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "portfolio_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolio_assets: {
        Row: {
          bytes: number
          created_at: string
          file_name: string
          height: number
          id: string
          kind: string
          legacy_key: string | null
          original: string
          source: string
          thumbnails: Json
          width: number
        }
        Insert: {
          bytes: number
          created_at?: string
          file_name: string
          height: number
          id?: string
          kind: string
          legacy_key?: string | null
          original: string
          source: string
          thumbnails?: Json
          width: number
        }
        Update: {
          bytes?: number
          created_at?: string
          file_name?: string
          height?: number
          id?: string
          kind?: string
          legacy_key?: string | null
          original?: string
          source?: string
          thumbnails?: Json
          width?: number
        }
        Relationships: []
      }
      tattoo_posts: {
        Row: {
          caption: string
          created_at: string
          id: string
          sort_order: number
          status: string
        }
        Insert: {
          caption?: string
          created_at?: string
          id?: string
          sort_order?: number
          status?: string
        }
        Update: {
          caption?: string
          created_at?: string
          id?: string
          sort_order?: number
          status?: string
        }
        Relationships: []
      }
      tattoo_slides: {
        Row: {
          asset_id: string
          id: string
          post_id: string
          sort_order: number
        }
        Insert: {
          asset_id: string
          id?: string
          post_id: string
          sort_order?: number
        }
        Update: {
          asset_id?: string
          id?: string
          post_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "tattoo_slides_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "portfolio_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tattoo_slides_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "tattoo_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      waitlist_entries: {
        Row: {
          catalog_snapshot: Json
          client_hash: string
          created_at: string
          email: string
          id: string
          idea: string
          instagram: string
          notes: string
          placement: string
          size: string
          status: string
        }
        Insert: {
          catalog_snapshot: Json
          client_hash: string
          created_at?: string
          email: string
          id?: string
          idea: string
          instagram: string
          notes?: string
          placement?: string
          size?: string
          status?: string
        }
        Update: {
          catalog_snapshot?: Json
          client_hash?: string
          created_at?: string
          email?: string
          id?: string
          idea?: string
          instagram?: string
          notes?: string
          placement?: string
          size?: string
          status?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_portfolio_admin: { Args: never; Returns: boolean }
      reorder_portfolio: {
        Args: { ordered_ids: string[]; target: string }
        Returns: undefined
      }
      save_tattoo_post: {
        Args: {
          asset_ids: string[]
          post_caption: string
          post_id?: string
          post_position: number
        }
        Returns: string
      }
      submit_waitlist: {
        Args: { fingerprint: string; payload: Json }
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
