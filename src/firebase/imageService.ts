import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage'

const storage = getStorage()

export async function uploadImage(file: File): Promise<string> {
  try {
    // Create a unique filename using timestamp and original filename
    const timestamp = Date.now()
    const filename = `${timestamp}-${file.name}`

    // Create a reference to the file location in Firebase Storage
    const storageRef = ref(storage, `blog-images/${filename}`)

    // Upload the file
    await uploadBytes(storageRef, file)

    // Get the download URL
    const downloadURL = await getDownloadURL(storageRef)

    return downloadURL
  } catch (error) {
    console.error('Error uploading image:', error)
    throw new Error('Failed to upload image')
  }
}