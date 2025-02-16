import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { ArtworkGrid } from './components/ArtworkGrid'
import { ArtworkDetail } from './components/ArtworkDetail'
import { UnderConstruction } from './components/UnderConstruction'
import { TopBar } from './components/TopBar'
import { Sidebar } from './components/Sidebar'
import { artworks } from './data/artworks'

const isDev = import.meta.env.DEV
function App() {
  if (!isDev) {
    return (
      <Router>
        <div className="min-h-screen bg-white">
          <UnderConstruction />
        </div>
      </Router>
    )
  }

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <TopBar />
        <Sidebar />

        <div className="lg:pl-64 pt-16 lg:pt-0">
          <main>
            <Routes>
              <Route path="/" element={<ArtworkGrid artworks={artworks} />} />
              <Route path="/artwork/:id" element={<ArtworkDetail />} />
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  )
}

export default App
