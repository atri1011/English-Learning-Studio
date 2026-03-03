import { create } from "zustand"
import { supabase, isSupabaseConfigured } from "@/lib/supabase/client"
import type { User, Session } from "@supabase/supabase-js"

interface AuthState {
  user: User | null
  session: Session | null
  loading: boolean
  initialized: boolean

  initialize: () => void
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signUp: (email: string, password: string) => Promise<{ error: string | null; needsConfirmation: boolean }>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<{ error: string | null }>
}

let authSubscription: { unsubscribe: () => void } | null = null

export const useAuthStore = create<AuthState>()((set, get) => ({
  user: null,
  session: null,
  loading: false,
  initialized: false,

  initialize: () => {
    if (get().initialized || !isSupabaseConfigured()) return
    if (authSubscription) return

    supabase.auth.getSession().then(({ data: { session } }) => {
      set({ user: session?.user ?? null, session, initialized: true })
    })

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      set({ user: session?.user ?? null, session })
    })
    authSubscription = data.subscription
  },

  signIn: async (email, password) => {
    if (!isSupabaseConfigured()) return { error: "Supabase 未配置" }
    set({ loading: true })
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    set({ loading: false })
    return { error: error?.message ?? null }
  },

  signUp: async (email, password) => {
    if (!isSupabaseConfigured()) return { error: "Supabase 未配置", needsConfirmation: false }
    set({ loading: true })
    const { data, error } = await supabase.auth.signUp({ email, password })
    set({ loading: false })
    if (error) return { error: error.message, needsConfirmation: false }
    const needsConfirmation = !data.session && !!data.user
    return { error: null, needsConfirmation }
  },

  signOut: async () => {
    if (isSupabaseConfigured()) {
      await supabase.auth.signOut()
    }
    set({ user: null, session: null })
  },

  resetPassword: async (email) => {
    if (!isSupabaseConfigured()) return { error: "Supabase 未配置" }
    const { error } = await supabase.auth.resetPasswordForEmail(email)
    return { error: error?.message ?? null }
  },
}))
