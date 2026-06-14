import { useState, useCallback } from 'react'
import Login from './pages/Login.jsx'
import Dashboard from './pages/Dashboard.jsx'
import BrandBrain from './pages/BrandBrain.jsx'
import AssetLibrary from './pages/AssetLibrary.jsx'
import TrendFinder from './pages/TrendFinder.jsx'
import PostStudio from './pages/PostStudio.jsx'
import VideoHub from './pages/VideoHub.jsx'
import Calendar from './pages/Calendar.jsx'
import Sidebar from './components/Sidebar.jsx'
import './App.css'

const PASSCODE = '1234'

export default function App() {
  const [authed, setAuthed] = useState(false)
  const [page, setPage] = useState('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [brands, setBrands] = useState({})
  const [activeBrandId, setActiveBrandId] = useState(null)
  const [assets, setAssets] = useState([])
  const [selectedTrend, setSelectedTrend] = useState(null)

  const handleLogin = useCallback((code) => {
    if (code === PASSCODE) setAuthed(true)
  }, [])

  const saveBrand = (brandData) => {
    const id = activeBrandId || Date.now().toString()
    setBrands(prev => ({ ...prev, [id]: brandData }))
    setActiveBrandId(id)
  }

  const addNewBrand = () => { setActiveBrandId(null); setPage('brand') }
  const switchBrand = (id) => { setActiveBrandId(id); setPage('dashboard') }
  const deleteBrand = (id) => {
    setBrands(prev => { const u = { ...prev }; delete u[id]; return u })
    if (activeBrandId === id) {
      const rem = Object.keys(brands).filter(k => k !== id)
      setActiveBrandId(rem[0] ?? null)
    }
  }

  const handleSelectTrend = (trend) => {
    setSelectedTrend(trend)
    setPage('studio')
  }

  const activeBrand = activeBrandId ? brands[activeBrandId] : null

  if (!authed) return <Login onLogin={handleLogin} />

  const pages = {
    dashboard: <Dashboard onNavigate={setPage} brand={activeBrand} />,
    brand: <BrandBrain brand={activeBrand} onSave={saveBrand} />,
    assets: <AssetLibrary assets={assets} onAssetsChange={setAssets} brand={activeBrand} />,
    trends: <TrendFinder brand={activeBrand} onSelectTrend={handleSelectTrend} />,
    studio: <PostStudio brand={activeBrand} assets={assets} selectedTrend={selectedTrend} onNavigate={setPage} />,
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
        brand={activeBrand}
        brands={brands}
        activeBrandId={activeBrandId}
        onSwitchBrand={switchBrand}
        onAddBrand={addNewBrand}
        onDeleteBrand={deleteBrand}
      />
      <main className="main-content">
        <div className="page-wrapper animate-fade-in" key={page}>
          {pages[page] ?? pages.dashboard}
        </div>
      </main>
    </div>
  )
}
