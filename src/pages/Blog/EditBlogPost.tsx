import { ChangeEvent, FormEvent, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { useAuth } from '../../contexts/AuthContext'
import { getBlogPost, updateBlogPost } from '../../services/blog-service'
import { uploadImage } from '../../supabase/storage'
import type { BlogPost } from '../../types'
import { BackToBlog } from '../../components/BackToBlog'

export default function EditBlogPost() {
  const navigate = useNavigate()
  const { id } = useParams()
  const { user } = useAuth()
  const [formData, setFormData] = useState<Omit<BlogPost, 'id'>>({
    title: '',
    content: '',
    author: user?.displayName || '',
    date: new Date().toISOString().split('T')[0],
    tags: []
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)

  useEffect(() => {
    async function fetchPost() {
      if (!id) return
      try {
        const post = await getBlogPost(id)
        if (!post) {
          setError('Post not found')
          return
        }
        setFormData({
          title: post.title,
          content: post.content,
          author: post.author,
          date: post.date,
          imageUrl: post.imageUrl,
          tags: post.tags ?? []
        })
        setImagePreview(post.imageUrl ?? null)
      } catch (err) {
        setError('Failed to load blog post')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchPost()
  }, [id])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!id) return
    setSaving(true)
    setError(null)

    try {
      let imageUrl = formData.imageUrl
      if (imageFile) imageUrl = await uploadImage(imageFile)

      await updateBlogPost(id, {
        title: formData.title,
        content: formData.content,
        author: formData.author,
        date: formData.date,
        imageUrl,
        tags: formData.tags
      })
      navigate(`/blog/${id}`)
    } catch (err) {
      setError('Failed to update blog post')
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleTagsChange = (e: ChangeEvent<HTMLInputElement>) => {
    const tags = e.target.value
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean)
    setFormData((prev) => ({ ...prev, tags }))
  }

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    const reader = new FileReader()
    reader.onloadend = () => setImagePreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh]">
        {BackToBlog}
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {BackToBlog}
      <h1 className="text-4xl font-bold mb-8">Edit Blog Post</h1>
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit} className="max-w-2xl mx-auto">
        <div className="space-y-6">
          <>
            <label
              htmlFor="title"
              className="block text-sm font-medium text-gray-700"
            >
              Title
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-green-500 focus:ring-green-500 bg-gray-50 text-black"
              required
              disabled={saving}
            />
          </>

          <>
            <label
              htmlFor="author"
              className="block text-sm font-medium text-gray-700"
            >
              Author
            </label>
            <input
              type="text"
              id="author"
              name="author"
              value={formData.author}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-green-500 focus:ring-green-500 bg-gray-50 text-black"
              required
              disabled={true}
              readOnly
            />
          </>

          <>
            <label
              htmlFor="content"
              className="block text-sm font-medium text-gray-700"
            >
              Content
            </label>
            <textarea
              id="content"
              name="content"
              value={formData.content}
              onChange={handleChange}
              rows={10}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-green-500 focus:ring-green-500 bg-gray-50 text-black"
              required
              disabled={saving}
            />
          </>

          <>
            <label
              htmlFor="image"
              className="block text-sm font-medium text-gray-700"
            >
              Featured Image
            </label>
            <input
              type="file"
              id="image"
              name="image"
              accept="image/*"
              onChange={handleImageChange}
              className="mt-1 block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-md file:border-0
                file:text-sm file:font-semibold
                file:bg-green-50 file:text-green-700
                hover:file:bg-green-100"
              disabled={saving}
            />
            {imagePreview && (
              <div className="mt-4">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="max-h-64 rounded-lg"
                />
              </div>
            )}
          </>

          <>
            <label
              htmlFor="tags"
              className="block text-sm font-medium text-gray-700"
            >
              Tags (comma-separated)
            </label>
            <input
              type="text"
              id="tags"
              name="tags"
              value={formData.tags?.join(', ')}
              onChange={handleTagsChange}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-green-500 focus:ring-green-500 bg-gray-50 text-black"
              disabled={saving}
            />
          </>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => (id ? navigate(`/blog/${id}`) : navigate('/blog'))}
              className="bg-gray-200 text-black px-4 py-2 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
