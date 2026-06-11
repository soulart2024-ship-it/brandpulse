import { useState, useCallback } from 'react'
import Login from './pages/Login.jsx'
import Dashboard from './pages/Dashboard.jsx'
import BrandBrain from './pages/BrandBrain.jsx'
import AssetLibrary from './pages/AssetLibrary.jsx'
import TrendFinder from './pages/TrendFinder.jsx'
import ContentGenerator from './pages/ContentGenerator.jsx'
import ImageStudio from './pages/ImageStudio.jsx'
import MotionCards from './pages/MotionCards.jsx'
import Storyboard from './pages/Storyboard.jsx'
import VideoHub from './pages/VideoHub.jsx'
import Calendar from './pages/Calendar.jsx'
import Sidebar from './components/Sidebar.jsx'
import './App.css'

const PASSCODE = '1234' // Change this — or load from env via meta tag

export default function App() {
  const [authed, setAuthed] = useState(false)
  const [page, setPage] = useState('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [brand, setBrand] = useState(null)

  const handleLogin = useCallback((code) => {
    if (code === PASSCODE) setAuthed(true)
  }, [])

  if (!authed) return <Login onLogin={handleLogin} />

  const pages = {
    dashboard: <Dashboard onNavigate={setPage} brand={brand} />,
    brand: <BrandBrain brand={brand} onSave={setBrand} />,
    assets: <AssetLibrary brand={brand} />,
    trends: <TrendFinder brand={brand} />,
    content: <ContentGenerator brand={brand} />,
    images: <ImageStudio brand={brand} />,
    motion: <MotionCards brand={brand} />,
    storyboard: <Storyboard brand={brand} />,
    video: <VideoHub />,
    calendar: <Calendar />,
  }

  return (
    <div className={`app-shell ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
      <Sidebar
        current={page}
        onNavigate={setPage}
        open={sidebarOpen}
        onToggle={() => setSidebarOpen(o => !o)}
        brand={brand}
      />
      <main className="main-content">
        <div className="page-wrapper animate-fade-in" key={page}>
          {pages[page] ?? pages.dashboard}
        </div>
      </main>
    </div>
  )
}
