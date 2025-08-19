import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import {
  ArtworkGrid,
  ArtworkDetail,
  UnderConstruction,
  TopBar,
  Sidebar
} from './components'
import { useEffect } from 'react'
import { Contact } from './pages/Contact'
import About from './pages/About'
import Blog from './pages/Blog'
import BlogPost from './pages/BlogPost'
import CreateBlogPost from './pages/CreateBlogPost'
import { Login } from './pages/Login'
import { AuthProvider } from './contexts/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'

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
              <Route path="/about" element={<About />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/blog" element={<Blog />} />
              <Route path="/blog/:id" element={<BlogPost />} />
              <Route
                path="/blog/create"
                element={
                  <ProtectedRoute adminOnly>
                    <CreateBlogPost />
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
