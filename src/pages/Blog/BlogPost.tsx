import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { useAuth } from '../../contexts/AuthContext'
import { deleteBlogPost, getBlogPost } from '../../supabase/blog-service'
import type { BlogPost } from '../../types'
import { BackToBlog } from './components'

export default function BlogPost() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [post, setPost] = useState<BlogPost | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const {
    isAuthenticated,
    isAdmin,
    adminLoading,
    loading: authLoading
  } = useAuth()

  useEffect(() => {
    async function fetchPost() {
      if (!id) return

      try {
        const blogPost = await getBlogPost(id)
        setPost(blogPost)
      } catch (err) {
        setError('Failed to load blog post')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchPost()
  }, [id])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh]">
        {BackToBlog}
      </div>
    )
  }

  if (error || !post) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh]">
        <h1 className="text-4xl font-bold mb-8 text-center">
          Post Not Found 😔
        </h1>
        {BackToBlog}
      </div>
    )
  }

  const inAdmin = !authLoading && isAuthenticated && !adminLoading && isAdmin

  return (
    <div className="container mx-auto px-4 py-8">
      {BackToBlog}
      {inAdmin && (
        <div className="flex gap-3 mb-4">
          <button
            onClick={() => navigate(`/blog/${id}/edit`)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Edit
          </button>
          <button
            onClick={async () => {
              if (!id) return
              const confirmed = window.confirm(
                'Delete this post? This cannot be undone.'
              )
              if (!confirmed) return
              try {
                await deleteBlogPost(id)
                navigate('/blog')
              } catch (err) {
                console.error(err)
                alert('Failed to delete post')
              }
            }}
            className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          >
            Delete
          </button>
        </div>
      )}
      <article className="bg-soft-white rounded-lg shadow-md p-6">
        <h1 className="text-4xl  text-black font-bold mb-4">{post.title}</h1>
        <div className="text-sm text-black mb-6">
          <span>{new Date(post.date).toLocaleDateString()}</span>
        </div>
        {post.imageUrl && (
          <img
            src={post.imageUrl}
            alt={post.title}
            className="w-full h-64 object-cover rounded-lg mb-6"
          />
        )}
        <div className="prose max-w-none text-black">
          {/* TODO: add markdown support for the content */}
          {post.content.split('\n').map((paragraph, i) => (
            <p key={i} className="mb-4">
              {paragraph}
            </p>
          ))}
        </div>
        {post.tags && (
          <div className="flex gap-2 mt-6">
            {post.tags.map((tag) => (
              <span
                key={tag}
                className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </article>
    </div>
  )
}
