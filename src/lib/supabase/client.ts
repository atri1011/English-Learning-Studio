import { createClient } from "@supabase/supabase-js"
import type { Database } from "./types"

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? ""
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? ""

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl && supabaseAnonKey && supabaseUrl !== "your-project-url")
}

/**
 * Untyped table accessor for dynamic sync operations.
 * The sync engine works with dynamic table names at runtime,
 * which can't be statically narrowed by the Database type.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function fromTable(table: string): any {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (supabase as any).from(table)
}

/**
 * Untyped RPC accessor for dynamic sync operations.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function rpcCall(fn: string, args: Record<string, unknown>): Promise<{ data: any; error: any }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (supabase as any).rpc(fn, args)
}
