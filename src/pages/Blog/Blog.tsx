import { ReactNode, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { useAuth } from '../../contexts/AuthContext'
import { getBlogPosts } from '../../services/blog-service'
import { theme } from '../../styles/theme'
import type { BlogPost } from '../../types'

function CreatePostButton() {
  const {
    isAuthenticated,
    isAdmin,
    adminLoading,
    loading: authLoading
  } = useAuth()

  if (authLoading) {
    return (
      <div className="w-32 h-10 bg-gray-200 dark:bg-gray-700 animate-pulse rounded-md" />
    )
  }

  if (!isAuthenticated || adminLoading || !isAdmin) return null

  return (
    <Link to="/blog/create" className={theme.button.accent}>
      Create New Post
    </Link>
  )
}

function BlogHeader() {
  const { isAuthenticated, loading: authLoading } = useAuth()

  return (
    <div className={theme.layout.header}>
      <h1 className={`text-4xl font-bold ${theme.text.h1}`}>Blog</h1>
      <div className="flex gap-3">
        <CreatePostButton />
        {!authLoading && !isAuthenticated && (
          <Link
            to="/login"
            className="bg-yellow-200 text-black px-4 py-2 rounded-md hover:bg-yellow-300"
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
    <div className={theme.layout.container}>
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
        <div className={`text-center py-8 ${theme.text.error}`}>{error}</div>
      </BlogLayout>
    )
  }

  if (posts.length === 0) {
    return (
      <BlogLayout>
        <div className={theme.state.empty}>
          <p className={`text-xl ${theme.text.muted} mb-4`}>
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
            <article className={`${theme.section} shadow-md flex gap-6`}>
              <div className="flex-1 min-w-0">
                <h2 className={`text-2xl font-semibold ${theme.text.h1} mb-2`}>
                  {post.title}
                </h2>
                <div className={`text-sm ${theme.text.muted} mb-4`}>
                  <span>{new Date(post.date).toLocaleDateString()}</span>
                </div>
                <p className={`${theme.text.body} mb-4 line-clamp-3`}>
                  {post.content}
                </p>
                {post.tags && (
                  <div className="flex gap-2">
                    {post.tags.map((tag) => (
                      <span key={tag} className={theme.tag}>
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              {post.imageUrl && (
                <div className="flex-shrink-0 w-32 h-32 md:w-40 md:h-40">
                  <img
                    src={post.imageUrl}
                    alt={post.title}
                    className={`${theme.image.cover} rounded-lg`}
                  />
                </div>
              )}
            </article>
          </Link>
        ))}
      </div>
    </BlogLayout>
  )
}
