import { supabase } from '../supabase/client'
import { BLOG_POSTS_TABLE } from '../supabase/constants'
import type { BlogPost } from '../types'
import { deleteImage as deleteDoSpacesImage, isDoSpacesUrl } from './s3-upload'

/**
 * Delete a blog image from the appropriate storage backend.
 * Handles both legacy Supabase Storage and new DO Spaces URLs.
 */
async function deleteBlogImage(imageUrl: string): Promise<void> {
  if (isDoSpacesUrl(imageUrl)) {
    await deleteDoSpacesImage(imageUrl)
  } else {
    console.error('Failed to delete blog image from storage', imageUrl)
  }
}

export async function createBlogPost(
  post: Omit<BlogPost, 'id' | 'date'> & { date: string }
): Promise<string> {
  const { data, error } = await supabase
    .from(BLOG_POSTS_TABLE)
    .insert({
      title: post.title,
      content: post.content,
      author: post.author,
      post_date: post.date,
      image_url: post.imageUrl,
      tags: post.tags ?? []
    })
    .select('id')
    .single()
  if (error) throw error
  return data.id as string
}

export async function getBlogPosts(): Promise<BlogPost[]> {
  const { data, error } = await supabase
    .from(BLOG_POSTS_TABLE)
    .select('id, title, content, author, post_date, image_url, tags')
    .order('post_date', { ascending: false })
  if (error) throw error
  return (data ?? []).map(row => ({
    id: row.id as string,
    title: row.title as string,
    content: row.content as string,
    author: row.author as string,
    date: String(row.post_date),
    imageUrl: (row.image_url ?? undefined) as string | undefined,
    tags: ((row.tags ?? []) as string[])
  }))
}

export async function getBlogPost(id: string): Promise<BlogPost | null> {
  const { data, error } = await supabase
    .from(BLOG_POSTS_TABLE)
    .select('id, title, content, author, post_date, image_url, tags')
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  if (!data) return null
  return {
    id: data.id as string,
    title: data.title as string,
    content: data.content as string,
    author: data.author as string,
    date: String(data.post_date),
    imageUrl: (data.image_url ?? undefined) as string | undefined,
    tags: ((data.tags ?? []) as string[])
  }
}


export async function updateBlogPost(
  id: string,
  updates: Partial<Omit<BlogPost, 'id'>>
): Promise<void> {
  const payload: Record<string, unknown> = {}
  if ('title' in updates) payload.title = updates.title
  if ('content' in updates) payload.content = updates.content
  if ('author' in updates) payload.author = updates.author
  if ('date' in updates) payload.post_date = updates.date
  if ('imageUrl' in updates) payload.image_url = updates.imageUrl
  if ('tags' in updates) payload.tags = updates.tags

  const { error } = await supabase
    .from(BLOG_POSTS_TABLE)
    .update(payload)
    .eq('id', id)

  if (error) throw error
}

export async function deleteBlogPost(id: string): Promise<void> {
  const existing = await getBlogPost(id)
  const { error } = await supabase
    .from(BLOG_POSTS_TABLE)
    .delete()
    .eq('id', id)

  if (error) throw error
  if (existing?.imageUrl) {
    try {
      await deleteBlogImage(existing.imageUrl)
    } catch (e) {
      // Non-fatal: post is deleted, but log storage cleanup issue
      console.error('Failed to delete image from storage', e)
    }
  }
}

/**
 * Delete a blog post's old image when replacing it.
 * Call this before updating the post with a new image URL.
 */
export async function deleteOldBlogImage(imageUrl: string | undefined): Promise<void> {
  if (!imageUrl) return
  try {
    await deleteBlogImage(imageUrl)
  } catch (e) {
    // Non-fatal: log but don't block the update
    console.error('Failed to delete old image from storage', e)
  }
}


