import { useParams, Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import type { BlogPost } from '../types'
import { getBlogPost } from '../firebase/blogService'

export default function BlogPost() {
  const { id } = useParams()
  const [post, setPost] = useState<BlogPost | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
      <div className="container mx-auto px-4 py-8">
        <Link
          to="/blog"
          className="text-green-600 hover:text-green-800 mb-4 inline-block"
        >
          ← Back to Blog
        </Link>
        <div className="text-center py-8">Loading...</div>
      </div>
    )
  }

  if (error || !post) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Link
          to="/blog"
          className="text-green-600 hover:text-green-800 mb-4 inline-block"
        >
          ← Back to Blog
        </Link>
        <h1 className="text-4xl font-bold mb-8">Post Not Found</h1>
        <div className="text-red-600">{error}</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Link
        to="/blog"
        className="text-green-600 hover:text-green-800 mb-4 inline-block"
      >
        ← Back to Blog
      </Link>
      <article className="bg-soft-white rounded-lg shadow-md p-6">
        <h1 className="text-4xl  text-black font-bold mb-4">{post.title}</h1>
        <div className="text-sm text-black mb-6">
          <span>By {post.author}</span>
          <span className="mx-2">•</span>
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
