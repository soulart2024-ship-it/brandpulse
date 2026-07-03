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
  logo: null,
  colors: [],
  tagline: ''
}

function loadFromStorage(key, fallback) {
  try {
    const val = localStorage.getItem(key)
    return val ? JSON.parse(val) : fallback
  } catch { return fallback }
}

function saveToStorage(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)) } catch(e) { console.warn('Storage full', e) }
}

export default function App() {
  const [loggedIn, setLoggedIn] = useState(() => loadFromStorage('bp_loggedIn', false))
  const [currentPage, setCurrentPage] = useState('dashboard')
  const [selectedTrend, setSelectedTrend] = useState(null)

  // Brands — persisted, with safe defaults merged in
  const [brands, setBrands] = useState(() => {
    const saved = loadFromStorage('bp_brands', null)
    if (!saved) return [{ ...DEFAULT_BRAND }]
    return saved.map(b => ({ ...DEFAULT_BRAND, ...b }))
  })
  const [activeBrandId, setActiveBrandId] = useState(() =>
    loadFromStorage('bp_activeBrandId', 'brand-1')
  )

  // Assets per brand
  const [allAssets, setAllAssets] = useState(() =>
    loadFromStorage('bp_allAssets', {})
  )

  const activeBrand = brands.find(b => b.id === activeBrandId) ?? { ...DEFAULT_BRAND, ...brands[0] }
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

  // Persist on change
  useEffect(() => { saveToStorage('bp_brands', brands) }, [brands])
  useEffect(() => { saveToStorage('bp_activeBrandId', activeBrandId) }, [activeBrandId])
  useEffect(() => { saveToStorage('bp_loggedIn', loggedIn) }, [loggedIn])

  const updateBrand = (updates) => {
    setBrands(prev => prev.map(b =>
      b.id === activeBrandId ? { ...b, ...updates } : b
    ))
  }

  const addBrand = () => {
    const nb = { ...DEFAULT_BRAND, id: 'brand-' + Date.now(), name: 'New Brand' }
    setBrands(prev => [...prev, nb])
    setActiveBrandId(nb.id)
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
        onNavigate={navigate}
        brands={brands}
        activeBrandId={activeBrandId}
        onBrandSwitch={id => setActiveBrandId(id)}
        onAddBrand={addBrand}
      />
      <main className="main-content">
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
