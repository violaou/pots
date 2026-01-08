import { supabase } from '../supabase/client'

export interface FAQEntry {
  question: string
  answer: string
}

export interface FAQ {
  id: string
  entries: FAQEntry[]
  updatedAt: string
}

const FAQ_TABLE = 'faq'

/**
 * Get the FAQ entries.
 * Returns the singleton FAQ row or creates one if it doesn't exist.
 */
export async function getFAQ(): Promise<FAQ> {
  const { data, error } = await supabase
    .from(FAQ_TABLE)
    .select('id, entries, updated_at')
    .limit(1)
    .single()

  if (error) throw error

  return {
    id: data.id as string,
    entries: (data.entries ?? []) as FAQEntry[],
    updatedAt: data.updated_at as string
  }
}

/**
 * Update FAQ entries.
 * Replaces the entire entries array.
 */
export async function updateFAQ(entries: FAQEntry[]): Promise<void> {
  // Get the singleton row ID first
  const { data: existing } = await supabase
    .from(FAQ_TABLE)
    .select('id')
    .limit(1)
    .single()

  if (!existing) throw new Error('FAQ row not found')

  const { error } = await supabase
    .from(FAQ_TABLE)
    .update({ entries })
    .eq('id', existing.id)

  if (error) throw error
}

