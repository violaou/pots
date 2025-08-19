import type { BlogPost } from '../types'
import { supabase } from './client'
import { BLOG_POSTS_TABLE } from './constants'

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


