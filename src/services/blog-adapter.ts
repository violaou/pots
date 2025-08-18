import { createBlogPost as fbCreate, getBlogPosts as fbList, getBlogPost as fbGet } from '../firebase/blogService'
import { createBlogPost as sbCreate, getBlogPosts as sbList, getBlogPost as sbGet } from '../supabase/blog-service'

const source = (import.meta.env.VITE_DATA_SOURCE as string | undefined) ?? 'firebase'

export const createBlogPost = source === 'supabase' ? sbCreate : fbCreate
export const getBlogPosts = source === 'supabase' ? sbList : fbList
export const getBlogPost = source === 'supabase' ? sbGet : fbGet


