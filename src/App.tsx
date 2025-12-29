import { useEffect } from 'react'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom'

import { Sidebar, TopBar } from './components'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AuthProvider } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'

import {
  Contact,
  Login,
  ArtworkGrid,
  AddArtwork,
  ArtworkDetail,
  About,
  Blog,
  BlogPost,
  BlogPostForm,
  EditArtwork,
  EditArtworkGrid
} from './pages'

const isDev = import.meta.env.DEV

function App() {
  useEffect(() => {
    const originalTitle = document.title
    document.title = isDev ? 'STAGING' : originalTitle
    return () => {
      document.title = originalTitle
    }
  }, [])

  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <div className="min-h-screen">
            <TopBar />
            <Sidebar />
            <div className="lg:pl-64 pt-16 lg:pt-0" id="main-content">
              <Routes>
                <Route path="/" element={<About />} />
                <Route path="/about" element={<About />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/login" element={<Login />} />

                {/* Gallery routes - specific paths first */}
                <Route path="/gallery" element={<ArtworkGrid />} />
                <Route
                  path="/gallery/add"
                  element={
                    <ProtectedRoute adminOnly>
                      <AddArtwork />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/gallery/manage"
                  element={
                    <ProtectedRoute adminOnly>
                      <EditArtworkGrid />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/gallery/:slug/edit"
                  element={
                    <ProtectedRoute adminOnly>
                      <EditArtwork />
                    </ProtectedRoute>
                  }
                />
                <Route path="/gallery/:slug" element={<ArtworkDetail />} />

                {/* Blog routes - specific paths first */}
                <Route path="/blog" element={<Blog />} />
                <Route
                  path="/blog/create"
                  element={
                    <ProtectedRoute adminOnly>
                      <BlogPostForm />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/blog/:id/edit"
                  element={
                    <ProtectedRoute adminOnly>
                      <BlogPostForm />
                    </ProtectedRoute>
                  }
                />
                <Route path="/blog/:id" element={<BlogPost />} />
              </Routes>
            </div>
          </div>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
