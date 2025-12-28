import { ReactNode, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { useAuth } from '../../contexts/AuthContext'
import { getBlogPosts } from '../../services/blog-service'
import type { BlogPost } from '../../types'

function CreatePostButton() {
  const {
    isAuthenticated,
    isAdmin,
    adminLoading,
    loading: authLoading
  } = useAuth()

  if (authLoading) {
    return <div className="w-32 h-10 bg-gray-200 animate-pulse rounded-md" />
  }

  if (!isAuthenticated || adminLoading || !isAdmin) {
    return null
  }

  return (
    <Link
      to="/blog/create"
      className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
    >
      Create New Post
    </Link>
  )
}

function BlogHeader() {
  const { isAuthenticated, loading: authLoading } = useAuth()

  return (
    <div className="flex justify-between items-center mb-8">
      <h1 className="text-4xl font-bold text-gray-900">Blog</h1>
      <div className="flex gap-3">
        <CreatePostButton />
        {!authLoading && !isAuthenticated && (
          <Link
            to="/login"
            className="bg-yellow-200 text-black px-4 py-2 rounded-md hover:bg-yellow-300 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2"
          >
            Login
          </Link>
        )}
      </div>
    </div>
  )
}

function BlogLayout({ children }: { children: ReactNode }) {
  return (
    <div className="container mx-auto px-4 py-8">
      <BlogHeader />
      {children}
    </div>
  )
}

export default function Blog() {
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchPosts() {
      try {
        const blogPosts = await getBlogPosts()
        setPosts(blogPosts)
      } catch (err) {
        setError('Failed to load blog posts')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchPosts()
  }, [])

  if (loading) {
    return (
      <BlogLayout>
        <div className="text-center py-8" />
      </BlogLayout>
    )
  }

  if (error) {
    return (
      <BlogLayout>
        <div className="text-center text-red-600 py-8">{error}</div>
      </BlogLayout>
    )
  }

  if (posts.length === 0) {
    return (
      <BlogLayout>
        <div className="text-center py-12">
          <p className="text-xl text-gray-600 mb-4">
            Looks like there are no blog posts yet!
          </p>
        </div>
      </BlogLayout>
    )
  }

  return (
    <BlogLayout>
      <div className="grid gap-8">
        {posts.map((post) => (
          <Link
            key={post.id}
            to={`/blog/${post.id}`}
            className="block hover:shadow-lg transition-shadow duration-200"
          >
            <article className="bg-soft-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-semibold mb-2">{post.title}</h2>
              <div className="text-sm text-black mb-4">
                <span>By {post.author}</span>
                <span className="mx-2">•</span>
                <span>{new Date(post.date).toLocaleDateString()}</span>
              </div>
              <p className="text-black mb-4 line-clamp-3">{post.content}</p>
              {post.tags && (
                <div className="flex gap-2">
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
          </Link>
        ))}
      </div>
    </BlogLayout>
  )
}
