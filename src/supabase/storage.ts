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

export function getStoragePathFromPublicUrl(publicUrl: string): string | null {
  try {
    const url = new URL(publicUrl)
    const marker = `/object/public/${BLOG_IMAGES_BUCKET}/`
    const idx = url.pathname.indexOf(marker)
    if (idx === -1) return null
    const objectPath = url.pathname.substring(idx + marker.length)
    return decodeURIComponent(objectPath)
  } catch {
    return null
  }
}

export async function deleteImageByPublicUrl(publicUrl: string): Promise<void> {
  const objectPath = getStoragePathFromPublicUrl(publicUrl)
  if (!objectPath) return
  const { error } = await supabase.storage.from(BLOG_IMAGES_BUCKET).remove([objectPath])
  if (error) throw error
}

