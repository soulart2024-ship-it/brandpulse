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
  name: 'My Brand',
  industry: '',
  tone: 'friendly',
  description: '',
  website: '',
  logo: null,
  colors: [],
  tagline: ''
}

// ── localStorage helpers ──────────────────────────────────────────────────────
function load(key, fallback) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback } catch { return fallback }
}
function save(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)) } catch(e) { console.warn('Storage full', e) }
}

export default function App() {
  const [loggedIn, setLoggedIn]     = useState(() => load('bp_loggedIn', false))
  const [current, setCurrent]       = useState('dashboard')
  const [open, setOpen]             = useState(true)
  const [selectedTrend, setSelectedTrend] = useState(null)

  // brands = { id: { name, industry, tone, ... } }
  const [brands, setBrands]         = useState(() => load('bp_brands', { 'brand-1': { ...DEFAULT_BRAND } }))
  const [activeBrandId, setActiveBrandId] = useState(() => load('bp_activeBrandId', 'brand-1'))

  // assets per brand = { brandId: [...assets] }
  const [allAssets, setAllAssets]   = useState(() => load('bp_allAssets', {}))

  // Ensure activeBrandId always has an entry
  useEffect(() => {
    if (!brands[activeBrandId]) {
      const firstId = Object.keys(brands)[0]
      if (firstId) setActiveBrandId(firstId)
    }
  }, [activeBrandId, brands])

  // Persist
  useEffect(() => { save('bp_brands', brands) }, [brands])
  useEffect(() => { save('bp_activeBrandId', activeBrandId) }, [activeBrandId])
  useEffect(() => { save('bp_loggedIn', loggedIn) }, [loggedIn])

  const activeBrand = { ...DEFAULT_BRAND, ...(brands[activeBrandId] ?? {}) }
  const assets = allAssets[activeBrandId] ?? []

  const setAssets = (updater) => {
    setAllAssets(prev => {
      const current = prev[activeBrandId] ?? []
      const next = typeof updater === 'function' ? updater(current) : updater
      const updated = { ...prev, [activeBrandId]: next }
      save('bp_allAssets', updated)
      return updated
    })
  }

  const updateBrand = (updates) => {
    setBrands(prev => ({
      ...prev,
      [activeBrandId]: { ...DEFAULT_BRAND, ...(prev[activeBrandId] ?? {}), ...updates }
    }))
  }

  const addBrand = () => {
    const id = 'brand-' + Date.now()
    setBrands(prev => ({ ...prev, [id]: { ...DEFAULT_BRAND, name: 'New Brand' } }))
    setActiveBrandId(id)
  }

  const deleteBrand = (id) => {
    if (Object.keys(brands).length <= 1) return
    setBrands(prev => { const n = { ...prev }; delete n[id]; return n })
    setAllAssets(prev => { const n = { ...prev }; delete n[id]; return n })
    if (activeBrandId === id) {
      const remaining = Object.keys(brands).filter(k => k !== id)
      if (remaining[0]) setActiveBrandId(remaining[0])
    }
  }

  const navigate = (page, data) => {
    // Map sidebar IDs to page IDs
    const pageMap = {
      dashboard: 'dashboard',
      brand:     'brand-brain',
      assets:    'asset-library',
      trends:    'trend-finder',
      studio:    'post-studio',
      video:     'video-hub',
      calendar:  'calendar',
    }
    const target = pageMap[page] ?? page
    if (data?.trend) setSelectedTrend(data.trend)
    setCurrent(target)
  }

  // Map page names back to sidebar IDs for active state
  const sidebarCurrent = {
    'dashboard':     'dashboard',
    'brand-brain':   'brand',
    'asset-library': 'assets',
    'trend-finder':  'trends',
    'post-studio':   'studio',
    'video-hub':     'video',
    'calendar':      'calendar',
  }[current] ?? 'dashboard'

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
        current={sidebarCurrent}
        onNavigate={navigate}
        open={open}
        onToggle={() => setOpen(v => !v)}
        brand={activeBrand}
        brands={brands}
        activeBrandId={activeBrandId}
        onSwitchBrand={setActiveBrandId}
        onAddBrand={addBrand}
        onDeleteBrand={deleteBrand}
      />
      <main className="main-content">
        {current === 'dashboard'     && <Dashboard {...pageProps} />}
        {current === 'brand-brain'   && <BrandBrain {...pageProps} />}
        {current === 'asset-library' && <AssetLibrary {...pageProps} />}
        {current === 'trend-finder'  && <TrendFinder {...pageProps} />}
        {current === 'post-studio'   && <PostStudio {...pageProps} selectedTrend={selectedTrend} />}
        {current === 'video-hub'     && <VideoHub {...pageProps} />}
        {current === 'calendar'      && <Calendar {...pageProps} />}
      </main>
    </div>
  )
}
