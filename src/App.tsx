import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { ArtworkGrid } from './components/ArtworkGrid';
import { ArtworkDetail } from './components/ArtworkDetail';
import { artworks } from './data/artworks';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-white">
        <Sidebar />
        <TopBar />
        
        <main className="lg:pl-64 pt-16 lg:pt-0">
          <Routes>
            <Route path="/" element={<ArtworkGrid artworks={artworks} />} />
            <Route path="/artwork/:id" element={<ArtworkDetail />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;