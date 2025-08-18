import { uploadImage as fbUpload } from '../firebase/imageService'
import { uploadImage as sbUpload } from '../supabase/storage'

const source = (import.meta.env.VITE_DATA_SOURCE as string | undefined) ?? 'firebase'

export const uploadImage = source === 'supabase' ? sbUpload : fbUpload


