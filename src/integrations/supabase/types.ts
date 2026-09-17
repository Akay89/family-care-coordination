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
  public: {
    Tables: {
      care_circles: {
        Row: {
          cared_for_name: string
          cared_for_notes: string | null
          created_at: string
          created_by: string
          id: string
          name: string
        }
        Insert: {
          cared_for_name?: string
          cared_for_notes?: string | null
          created_at?: string
          created_by: string
          id?: string
          name: string
        }
        Update: {
          cared_for_name?: string
          cared_for_notes?: string | null
          created_at?: string
          created_by?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      checklist_template_items: {
        Row: {
          created_at: string
          help_text: string | null
          id: string
          link_url: string | null
          position: number
          template_id: string
          title: string
        }
        Insert: {
          created_at?: string
          help_text?: string | null
          id?: string
          link_url?: string | null
          position?: number
          template_id: string
          title: string
        }
        Update: {
          created_at?: string
          help_text?: string | null
          id?: string
          link_url?: string | null
          position?: number
          template_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "checklist_template_items_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "checklist_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_templates: {
        Row: {
          category: string
          created_at: string
          description: string
          id: string
          is_active: boolean
          title: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string
          id?: string
          is_active?: boolean
          title: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          id?: string
          is_active?: boolean
          title?: string
        }
        Relationships: []
      }
      circle_checklist_items: {
        Row: {
          circle_checklist_id: string
          created_at: string
          done_at: string | null
          done_by: string | null
          help_text: string | null
          id: string
          is_done: boolean
          link_url: string | null
          notes: string | null
          position: number
          title: string
        }
        Insert: {
          circle_checklist_id: string
          created_at?: string
          done_at?: string | null
          done_by?: string | null
          help_text?: string | null
          id?: string
          is_done?: boolean
          link_url?: string | null
          notes?: string | null
          position?: number
          title: string
        }
        Update: {
          circle_checklist_id?: string
          created_at?: string
          done_at?: string | null
          done_by?: string | null
          help_text?: string | null
          id?: string
          is_done?: boolean
          link_url?: string | null
          notes?: string | null
          position?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "circle_checklist_items_circle_checklist_id_fkey"
            columns: ["circle_checklist_id"]
            isOneToOne: false
            referencedRelation: "circle_checklists"
            referencedColumns: ["id"]
          },
        ]
      }
      circle_checklists: {
        Row: {
          circle_id: string
          created_at: string
          id: string
          started_by: string
          template_id: string | null
          title: string
        }
        Insert: {
          circle_id: string
          created_at?: string
          id?: string
          started_by: string
          template_id?: string | null
          title?: string
        }
        Update: {
          circle_id?: string
          created_at?: string
          id?: string
          started_by?: string
          template_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "circle_checklists_circle_id_fkey"
            columns: ["circle_id"]
            isOneToOne: false
            referencedRelation: "care_circles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "circle_checklists_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "checklist_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      circle_invites: {
        Row: {
          accepted_at: string | null
          circle_id: string
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          role: Database["public"]["Enums"]["circle_role"]
          token: string
        }
        Insert: {
          accepted_at?: string | null
          circle_id: string
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          role?: Database["public"]["Enums"]["circle_role"]
          token?: string
        }
        Update: {
          accepted_at?: string | null
          circle_id?: string
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          role?: Database["public"]["Enums"]["circle_role"]
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "circle_invites_circle_id_fkey"
            columns: ["circle_id"]
            isOneToOne: false
            referencedRelation: "care_circles"
            referencedColumns: ["id"]
          },
        ]
      }
      circle_members: {
        Row: {
          circle_id: string
          id: string
          joined_at: string
          role: Database["public"]["Enums"]["circle_role"]
          user_id: string
        }
        Insert: {
          circle_id: string
          id?: string
          joined_at?: string
          role?: Database["public"]["Enums"]["circle_role"]
          user_id: string
        }
        Update: {
          circle_id?: string
          id?: string
          joined_at?: string
          role?: Database["public"]["Enums"]["circle_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "circle_members_circle_id_fkey"
            columns: ["circle_id"]
            isOneToOne: false
            referencedRelation: "care_circles"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          category: Database["public"]["Enums"]["document_category"]
          circle_id: string
          created_at: string
          description: string | null
          file_name: string
          file_path: string
          id: string
          size_bytes: number
          uploaded_by: string
        }
        Insert: {
          category?: Database["public"]["Enums"]["document_category"]
          circle_id: string
          created_at?: string
          description?: string | null
          file_name: string
          file_path: string
          id?: string
          size_bytes?: number
          uploaded_by: string
        }
        Update: {
          category?: Database["public"]["Enums"]["document_category"]
          circle_id?: string
          created_at?: string
          description?: string | null
          file_name?: string
          file_path?: string
          id?: string
          size_bytes?: number
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_circle_id_fkey"
            columns: ["circle_id"]
            isOneToOne: false
            referencedRelation: "care_circles"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          assigned_to: string | null
          circle_id: string
          created_at: string
          created_by: string
          end_at: string | null
          id: string
          location: string | null
          notes: string | null
          start_at: string
          title: string
          type: Database["public"]["Enums"]["event_type"]
        }
        Insert: {
          assigned_to?: string | null
          circle_id: string
          created_at?: string
          created_by: string
          end_at?: string | null
          id?: string
          location?: string | null
          notes?: string | null
          start_at: string
          title: string
          type?: Database["public"]["Enums"]["event_type"]
        }
        Update: {
          assigned_to?: string | null
          circle_id?: string
          created_at?: string
          created_by?: string
          end_at?: string | null
          id?: string
          location?: string | null
          notes?: string | null
          start_at?: string
          title?: string
          type?: Database["public"]["Enums"]["event_type"]
        }
        Relationships: [
          {
            foreignKeyName: "events_circle_id_fkey"
            columns: ["circle_id"]
            isOneToOne: false
            referencedRelation: "care_circles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string
          id: string
          is_admin: boolean
          phone: string | null
        }
        Insert: {
          created_at?: string
          full_name?: string
          id: string
          is_admin?: boolean
          phone?: string | null
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          is_admin?: boolean
          phone?: string | null
        }
        Relationships: []
      }
      tasks: {
        Row: {
          assigned_to: string | null
          circle_id: string
          completed_at: string | null
          completed_by: string | null
          created_at: string
          created_by: string
          description: string | null
          due_date: string | null
          id: string
          recurrence: Database["public"]["Enums"]["task_recurrence"]
          status: Database["public"]["Enums"]["task_status"]
          title: string
        }
        Insert: {
          assigned_to?: string | null
          circle_id: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          due_date?: string | null
          id?: string
          recurrence?: Database["public"]["Enums"]["task_recurrence"]
          status?: Database["public"]["Enums"]["task_status"]
          title: string
        }
        Update: {
          assigned_to?: string | null
          circle_id?: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          due_date?: string | null
          id?: string
          recurrence?: Database["public"]["Enums"]["task_recurrence"]
          status?: Database["public"]["Enums"]["task_status"]
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_circle_id_fkey"
            columns: ["circle_id"]
            isOneToOne: false
            referencedRelation: "care_circles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_circle_invite: { Args: { _token: string }; Returns: string }
      can_edit_circle: { Args: { _circle_id: string }; Returns: boolean }
      checklist_circle_id: { Args: { _checklist_id: string }; Returns: string }
      circle_invite_preview: {
        Args: { _token: string }
        Returns: {
          cared_for_name: string
          circle_id: string
          circle_name: string
          invite_role: Database["public"]["Enums"]["circle_role"]
          valid: boolean
        }[]
      }
      circle_role: {
        Args: { _circle_id: string }
        Returns: Database["public"]["Enums"]["circle_role"]
      }
      is_admin: { Args: never; Returns: boolean }
      is_circle_member: { Args: { _circle_id: string }; Returns: boolean }
      is_circle_organiser: { Args: { _circle_id: string }; Returns: boolean }
      shares_circle_with: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      circle_role: "organiser" | "member" | "viewer"
      document_category:
        | "benefits"
        | "legal"
        | "letters"
        | "insurance"
        | "other"
      event_type: "appointment" | "visit" | "collection" | "other"
      task_recurrence: "none" | "daily" | "weekly" | "monthly"
      task_status: "todo" | "done"
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
      circle_role: ["organiser", "member", "viewer"],
      document_category: ["benefits", "legal", "letters", "insurance", "other"],
      event_type: ["appointment", "visit", "collection", "other"],
      task_recurrence: ["none", "daily", "weekly", "monthly"],
      task_status: ["todo", "done"],
    },
  },
} as const
