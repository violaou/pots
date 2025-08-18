import { supabase } from './client'

export async function uploadImage(file: File): Promise<string> {
  const filename = `${Date.now()}-${file.name}`
  const { error: uploadError } = await supabase
    .storage
    .from('blog-images')
    .upload(filename, file, { upsert: false })
  if (uploadError) throw uploadError
  const { data } = supabase.storage.from('blog-images').getPublicUrl(filename)
  return data.publicUrl
}


