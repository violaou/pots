import { useEffect } from 'react'
import { BrowserRouter as Router, Route,Routes } from 'react-router-dom'

import {
  ArtworkDetail,
  ArtworkGrid,
  Sidebar,
  TopBar,
  UnderConstruction} from './components'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AuthProvider } from './contexts/AuthContext'
import About from './pages/About'
import Blog from './pages/Blog'
import BlogPost from './pages/BlogPost'
import { Contact } from './pages/Contact'
import CreateBlogPost from './pages/CreateBlogPost'
import { Login } from './pages/Login'

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
