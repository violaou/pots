import { uploadImage as fbUpload } from '../firebase/imageService'
import { uploadImage as sbUpload } from '../supabase/storage'
import { isSupabase } from './data-source'

const supabaseSelected = isSupabase()

export const uploadImage = supabaseSelected ? sbUpload : fbUpload


