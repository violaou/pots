import { useEffect } from 'react'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom'

import { ArtworkDetail, Sidebar, TopBar, UnderConstruction } from './components'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AuthProvider } from './contexts/AuthContext'

import {
  Contact,
  Login,
  ArtworkGrid,
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
    <AuthProvider>
      <Router>
        <div className="min-h-screen">
          <TopBar />
          <Sidebar />
          <div className="lg:pl-64 pt-16 lg:pt-0" id="main-content">
            <Routes>
              <Route
                path="/gallery"
                element={isDev ? <ArtworkGrid /> : <UnderConstruction />}
              />
              <Route path="/" element={<About />} />
              <Route path="/gallery/:slug" element={<ArtworkDetail />} />
              <Route
                path="/gallery/:slug/edit"
                element={
                  <ProtectedRoute adminOnly>
                    <EditArtwork />
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
              <Route path="/about" element={<About />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/blog" element={<Blog />} />
              <Route path="/blog/:id" element={<BlogPost />} />
              <Route
                path="/blog/:id/edit"
                element={
                  <ProtectedRoute adminOnly>
                    <BlogPostForm />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/blog/create"
                element={
                  <ProtectedRoute adminOnly>
                    <BlogPostForm />
                  </ProtectedRoute>
                }
              />
              <Route path="/login" element={<Login />} />
            </Routes>
          </div>
        </div>
      </Router>
    </AuthProvider>
  )
}

export default App
