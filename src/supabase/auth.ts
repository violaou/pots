import type { User } from '@supabase/supabase-js'
import { supabase } from './client'

export async function signInWithGoogle(): Promise<void> {
  const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' })
  if (error) throw error
}

export async function logout(): Promise<void> {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export function onAuthStateChange(cb: (user: User | null) => void): () => void {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => cb(session?.user ?? null))
  return () => data.subscription.unsubscribe()
}

export async function isAdmin(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('blog_admins')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw error
  return !!data
}


