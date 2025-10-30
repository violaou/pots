import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { z } from 'zod'

import { useAuth } from '../../contexts/AuthContext'
import {
  getArtworkWithImages,
  updateArtwork
} from '../../services/artwork-service'
import type { Artwork } from '../../types'

const formSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().optional(),
  clay: z.string().optional(),
  cone: z.union([z.string(), z.number()]).optional(),
  isMicrowaveSafe: z.boolean().default(true),
  isPublished: z.boolean().default(true)
})

export default function EditArtwork() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const { isAdmin, adminLoading, loading: authLoading } = useAuth()

  const [artwork, setArtwork] = useState<Artwork | null>(null)
  const [form, setForm] = useState<z.infer<typeof formSchema>>({
    title: '',
    description: '',
    clay: 'stoneware',
    cone: 'cone 6',
    isMicrowaveSafe: true,
    isPublished: true
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!slug) return
    let isMounted = true
    getArtworkWithImages(slug).then((data) => {
      if (!isMounted) return
      setArtwork(data)
      if (data) {
        setForm({
          title: data.title,
          description: data.description ?? '',
          clay: data.clay ?? 'stoneware',
          cone: (data.cone as any) ?? 'cone 6',
          isMicrowaveSafe: data.isMicrowaveSafe,
          isPublished: true
        })
      }
    })
    return () => {
      isMounted = false
    }
  }, [slug])

  const onChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, type } = e.target
    const value =
      type === 'checkbox'
        ? (e.target as HTMLInputElement).checked
        : e.target.value
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!slug) return
    setError(null)
    const parsed = formSchema.safeParse(form)
    if (!parsed.success) {
      setError(parsed.error.errors[0]?.message ?? 'Invalid form')
      return
    }
    setSubmitting(true)
    try {
      await updateArtwork(slug, parsed.data)
      navigate(`/gallery/${slug}`)
    } catch (err) {
      console.error(err)
      setError('Failed to save changes')
    } finally {
      setSubmitting(false)
    }
  }

  if (authLoading || adminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg text-gray-600">Loading…</p>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-red-600 mb-2">Access Denied</p>
          <p className="text-sm text-gray-600">
            You must be an admin to edit artwork.
          </p>
        </div>
      </div>
    )
  }

  if (!artwork) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg text-gray-600">Loading…</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-2xl mx-auto px-4">
        <h1 className="text-2xl font-medium mb-6">Edit Artwork</h1>
        {error ? (
          <div className="mb-4 text-sm text-red-600">{error}</div>
        ) : null}
        <form className="space-y-4" onSubmit={onSubmit}>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Title</label>
            <input
              name="title"
              value={form.title}
              onChange={onChange}
              className="w-full border rounded px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">
              Description
            </label>
            <textarea
              name="description"
              value={form.description}
              onChange={onChange}
              className="w-full border rounded px-3 py-2"
              rows={4}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Clay</label>
              <input
                name="clay"
                value={form.clay ?? ''}
                onChange={onChange}
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Cone</label>
              <input
                name="cone"
                value={String(form.cone ?? '')}
                onChange={onChange}
                className="w-full border rounded px-3 py-2"
              />
            </div>
          </div>
          <div className="flex items-center gap-6">
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                name="isMicrowaveSafe"
                checked={!!form.isMicrowaveSafe}
                onChange={onChange}
              />
              <span>Microwave safe</span>
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                name="isPublished"
                checked={!!form.isPublished}
                onChange={onChange}
              />
              <span>Published</span>
            </label>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded bg-black text-white disabled:opacity-50"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-4 py-2 rounded border"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
