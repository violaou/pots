export function getDataSource(): 'firebase' | 'supabase' {
  const source = (import.meta.env.VITE_DATA_SOURCE as string | undefined) ?? 'firebase'
  return source === 'supabase' ? 'supabase' : 'firebase'
}

export function isSupabase(): boolean {
  return getDataSource() === 'supabase'
}


