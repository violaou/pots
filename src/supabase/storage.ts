import { supabase } from './client'
import { BLOG_IMAGES_BUCKET } from './constants'

export async function uploadImage(file: File): Promise<string> {
  const filename = `${Date.now()}-${file.name}`
  const { error: uploadError } = await supabase
    .storage
    .from(BLOG_IMAGES_BUCKET)
    .upload(filename, file, { upsert: false })
  if (uploadError) throw uploadError

  const { data } = supabase.storage.from(BLOG_IMAGES_BUCKET).getPublicUrl(filename)

  return data.publicUrl
}


