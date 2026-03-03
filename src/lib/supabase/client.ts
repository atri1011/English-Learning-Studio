import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "./types"

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? ""
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? ""

let supabaseClient: SupabaseClient<Database> | null = null

export function isSupabaseConfigured(): boolean {
  return Boolean(
    supabaseUrl.trim() &&
    supabaseAnonKey.trim() &&
    supabaseUrl !== "your-project-url",
  )
}

export function getSupabaseClient(): SupabaseClient<Database> {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase 未配置：请设置 VITE_SUPABASE_URL 和 VITE_SUPABASE_ANON_KEY")
  }
  if (!supabaseClient) {
    supabaseClient = createClient<Database>(supabaseUrl, supabaseAnonKey)
  }
  return supabaseClient
}

/**
 * Untyped table accessor for dynamic sync operations.
 * The sync engine works with dynamic table names at runtime,
 * which can't be statically narrowed by the Database type.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function fromTable(table: string): any {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (getSupabaseClient() as any).from(table)
}

/**
 * Untyped RPC accessor for dynamic sync operations.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function rpcCall(fn: string, args: Record<string, unknown>): Promise<{ data: any; error: any }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (getSupabaseClient() as any).rpc(fn, args)
}
