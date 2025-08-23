import type { User } from '@supabase/supabase-js'

import { supabase } from './client'

export async function sendMagicLink(email: string): Promise<void> {
  if (!email) throw new Error('Email is required')
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: window.location.origin }
  })
  if (error) throw error
}

export async function signInWithPassword(
  email: string,
  password: string
): Promise<void> {
  if (!email || !password) throw new Error('Email and password are required')
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
}

export async function signUpWithEmail(
  email: string,
  password: string
): Promise<void> {
  if (!email || !password) throw new Error('Email and password are required')
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: window.location.origin }
  })
  if (error) throw error
}

export async function logout(): Promise<void> {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

// eslint-disable-next-line no-unused-vars
export function onAuthStateChange(cb: (_user: User | null) => void): () => void {
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

export async function getCurrentAuthUser(): Promise<User | null> {
  const { data, error } = await supabase.auth.getUser()
  if (error) return null
  return data.user ?? null
}


