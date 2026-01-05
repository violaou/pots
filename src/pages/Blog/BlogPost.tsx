import { useEffect, useState } from 'react'
import Markdown from 'react-markdown'
import { useNavigate, useParams } from 'react-router-dom'

import { BackToBlog } from '../../components/BackToBlog'
import { useAuth } from '../../contexts/AuthContext'
import { deleteBlogPost, getBlogPost } from '../../services/blog-service'
import { theme } from '../../styles/theme'
import type { BlogPost } from '../../types'

export default function BlogPostPage() {
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
        <h1 className={`text-4xl font-bold mb-8 text-center ${theme.text.h1}`}>
          Post Not Found 😔
        </h1>
        {BackToBlog}
      </div>
    )
  }

  const inAdmin = !authLoading && isAuthenticated && !adminLoading && isAdmin

  return (
    <div className={theme.layout.container}>
      {BackToBlog}
      {inAdmin && (
        <div className="flex gap-3 mb-4">
          <button
            onClick={() => navigate(`/blog/${id}/edit`)}
            className={theme.button.accent}
          >
            Edit
          </button>
          <button
            onClick={async () => {
              if (!id) return
              if (!window.confirm('Delete this post? This cannot be undone.'))
                return

              try {
                await deleteBlogPost(id)
                navigate('/blog')
              } catch (err) {
                console.error(err)
                alert('Failed to delete post')
              }
            }}
            className={theme.button.dangerSolid}
          >
            Delete
          </button>
        </div>
      )}
      <article className={`${theme.section} shadow-md`}>
        <h1 className={`text-4xl ${theme.text.h1} font-bold mb-4`}>
          {post.title}
        </h1>
        <div className={`text-sm ${theme.text.muted} mb-6`}>
          <span>{new Date(post.date).toLocaleDateString()}</span>
        </div>
        {post.imageUrl && (
          <img
            src={post.imageUrl}
            alt={post.title}
            className="w-full max-h-[50vw] object-contain rounded-lg mb-6"
          />
        )}
        <div className="prose prose-neutral dark:prose-invert max-w-none">
          <Markdown>{post.content}</Markdown>
        </div>
        {post.tags && (
          <div className="flex gap-2 mt-6">
            {post.tags.map((tag) => (
              <span key={tag} className={theme.tag}>
                {tag}
              </span>
            ))}
          </div>
        )}
      </article>
    </div>
  )
}
