import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import {
  ArtworkGrid,
  ArtworkDetail,
  UnderConstruction,
  TopBar,
  Sidebar
} from './components'
import { artworks } from './assets/artworks'
import { useEffect } from 'react'
import { Contact } from './pages/Contact'
import About from './pages/About'

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
    <Router>
      <div className="min-h-screen">
        <TopBar />
        <Sidebar />
        <div className="lg:pl-64 pt-16 lg:pt-0">
          <Routes>
            {/* <Route
              path="/"
              element={
                isDev ? (
                  <ArtworkGrid artworks={artworks} />
                ) : (
                  <UnderConstruction />
                )
              }
            /> */}
            <Route path="/" element={<About />} />
            <Route path="/artwork/:id" element={<ArtworkDetail />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
          </Routes>
        </div>
      </div>
    </Router>
  )
}

export default App
