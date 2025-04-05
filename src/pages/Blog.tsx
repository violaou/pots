import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import type { BlogPost } from '../types'
import { getBlogPosts } from '../firebase/blogService'

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
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold">Blog</h1>
          <Link
            to="/blog/create"
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Create New Post
          </Link>
        </div>
        <div className="text-center py-8">Loading...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold">Blog</h1>
          <Link
            to="/blog/create"
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Create New Post
          </Link>
        </div>
        <div className="text-center text-red-600 py-8">{error}</div>
      </div>
    )
  }

  if (posts.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold">Blog</h1>
          <Link
            to="/blog/create"
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Create New Post
          </Link>
        </div>
        <div className="text-center py-12">
          <p className="text-xl text-gray-600 mb-4">
            Looks like there are no blog posts yet!
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold">Blog</h1>
        <Link
          to="/blog/create"
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Create New Post
        </Link>
      </div>
      <div className="grid gap-8">
        {posts.map((post) => (
          <Link
            key={post.id}
            to={`/blog/${post.id}`}
            className="block hover:shadow-lg transition-shadow duration-200"
          >
            <article className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-semibold mb-2">{post.title}</h2>
              <div className="text-sm text-gray-600 mb-4">
                <span>By {post.author}</span>
                <span className="mx-2">•</span>
                <span>{new Date(post.date).toLocaleDateString()}</span>
              </div>
              <p className="text-gray-700 mb-4">{post.excerpt}</p>
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
    </div>
  )
}
