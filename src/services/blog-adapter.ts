import { createBlogPost as fbCreate, getBlogPosts as fbList, getBlogPost as fbGet } from '../firebase/blogService'
import { createBlogPost as sbCreate, getBlogPosts as sbList, getBlogPost as sbGet } from '../supabase/blog-service'
import { isSupabase } from './data-source'

const supabaseSelected = isSupabase()

export const createBlogPost = supabaseSelected ? sbCreate : fbCreate
export const getBlogPosts = supabaseSelected ? sbList : fbList
export const getBlogPost = supabaseSelected ? sbGet : fbGet


