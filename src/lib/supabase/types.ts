export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

/** Supabase-generated DB types (simplified for current schema) */
export interface Database {
  public: {
    Tables: {
      articles: {
        Row: {
          id: string
          user_id: string
          title: string
          raw_text: string
          source_type: string
          word_count: number
          sentence_count: number
          status: string
          tags: string[]
          version: number
          deleted_at: string | null
          last_modified_by: string
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database["public"]["Tables"]["articles"]["Row"], "version" | "created_at" | "updated_at"> & {
          version?: number
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database["public"]["Tables"]["articles"]["Insert"]>
      }
      sentences: {
        Row: {
          id: string
          user_id: string
          article_id: string
          "order": number
          text: string
          char_start: number
          char_end: number
          version: number
          deleted_at: string | null
          last_modified_by: string
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database["public"]["Tables"]["sentences"]["Row"], "version" | "created_at" | "updated_at"> & {
          version?: number
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database["public"]["Tables"]["sentences"]["Insert"]>
      }
      analysis_results: {
        Row: {
          id: string
          user_id: string
          request_hash: string
          article_id: string
          sentence_id: string
          analysis_type: string
          status: string
          model: string
          result_json: Json | null
          error_message: string | null
          attempts: number
          version: number
          deleted_at: string | null
          last_modified_by: string
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database["public"]["Tables"]["analysis_results"]["Row"], "version" | "created_at" | "updated_at"> & {
          version?: number
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database["public"]["Tables"]["analysis_results"]["Insert"]>
      }
      api_profiles: {
        Row: {
          id: string
          user_id: string
          name: string
          base_url: string
          api_key_cipher: string | null
          model: string
          temperature: number
          max_tokens: number
          is_active: number
          version: number
          deleted_at: string | null
          last_modified_by: string
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database["public"]["Tables"]["api_profiles"]["Row"], "version" | "created_at" | "updated_at"> & {
          version?: number
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database["public"]["Tables"]["api_profiles"]["Insert"]>
      }
      vocabulary: {
        Row: {
          id: string
          user_id: string
          word: string
          normalized_word: string
          phonetic: string
          pos: string
          meaning_zh: string
          context: string
          article_id: string
          sentence_id: string
          version: number
          deleted_at: string | null
          last_modified_by: string
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database["public"]["Tables"]["vocabulary"]["Row"], "version" | "created_at" | "updated_at"> & {
          version?: number
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database["public"]["Tables"]["vocabulary"]["Insert"]>
      }
      practice_materials: {
        Row: {
          id: string
          user_id: string
          title: string
          source_text: string
          prompt_text: string
          word_count: number
          best_score: number | null
          version: number
          deleted_at: string | null
          last_modified_by: string
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database["public"]["Tables"]["practice_materials"]["Row"], "version" | "created_at" | "updated_at"> & {
          version?: number
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database["public"]["Tables"]["practice_materials"]["Insert"]>
      }
      practice_attempts: {
        Row: {
          id: string
          user_id: string
          material_id: string
          user_translation: string
          overall_score: number
          dimension_scores: Json
          dual_scores: Json | null
          verdict_zh: string
          diffs: Json
          error_metrics: Json | null
          review_plan_days: number[] | null
          better_version: Json
          strengths: string[]
          next_focus: string[]
          model: string
          is_best: boolean
          version: number
          deleted_at: string | null
          last_modified_by: string
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database["public"]["Tables"]["practice_attempts"]["Row"], "version" | "created_at" | "updated_at"> & {
          version?: number
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database["public"]["Tables"]["practice_attempts"]["Insert"]>
      }
      sync_events: {
        Row: {
          seq: number
          user_id: string
          table_name: string
          row_id: string
          op: "INSERT" | "UPDATE" | "DELETE"
          version: number
          payload: Json
          created_at: string
        }
        Insert: Omit<Database["public"]["Tables"]["sync_events"]["Row"], "seq" | "created_at"> & {
          seq?: number
          created_at?: string
        }
        Update: Partial<Database["public"]["Tables"]["sync_events"]["Insert"]>
      }
    }
    Functions: {
      pull_changes: {
        Args: { p_since_seq: number; p_limit: number }
        Returns: Database["public"]["Tables"]["sync_events"]["Row"][]
      }
    }
  }
}
