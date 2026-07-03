import { useState, useEffect } from 'react'
import Sidebar from './components/Sidebar.jsx'
import Login from './pages/Login.jsx'
import Dashboard from './pages/Dashboard.jsx'
import BrandBrain from './pages/BrandBrain.jsx'
import AssetLibrary from './pages/AssetLibrary.jsx'
import TrendFinder from './pages/TrendFinder.jsx'
import PostStudio from './pages/PostStudio.jsx'
import VideoHub from './pages/VideoHub.jsx'
import Calendar from './pages/Calendar.jsx'
import './App.css'

const PASSCODE = '1234'

const DEFAULT_BRAND = {
  id: 'brand-1',
  name: 'My Brand',
  industry: '',
  tone: 'friendly',
  description: '',
  website: '',
  logo: null, // URL or base64
  colors: [],
  createdAt: Date.now()
}

// ── localStorage helpers ──────────────────────────────────────────────────────
function loadFromStorage(key, fallback) {
  try {
    const val = localStorage.getItem(key)
    return val ? JSON.parse(val) : fallback
  } catch { return fallback }
}

function saveToStorage(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)) } catch(e) { console.warn('localStorage full:', e) }
}

export default function App() {
  const [loggedIn, setLoggedIn] = useState(() => loadFromStorage('bp_loggedIn', false))
  const [currentPage, setCurrentPage] = useState('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [selectedTrend, setSelectedTrend] = useState(null)

  // ── Brands — persisted per brand, brand-specific assets ───────────────────
  const [brands, setBrands] = useState(() => loadFromStorage('bp_brands', [DEFAULT_BRAND]))
  const [activeBrandId, setActiveBrandId] = useState(() => loadFromStorage('bp_activeBrandId', 'brand-1'))

  // ── Assets — stored per brand ─────────────────────────────────────────────
  const [allAssets, setAllAssets] = useState(() => loadFromStorage('bp_allAssets', {}))

  // Active brand object
  const activeBrand = brands.find(b => b.id === activeBrandId) ?? brands[0]

  // Assets for the active brand only
  const assets = allAssets[activeBrandId] ?? []
  const setAssets = (updater) => {
    setAllAssets(prev => {
      const current = prev[activeBrandId] ?? []
      const next = typeof updater === 'function' ? updater(current) : updater
      const updated = { ...prev, [activeBrandId]: next }
      saveToStorage('bp_allAssets', updated)
      return updated
    })
  }

  // Persist brands
  useEffect(() => { saveToStorage('bp_brands', brands) }, [brands])
  useEffect(() => { saveToStorage('bp_activeBrandId', activeBrandId) }, [activeBrandId])
  useEffect(() => { saveToStorage('bp_loggedIn', loggedIn) }, [loggedIn])

  const updateBrand = (updates) => {
    setBrands(prev => prev.map(b => b.id === activeBrandId ? { ...b, ...updates } : b))
  }

  const addBrand = () => {
    const newBrand = { ...DEFAULT_BRAND, id: 'brand-' + Date.now(), name: 'New Brand', createdAt: Date.now() }
    setBrands(prev => [...prev, newBrand])
    setActiveBrandId(newBrand.id)
  }

  const deleteBrand = (id) => {
    if (brands.length <= 1) return
    setBrands(prev => prev.filter(b => b.id !== id))
    setAllAssets(prev => { const n = {...prev}; delete n[id]; return n })
    if (activeBrandId === id) setActiveBrandId(brands.find(b => b.id !== id)?.id ?? brands[0].id)
  }

  const navigate = (page, data) => {
    if (page === 'post-studio' && data?.trend) setSelectedTrend(data.trend)
    setCurrentPage(page)
  }

  if (!loggedIn) {
    return <Login passcode={PASSCODE} onLogin={() => setLoggedIn(true)} />
  }

  const pageProps = {
    brand: activeBrand,
    onBrandUpdate: updateBrand,
    assets,
    onAssetsChange: setAssets,
    onNavigate: navigate,
  }

  return (
    <div className="app-layout">
      <Sidebar
        currentPage={currentPage}
        onNavigate={page => setCurrentPage(page)}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(v => !v)}
        brands={brands}
        activeBrandId={activeBrandId}
        onBrandSwitch={setActiveBrandId}
        onAddBrand={addBrand}
        onDeleteBrand={deleteBrand}
      />
      <main className={`main-content ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
        {currentPage === 'dashboard'     && <Dashboard {...pageProps} />}
        {currentPage === 'brand-brain'   && <BrandBrain {...pageProps} />}
        {currentPage === 'asset-library' && <AssetLibrary {...pageProps} />}
        {currentPage === 'trend-finder'  && <TrendFinder {...pageProps} />}
        {currentPage === 'post-studio'   && <PostStudio {...pageProps} selectedTrend={selectedTrend} />}
        {currentPage === 'video-hub'     && <VideoHub {...pageProps} />}
        {currentPage === 'calendar'      && <Calendar {...pageProps} />}
      </main>
    </div>
  )
}
