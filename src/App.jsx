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

function load(key, fallback) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback } 
  catch { return fallback }
}

function save(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)) } 
  catch(e) { console.warn('Storage full', e) }
}

// Safely load brands — handles both old array format and new object format
function loadBrands() {
  const saved = load('bp_brands', null)
  if (!saved) return { 'brand-1': { ...DEFAULT_BRAND } }
  // Old format was an array
  if (Array.isArray(saved)) {
    const obj = {}
    saved.forEach(b => { if (b && b.id) obj[b.id] = { ...DEFAULT_BRAND, ...b } })
    return Object.keys(obj).length > 0 ? obj : { 'brand-1': { ...DEFAULT_BRAND } }
  }
  // New format is an object
  if (typeof saved === 'object' && saved !== null) {
    // Ensure all brands have defaults merged in
    const obj = {}
    Object.entries(saved).forEach(([id, b]) => { obj[id] = { ...DEFAULT_BRAND, ...b } })
    return Object.keys(obj).length > 0 ? obj : { 'brand-1': { ...DEFAULT_BRAND } }
  }
  return { 'brand-1': { ...DEFAULT_BRAND } }
}

export default function App() {
  const [loggedIn, setLoggedIn]           = useState(() => load('bp_loggedIn', false))
  const [current, setCurrent]             = useState('dashboard')
  const [open, setOpen]                   = useState(true)
  const [selectedTrend, setSelectedTrend] = useState(null)
  const [brands, setBrands]               = useState(loadBrands)
  const [activeBrandId, setActiveBrandId] = useState(() => {
    const saved = load('bp_activeBrandId', 'brand-1')
    return saved
  })
  const [allAssets, setAllAssets]         = useState(() => load('bp_allAssets', {}))

  // Persist on change
  useEffect(() => { save('bp_loggedIn', loggedIn) }, [loggedIn])
  useEffect(() => { save('bp_brands', brands) }, [brands])
  useEffect(() => { save('bp_activeBrandId', activeBrandId) }, [activeBrandId])

  // Ensure activeBrandId is valid
  const validBrandId = brands[activeBrandId] ? activeBrandId : Object.keys(brands)[0] ?? 'brand-1'
  const activeBrand = { ...DEFAULT_BRAND, ...(brands[validBrandId] ?? {}) }
  const assets = allAssets[validBrandId] ?? []

  const setAssets = (updater) => {
    setAllAssets(prev => {
      const cur = prev[validBrandId] ?? []
      const next = typeof updater === 'function' ? updater(cur) : updater
      const updated = { ...prev, [validBrandId]: next }
      save('bp_allAssets', updated)
      return updated
    })
  }

  const updateBrand = (updates) => {
    setBrands(prev => ({
      ...prev,
      [validBrandId]: { ...DEFAULT_BRAND, ...(prev[validBrandId] ?? {}), ...updates }
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

  // Navigate handles BOTH sidebar short IDs ('studio') AND full page names ('post-studio')
  const navigate = (page, data) => {
    const pageMap = {
      // Sidebar short IDs
      'brand':   'brand-brain',
      'assets':  'asset-library',
      'trends':  'trend-finder',
      'studio':  'post-studio',
      'video':   'video-hub',
      // Full page names pass through unchanged
      'dashboard':     'dashboard',
      'brand-brain':   'brand-brain',
      'asset-library': 'asset-library',
      'trend-finder':  'trend-finder',
      'post-studio':   'post-studio',
      'video-hub':     'video-hub',
      'calendar':      'calendar',
    }
    const target = pageMap[page] ?? page
    if (data?.trend) setSelectedTrend(data.trend)
    setCurrent(target)
  }

  // Map current page back to sidebar active ID
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
    brand:          activeBrand,
    onBrandUpdate:  updateBrand,
    assets,
    onAssetsChange: setAssets,
    onNavigate:     navigate,
  }

  return (
    <div className="app-shell">
      <Sidebar
        current={sidebarCurrent}
        onNavigate={navigate}
        open={open}
        onToggle={() => setOpen(v => !v)}
        brand={activeBrand}
        brands={brands}
        activeBrandId={validBrandId}
        onSwitchBrand={setActiveBrandId}
        onAddBrand={addBrand}
        onDeleteBrand={deleteBrand}
      />
      <main className="main-content">
        {current === 'dashboard'     && <Dashboard     {...pageProps} />}
        {current === 'brand-brain'   && <BrandBrain    {...pageProps} />}
        {current === 'asset-library' && <AssetLibrary  {...pageProps} />}
        {current === 'trend-finder'  && <TrendFinder   {...pageProps} />}
        {current === 'post-studio'   && <PostStudio    {...pageProps} selectedTrend={selectedTrend} />}
        {current === 'video-hub'     && <VideoHub      {...pageProps} />}
        {current === 'calendar'      && <Calendar      {...pageProps} />}
      </main>
    </div>
  )
}
