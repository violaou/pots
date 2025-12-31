import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { useAuth } from '../../contexts/AuthContext'
import {
  createBlogPost,
  deleteOldBlogImage,
  getBlogPost,
  updateBlogPost
} from '../../services/blog-service'
import { uploadImage } from '../../services/s3-upload'
import { theme } from '../../styles/theme'
import type { BlogPost } from '../../types'
import { BackToBlog } from '../../components/BackToBlog'

// File input has special styling that doesn't fit theme well
const fileInputStyles = `mt-1 block w-full text-sm ${theme.text.muted}
  file:mr-4 file:py-2 file:px-4
  file:rounded-md file:border-0
  file:text-sm file:font-semibold
  file:bg-green-50 file:text-green-700
  dark:file:bg-green-900/30 dark:file:text-green-400
  hover:file:bg-green-100 dark:hover:file:bg-green-900/50`

export default function BlogPostForm() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEditMode = useMemo(() => Boolean(id), [id])
  const { user } = useAuth()

  const [formData, setFormData] = useState<Omit<BlogPost, 'id'>>({
    title: '',
    content: '',
    author: user?.displayName || '',
    date: new Date().toISOString().split('T')[0],
    tags: []
  })
  const [loading, setLoading] = useState<boolean>(Boolean(isEditMode))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)

  useEffect(() => {
    if (!isEditMode || !id) return
    async function fetchPost() {
      try {
        const postId = id as string
        const post = await getBlogPost(postId)
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
  }, [id, isEditMode])

  function handleChange(
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  function handleTagsChange(e: ChangeEvent<HTMLInputElement>) {
    const tags = e.target.value
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean)
    setFormData((prev) => ({ ...prev, tags }))
  }

  function handleImageChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    const reader = new FileReader()
    reader.onloadend = () => setImagePreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      let imageUrl = formData.imageUrl
      const oldImageUrl = formData.imageUrl

      if (imageFile) {
        imageUrl = await uploadImage(imageFile, 'blog')
        if (isEditMode && oldImageUrl && oldImageUrl !== imageUrl) {
          await deleteOldBlogImage(oldImageUrl)
        }
      }

      const authorName = user?.displayName ?? 'Unknown Author'

      if (isEditMode && id) {
        await updateBlogPost(id, {
          title: formData.title,
          content: formData.content,
          author: authorName,
          date: formData.date,
          imageUrl,
          tags: formData.tags
        })
        navigate(`/blog/${id}`)
        return
      }

      await createBlogPost({
        title: formData.title,
        content: formData.content,
        author: authorName,
        date: formData.date,
        imageUrl,
        tags: formData.tags
      })
      navigate('/blog')
    } catch (err) {
      setError(
        isEditMode ? 'Failed to update blog post' : 'Failed to create blog post'
      )
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return null

  return (
    <div className={theme.layout.container}>
      {BackToBlog}
      <h1 className={`text-4xl font-bold mb-8 ${theme.text.h1} text-center`}>
        {isEditMode ? 'Edit Blog Post' : 'Create New Blog Post'}
      </h1>

      {error && <div className={`${theme.alert.error} mb-4`}>{error}</div>}

      <form onSubmit={handleSubmit} className="max-w-2xl mx-auto">
        <div className="space-y-6">
          <div className={theme.form.group}>
            <label htmlFor="title" className={theme.form.labelRequired}>
              Title
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              className={theme.form.input}
              required
              disabled={saving}
            />
          </div>

          <div className={theme.form.group}>
            <label htmlFor="content" className={theme.form.labelRequired}>
              Content
            </label>
            <textarea
              id="content"
              name="content"
              value={formData.content}
              onChange={handleChange}
              rows={10}
              className={theme.form.textarea}
              required
              disabled={saving}
            />
          </div>

          <div className={theme.form.group}>
            <label htmlFor="image" className={theme.form.labelRequired}>
              Featured Image
            </label>
            <input
              type="file"
              id="image"
              name="image"
              accept="image/*"
              onChange={handleImageChange}
              className={fileInputStyles}
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
          </div>

          <div className={theme.form.group}>
            <label htmlFor="tags" className={theme.form.labelRequired}>
              Tags (comma-separated)
            </label>
            <input
              type="text"
              id="tags"
              name="tags"
              value={(formData.tags ?? []).join(', ')}
              onChange={handleTagsChange}
              className={theme.form.input}
              disabled={saving}
            />
          </div>

          <div className="flex justify-end gap-3">
            {isEditMode && (
              <button
                type="button"
                onClick={() =>
                  id ? navigate(`/blog/${id}`) : navigate('/blog')
                }
                className={theme.button.ghost}
                disabled={saving}
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              className={theme.button.accent}
              disabled={saving}
            >
              {saving
                ? isEditMode
                  ? 'Saving...'
                  : 'Creating...'
                : isEditMode
                  ? 'Save Changes'
                  : 'Create Post'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
