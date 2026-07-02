import { useState, useRef, useEffect, useCallback } from 'react'
import { Palette, Sparkles, Download, Send, Check, ChevronRight, ChevronLeft,
         Image, Edit2, Type, Upload, TrendingUp, X,
         Search, Package, Wand2, RefreshCw, Link } from 'lucide-react'
import { callClaude, extractJSON } from '../lib/api.js'
import './Page.css'
import './PostStudio.css'

const PLATFORMS = ['Instagram', 'TikTok', 'LinkedIn', 'Facebook', 'X (Twitter)', 'Pinterest']
const FORMATS = [
  { id: 'square',    label: '1:1 Square',  pw: 320, ph: 320 },
  { id: 'story',     label: '9:16 Story',  pw: 180, ph: 320 },
  { id: 'landscape', label: '16:9 Banner', pw: 320, ph: 180 },
]
const STEPS = ['Product', 'Scene', 'Posts']

async function toBase64(url) {
  const res = await fetch(url)
  const blob = await res.blob()
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

// ── Text helpers ──────────────────────────────────────────────────────────────
function fitOneLine(ctx, text, x, y, maxW, maxPx, weight, family = 'Space Grotesk') {
  if (!text) return
  let sz = maxPx
  ctx.font = `${weight} ${sz}px "${family}",sans-serif`
  while (ctx.measureText(text).width > maxW && sz > 7) {
    sz--
    ctx.font = `${weight} ${sz}px "${family}",sans-serif`
  }
  ctx.fillText(text, x, y)
}

function twoLines(ctx, text, x, y, maxW, lineH, weight, size, family = 'Inter') {
  if (!text) return
  ctx.font = `${weight} ${size}px "${family}",sans-serif`
  const words = text.split(' ')
  let line = '', cy = y, drawn = 0
  for (let i = 0; i < words.length; i++) {
    const test = line + words[i] + ' '
    if (ctx.measureText(test).width > maxW && i > 0) {
      ctx.fillText(line.trim(), x, cy)
      line = words[i] + ' '; cy += lineH; drawn++
      if (drawn >= 1) {
        let last = (line + words.slice(i + 1).join(' ')).trim()
        while (ctx.measureText(last + '…').width > maxW && last.length > 2) last = last.slice(0, -1)
        ctx.fillText(last + (words.length > i + 1 ? '…' : ''), x, cy)
        return
      }
    } else line = test
  }
  ctx.fillText(line.trim(), x, cy)
}

// ── TEMPLATE 1: Clean Strip ───────────────────────────────────────────────────
// Photo top 62% (hard clip) | Solid accent strip bottom 38% | ALL text in strip
function drawCleanStrip(ctx, w, h, img, post, brand, accent) {
  const SPLIT = 0.62  // IMMUTABLE — image zone / text zone boundary

  // Background
  ctx.fillStyle = '#0F0A1E'; ctx.fillRect(0, 0, w, h)

  // Image zone — strictly clipped, NOTHING escapes upward
  const imgH = h * SPLIT
  if (img) {
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, w, imgH); ctx.clip()
    const s = Math.max(w / img.width, imgH / img.height)
    const iw = img.width * s, ih = img.height * s
    ctx.drawImage(img, (w - iw) / 2, (imgH - ih) / 2, iw, ih)
    ctx.restore()
  }

  // Fade line between zones
  const fadeGrad = ctx.createLinearGradient(0, imgH - 20, 0, imgH + 1)
  fadeGrad.addColorStop(0, 'rgba(0,0,0,0)'); fadeGrad.addColorStop(1, accent + 'FF')
  ctx.fillStyle = fadeGrad; ctx.fillRect(0, imgH - 20, w, 22)

  // Text strip — starts exactly at imgH, NOTHING above this line
  ctx.fillStyle = accent; ctx.fillRect(0, imgH, w, h - imgH)

  const stripH = h - imgH
  const pad = w * 0.07
  const tw = w - pad * 2
  const ty = imgH  // text zone top boundary

  // Kicker
  ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.textAlign = 'center'
  ctx.font = `600 ${Math.max(7, stripH * 0.11)}px "Space Grotesk",sans-serif`
  ctx.fillText((brand?.industry ?? '').toUpperCase().slice(0, 18), w / 2, ty + stripH * 0.19)

  // Headline — one line, auto-sized
  ctx.fillStyle = '#FFFFFF'
  fitOneLine(ctx, post.headline ?? '', w / 2, ty + stripH * 0.47, tw, Math.max(12, stripH * 0.22), '800')

  // Subtext — two lines max
  ctx.fillStyle = 'rgba(255,255,255,0.78)'; ctx.textAlign = 'center'
  twoLines(ctx, post.subtext ?? '', w / 2, ty + stripH * 0.66, tw, stripH * 0.13, '400', Math.max(8, stripH * 0.11))

  // Brand watermark
  ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.textAlign = 'right'
  ctx.font = `600 ${Math.max(6, h * 0.027)}px "Space Grotesk",sans-serif`
  ctx.fillText(brand?.name ?? '', w - 8, h - 6)
}

// ── TEMPLATE 2: Bold Side ─────────────────────────────────────────────────────
// Photo left 54% (hard clip) | Accent panel right 46% | ALL text in right panel
function drawBoldSide(ctx, w, h, img, post, brand, accent) {
  const VSPLIT = 0.54  // IMMUTABLE — left image / right text boundary

  ctx.fillStyle = '#0F0A1E'; ctx.fillRect(0, 0, w, h)

  // Image zone — strictly clipped to left side
  const imgW = w * VSPLIT
  if (img) {
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, imgW, h); ctx.clip()
    const s = Math.max(imgW / img.width, h / img.height)
    const iw = img.width * s, ih = img.height * s
    ctx.drawImage(img, (imgW - iw) / 2, (h - ih) / 2, iw, ih)
    ctx.restore()
  }

  // Right panel — solid accent
  ctx.fillStyle = accent; ctx.fillRect(imgW, 0, w - imgW, h)

  // Diagonal accent edge
  ctx.beginPath()
  ctx.moveTo(imgW - 18, 0); ctx.lineTo(imgW + 4, 0)
  ctx.lineTo(imgW + 4, h); ctx.lineTo(imgW - 18, h)
  ctx.fillStyle = accent; ctx.fill()

  // Text — right panel ONLY, safely inside
  const panelX = imgW + (w - imgW) * 0.1
  const panelW = (w - imgW) * 0.82
  const panelMidY = h * 0.44

  // Brand industry kicker
  ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.textAlign = 'left'
  ctx.font = `600 ${Math.max(7, h * 0.031)}px "Space Grotesk",sans-serif`
  ctx.fillText((brand?.industry ?? 'BRAND').toUpperCase().slice(0, 11), panelX, h * 0.15)

  // Divider
  ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(panelX, h * 0.19, panelW * 0.4, 1)

  // Headline — one line, auto-sized
  ctx.fillStyle = '#FFFFFF'
  fitOneLine(ctx, post.headline ?? '', panelX, panelMidY, panelW, Math.max(11, h * 0.066), '800', 'Space Grotesk')

  // Subtext
  ctx.fillStyle = 'rgba(255,255,255,0.78)'; ctx.textAlign = 'left'
  twoLines(ctx, post.subtext ?? '', panelX, panelMidY + h * 0.085, panelW, h * 0.044, '400', Math.max(8, h * 0.036))

  // CTA pill
  const ctaY = h * 0.75, ctaH = h * 0.09, ctaW = Math.min(panelW, 130)
  ctx.fillStyle = 'rgba(255,255,255,0.2)'; ctx.beginPath()
  ctx.roundRect(panelX, ctaY, ctaW, ctaH, 4); ctx.fill()
  ctx.fillStyle = '#FFF'
  fitOneLine(ctx, post.cta ?? 'Learn More', panelX + ctaW / 2, ctaY + ctaH * 0.67, ctaW - 10, Math.max(7, h * 0.033), '700', 'Space Grotesk')
  ctx.textAlign = 'center'

  // Brand
  ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.textAlign = 'right'
  ctx.font = `600 ${Math.max(6, h * 0.027)}px "Space Grotesk",sans-serif`
  ctx.fillText(brand?.name ?? '', w - 8, h - 7)
}

// ── TEMPLATE 3: Dark Base ─────────────────────────────────────────────────────
// Photo top 60% (hard clip) | Dark gradient strip bottom 40% | text in strip only
function drawDarkBase(ctx, w, h, img, post, brand, accent) {
  const SPLIT = 0.60  // IMMUTABLE

  ctx.fillStyle = '#0a0518'; ctx.fillRect(0, 0, w, h)

  const imgH = h * SPLIT
  if (img) {
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, w, imgH); ctx.clip()
    const s = Math.max(w / img.width, imgH / img.height)
    const iw = img.width * s, ih = img.height * s
    ctx.drawImage(img, (w - iw) / 2, (imgH - ih) / 2, iw, ih)
    ctx.restore()
  }

  // Dark strip — starts at imgH
  const darkGrad = ctx.createLinearGradient(0, imgH - 15, 0, h)
  darkGrad.addColorStop(0, 'rgba(10,5,24,0)'); darkGrad.addColorStop(0.15, 'rgba(10,5,24,0.95)'); darkGrad.addColorStop(1, 'rgba(10,5,24,1)')
  ctx.fillStyle = darkGrad; ctx.fillRect(0, imgH - 15, w, h - imgH + 15)

  // Accent bar
  ctx.fillStyle = accent; ctx.fillRect(0, imgH, w, 3)

  const stripH = h - imgH
  const pad = 14
  const tw = w - pad * 2
  const ty = imgH + 3  // strictly below accent bar

  // Kicker
  ctx.fillStyle = accent; ctx.textAlign = 'left'
  ctx.font = `700 ${Math.max(7, stripH * 0.1)}px "Space Grotesk",sans-serif`
  ctx.fillText((brand?.industry ?? '').toUpperCase().slice(0, 16), pad, ty + stripH * 0.18)

  // Headline — one line
  ctx.fillStyle = '#FFF'
  fitOneLine(ctx, post.headline ?? '', pad, ty + stripH * 0.43, tw, Math.max(12, stripH * 0.21), '700', 'Space Grotesk')
  ctx.textAlign = 'left'

  // Subtext
  ctx.fillStyle = 'rgba(255,255,255,0.7)'
  twoLines(ctx, post.subtext ?? '', pad, ty + stripH * 0.61, tw, stripH * 0.13, '400', Math.max(8, stripH * 0.1))

  // CTA pill
  const ctaW = Math.min(tw * 0.58, 130), ctaH = stripH * 0.18
  const ctaX = pad, ctaY = h - ctaH - 10
  ctx.fillStyle = accent; ctx.beginPath(); ctx.roundRect(ctaX, ctaY, ctaW, ctaH, ctaH / 2); ctx.fill()
  ctx.fillStyle = '#FFF'
  fitOneLine(ctx, post.cta ?? 'Learn More', ctaX + ctaW / 2, ctaY + ctaH * 0.67, ctaW - 10, Math.max(7, ctaH * 0.46), '700', 'Space Grotesk')
  ctx.textAlign = 'center'

  // Brand top right
  ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.textAlign = 'right'
  ctx.font = `600 ${Math.max(6, h * 0.027)}px "Space Grotesk",sans-serif`
  ctx.fillText(brand?.name ?? '', w - 10, 18)
}

const TEMPLATES = [
  { id: 'clean',  label: 'Clean Strip', draw: drawCleanStrip, accent: '#7C3AED' },
  { id: 'bold',   label: 'Bold Side',   draw: drawBoldSide,   accent: '#06B6D4' },
  { id: 'dark',   label: 'Dark Base',   draw: drawDarkBase,   accent: '#F472B6' },
]

export default function PostStudio({ brand, assets, onAssetsChange, selectedTrend, onNavigate }) {
  const [step, setStep] = useState(0)

  const [productUrl, setProductUrl] = useState('')
  const [productQuery, setProductQuery] = useState('')
  const [productInfo, setProductInfo] = useState(null)
  const [scrapingProduct, setScrapingProduct] = useState(false)
  const [searchingProduct, setSearchingProduct] = useState(false)
  const [productError, setProductError] = useState('')

  const [photoId, setPhotoId] = useState(null)
  const [photoUrl, setPhotoUrl] = useState('')
  const [platform, setPlatform] = useState(selectedTrend?.platform ?? 'Instagram')
  const [formatIdx, setFormatIdx] = useState(0)

  const [scenes, setScenes] = useState([])
  const [loadingScenes, setLoadingScenes] = useState(false)
  const [chosenScene, setChosenScene] = useState(null)
  const [customScene, setCustomScene] = useState('')
  const [generatingAI, setGeneratingAI] = useState(false)
  const [aiImageUrl, setAiImageUrl] = useState(null)
  const [aiError, setAiError] = useState('')

  const [generatingPosts, setGeneratingPosts] = useState(false)
  const [posts, setPosts] = useState([])
  const [chosen, setChosen] = useState(null)
  const [editing, setEditing] = useState(null)
  const [editVal, setEditVal] = useState('')
  const [accentColors, setAccentColors] = useState(['#7C3AED', '#06B6D4', '#F472B6'])

  const canvasRefs = useRef({})
  const imgCache = useRef({})
  const fileRef = useRef()
  const fmt = FORMATS[formatIdx]
  const photo = assets.find(a => a.id === photoId)

  const loadImage = useCallback((url) => new Promise((resolve) => {
    if (!url) { resolve(null); return }
    if (imgCache.current[url]) { resolve(imgCache.current[url]); return }
    const img = new window.Image()
    if (!url.startsWith('data:') && !url.startsWith('blob:')) img.crossOrigin = 'anonymous'
    img.onload = () => { imgCache.current[url] = img; resolve(img) }
    img.onerror = () => { console.warn('Image load failed:', url); resolve(null) }
    img.src = url
  }), [])

  const handleUpload = (files) => {
    const newOnes = Array.from(files).map(f => ({
      id: Date.now() + Math.random(), name: f.name, url: URL.createObjectURL(f),
      type: f.type, tags: [], caption: '', isAI: false
    }))
    onAssetsChange(prev => [...prev, ...newOnes])
    if (newOnes[0]) { setPhotoId(newOnes[0].id); setPhotoUrl(''); setAiImageUrl(null) }
  }

  const scrapeProductUrl = async () => {
    if (!productUrl) return
    setScrapingProduct(true); setProductInfo(null); setProductError('')
    try {
      const res = await fetch('/api/scrape-product', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: productUrl })
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setProductInfo(data.product)
    } catch (e) { setProductError(e.message || 'Could not read this URL.') }
    setScrapingProduct(false)
  }

  const searchProductByName = async () => {
    if (!productQuery) return
    setSearchingProduct(true); setProductInfo(null); setProductError('')
    try {
      const result = await callClaude({
        system: 'Search for the product and return JSON only: {"name":"...","brand":"...","tagline":"...","description":"...","benefits":["...","...","..."],"idealFor":"...","callToAction":"..."}',
        messages: [{ role: 'user', content: `Search for and summarise: ${productQuery}` }],
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        max_tokens: 800
      })
      setProductInfo(extractJSON(result))
    } catch { setProductError('Could not find that product.') }
    setSearchingProduct(false)
  }

  const fetchScenes = async () => {
    setLoadingScenes(true); setScenes([]); setChosenScene(null)
    try {
      const productCtx = productInfo ? `Product: ${productInfo.name}. ${productInfo.description?.slice(0, 80)}.` : ''
      const result = await callClaude({
        system: 'Return JSON only: { "scenes": [{ "label": "4 word label", "prompt": "Detailed lifestyle setting for product photography. Describe environment, lighting, props. e.g. Sunlit wooden kitchen counter with fresh herbs, warm morning light, clean wellness aesthetic", "mood": "one word" }] } — exactly 3 scenes.',
        messages: [{ role: 'user', content: `Platform: ${platform}. ${productCtx} Brand: ${brand?.name ?? ''}. Industry: ${brand?.industry ?? ''}. Suggest 3 lifestyle scene backgrounds for this product.` }],
        max_tokens: 600
      })
      const parsed = extractJSON(result)
      setScenes(parsed.scenes ?? [])
      if (parsed.scenes?.[0]) { setChosenScene(0); setCustomScene(parsed.scenes[0].prompt) }
    } catch { setScenes([]) }
    setLoadingScenes(false)
  }

  const generateAiImage = async () => {
    const hasPhoto = photo || photoUrl
    setGeneratingAI(true); setAiImageUrl(null); setAiError('')
    try {
      const prompt = customScene || scenes[chosenScene]?.prompt || 'professional lifestyle photography, clean natural light, wellness aesthetic'
      let body = { prompt, mode: 'create' }
      if (hasPhoto) {
        body.mode = 'edit'
        body.productName = productInfo?.name || photo?.name || 'product'
        if (photoUrl) {
          body.imageUrl = photoUrl
        } else if (photo) {
          body.imageBase64 = await toBase64(photo.url)
          body.imageType = photo.type || 'image/jpeg'
        }
      }
      const res = await fetch('/api/generate-image', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error || 'Image generation failed')
      setAiImageUrl(data.url)
      // Clear image cache so canvas redraws with new image
      imgCache.current = {}
    } catch (e) { setAiError(e.message || 'Check your GOOGLE_AI_KEY in Vercel.') }
    setGeneratingAI(false)
  }

  const generatePosts = async () => {
    setGeneratingPosts(true); setPosts([])
    try {
      const brandCtx = brand ? `Brand: ${brand.name}. Industry: ${brand.industry}. Tone: ${brand.tone}.` : ''
      const productCtx = productInfo
        ? `Product: ${productInfo.name}. Tagline: ${productInfo.tagline}. Description: ${productInfo.description}. Benefits: ${productInfo.benefits?.join('; ')}. Ideal for: ${productInfo.idealFor}.`
        : ''
      const result = await callClaude({
        system: 'Social media copywriter. Return JSON only: {"posts":[{"headline":"max 5 words","subtext":"max 10 words","caption":"full caption with emojis","hashtags":["tag1","tag2","tag3","tag4","tag5"],"cta":"2-3 words"}]} — exactly 3 variations.',
        messages: [{ role: 'user', content: `${brandCtx} ${productCtx} Platform: ${platform}. Create 3 post variations.` }],
        max_tokens: 1200
      })
      const parsed = extractJSON(result)
      setPosts(parsed.posts.slice(0, 3)); setStep(2)
    } catch (e) { console.error(e) }
    setGeneratingPosts(false)
  }

  const renderCanvas = useCallback(async (idx) => {
    const canvas = canvasRefs.current[idx]
    if (!canvas || !posts[idx]) return
    const ctx = canvas.getContext('2d')
    const { pw, ph } = fmt
    const tmpl = TEMPLATES[idx % TEMPLATES.length]
    const accent = accentColors[idx % 3]
    // Priority: AI image > uploaded photo > null (gradient only)
    const imageUrl = aiImageUrl || photo?.url || null
    const img = imageUrl ? await loadImage(imageUrl) : null
    tmpl.draw(ctx, pw, ph, img, posts[idx], brand, accent)
  }, [posts, fmt, aiImageUrl, photo, brand, accentColors, loadImage])

  useEffect(() => {
    if (posts.length) posts.forEach((_, i) => setTimeout(() => renderCanvas(i), 80 * i))
  }, [posts, renderCanvas])

  const startEdit = (idx, field, current) => { setEditing({ idx, field }); setEditVal(current ?? '') }
  const saveEdit = () => {
    if (!editing) return
    setPosts(prev => prev.map((p, i) => i === editing.idx ? { ...p, [editing.field]: editVal } : p))
    setEditing(null)
  }

  const download = async (idx) => {
    const off = document.createElement('canvas')
    off.width = fmt.pw * 2; off.height = fmt.ph * 2
    const ctx = off.getContext('2d'); ctx.scale(2, 2)
    const imageUrl = aiImageUrl || photo?.url || null
    const img = imageUrl ? await loadImage(imageUrl) : null
    TEMPLATES[idx % TEMPLATES.length].draw(ctx, fmt.pw, fmt.ph, img, posts[idx], brand, accentColors[idx % 3])
    const a = document.createElement('a')
    a.download = `brandpulse-${TEMPLATES[idx % TEMPLATES.length].id}-${Date.now()}.png`
    a.href = off.toDataURL('image/png'); a.click()
  }

  const reset = () => {
    setStep(0); setPosts([]); setChosen(null)
    setProductInfo(null); setProductUrl(''); setProductQuery('')
    setAiImageUrl(null); setPhotoUrl(''); setScenes([])
    setChosenScene(null); setCustomScene('')
  }

  return (
    <div className="page">
      <div className="page-header">
        <Palette size={24} className="page-icon-violet" />
        <div>
          <h2>Post Studio</h2>
          <p>Real product photo + Nano Banana AI scene + clean text layouts.</p>
        </div>
      </div>

      <div className="steps-bar">
        {STEPS.map((s, i) => (
          <div key={s} className={`step ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`}>
            <div className="step-num">{i < step ? <Check size={12} /> : i + 1}</div>
            <span>{s}</span>
            {i < STEPS.length - 1 && <ChevronRight size={14} className="step-arrow" />}
          </div>
        ))}
      </div>

      {/* STEP 0 — Product */}
      {step === 0 && (
        <div className="studio-step animate-slide-up">
          <div className="card form-card">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Link size={15} /> Paste product page URL</h3>
            <p className="form-hint">Reads the real page — name, benefits, ingredients all extracted automatically.</p>
            <div className="scan-row">
              <input value={productUrl} onChange={e => setProductUrl(e.target.value)}
                placeholder="https://heatherandroseh.co.uk/product/nac-600"
                onKeyDown={e => e.key === 'Enter' && scrapeProductUrl()} />
              <button className="btn btn-primary" onClick={scrapeProductUrl} disabled={scrapingProduct || !productUrl}>
                {scrapingProduct ? <span className="spinner" /> : <><Sparkles size={14} /> Read Page</>}
              </button>
            </div>
          </div>

          <div className="card form-card">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Search size={15} /> Or search by name</h3>
            <div className="scan-row">
              <input value={productQuery} onChange={e => setProductQuery(e.target.value)}
                placeholder="e.g. Zooki Creatin+ for men"
                onKeyDown={e => e.key === 'Enter' && searchProductByName()} />
              <button className="btn btn-secondary" onClick={searchProductByName} disabled={searchingProduct || !productQuery}>
                {searchingProduct ? <span className="spinner" /> : <><Search size={14} /> Search</>}
              </button>
            </div>
            {productError && <p className="scan-error">{productError}</p>}
          </div>

          {productInfo && (
            <div className="product-result-card card animate-slide-up">
              <div className="product-result-header">
                <div>
                  <strong className="product-result-name">{productInfo.name}</strong>
                  {productInfo.brand && <span className="product-result-brand"> by {productInfo.brand}</span>}
                </div>
                <button onClick={() => setProductInfo(null)} className="product-result-clear"><X size={14} /></button>
              </div>
              {productInfo.tagline && <p className="product-tagline">"{productInfo.tagline}"</p>}
              {productInfo.description && <p className="product-summary">{productInfo.description}</p>}
              {productInfo.benefits?.length > 0 && (
                <ul className="product-benefits">
                  {productInfo.benefits.map((b, i) => <li key={i}>{b}</li>)}
                </ul>
              )}
              {productInfo.idealFor && <p className="product-ideal-for">Ideal for: {productInfo.idealFor}</p>}
            </div>
          )}

          <div className="step-nav">
            <span style={{ fontSize: 12, color: 'var(--text-lo)' }}>
              {productInfo ? '✓ Product info ready' : 'Skip to create general brand content'}
            </span>
            <button className="btn btn-primary" onClick={() => setStep(1)}>
              Next — Photo & Scene <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* STEP 1 — Photo + Scene */}
      {step === 1 && (
        <div className="studio-step animate-slide-up">
          {productInfo && (
            <div className="product-mini-card card">
              <Package size={14} style={{ color: 'var(--electric)' }} />
              <strong>{productInfo.name}</strong>
              <button onClick={() => setStep(0)} className="btn-ghost" style={{ fontSize: 11, marginLeft: 'auto' }}>Change</button>
            </div>
          )}

          <div className="card form-card">
            <h3><Image size={15} /> Product photo</h3>
            <p className="form-hint">Upload a photo OR paste a direct image URL. Nano Banana keeps your product exactly as is and places it in a new scene.</p>

            <div className="scan-row">
              <input value={photoUrl} onChange={e => { setPhotoUrl(e.target.value); if (e.target.value) { setPhotoId(null); setAiImageUrl(null) } }}
                placeholder="Paste image URL e.g. https://site.com/product.jpg" />
              {photoUrl && <button className="btn-ghost" onClick={() => setPhotoUrl('')}><X size={14} /></button>}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
              <span style={{ fontSize: 11, color: 'var(--text-lo)' }}>or upload from device</span>
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            </div>

            <button className="btn btn-secondary" onClick={() => fileRef.current.click()} style={{ alignSelf: 'flex-start' }}>
              <Upload size={14} /> Upload Photo
            </button>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handleUpload(e.target.files)} />

            {assets.filter(a => !a.isAI).length > 0 && (
              <div className="asset-picker-grid">
                {assets.filter(a => !a.isAI).map(a => (
                  <div key={a.id} className={`asset-picker-item ${photoId === a.id && !photoUrl ? 'selected' : ''}`}
                    onClick={() => { setPhotoId(a.id); setPhotoUrl(''); setAiImageUrl(null) }}>
                    <img src={a.url} alt={a.name} className="picker-thumb" />
                    {photoId === a.id && !photoUrl && <div className="picker-check"><Check size={14} /></div>}
                  </div>
                ))}
              </div>
            )}

            {photoUrl && (
              <div className="url-preview animate-slide-up">
                <img src={photoUrl} alt="Product" className="url-preview-img" onError={e => e.target.style.display = 'none'} />
                <p style={{ fontSize: 11, color: 'var(--success)' }}>✓ Image URL ready</p>
              </div>
            )}
          </div>

          <div className="card form-card">
            <h3><Wand2 size={15} style={{ color: 'var(--gold)' }} /> AI Scene — Nano Banana</h3>
            <p className="form-hint">Gemini places your product into a lifestyle scene. Product is never altered.</p>

            <div className="field">
              <label>Platform</label>
              <div className="chip-grid">
                {PLATFORMS.map(p => <button key={p} className={`chip ${platform === p ? 'chip-active' : ''}`} onClick={() => setPlatform(p)}>{p}</button>)}
              </div>
            </div>
            <div className="field">
              <label>Format</label>
              <div className="chip-grid">
                {FORMATS.map((f, i) => <button key={f.id} className={`chip ${formatIdx === i ? 'chip-active' : ''}`} onClick={() => setFormatIdx(i)}>{f.label}</button>)}
              </div>
            </div>

            {scenes.length === 0 ? (
              <button className="btn btn-secondary" onClick={fetchScenes} disabled={loadingScenes}>
                {loadingScenes ? <><span className="spinner" /> Finding scenes…</> : <><TrendingUp size={14} /> Get Scene Ideas</>}
              </button>
            ) : (
              <div className="scene-options">
                {scenes.map((s, i) => (
                  <button key={i} className={`scene-chip ${chosenScene === i ? 'scene-active' : ''}`}
                    onClick={() => { setChosenScene(i); setCustomScene(s.prompt) }}>
                    <strong>{s.label}</strong>
                    <span className={`mood-tag mood-${i}`}>{s.mood}</span>
                  </button>
                ))}
                <button className="btn-ghost" style={{ fontSize: 11 }} onClick={fetchScenes}>↻ Different ideas</button>
              </div>
            )}

            {(chosenScene !== null || customScene) && (
              <div className="field">
                <label>Scene description</label>
                <textarea rows={2} value={customScene} onChange={e => setCustomScene(e.target.value)} />
              </div>
            )}

            <button className="btn btn-primary" onClick={generateAiImage}
              disabled={generatingAI || (!photo && !photoUrl && !customScene)}>
              {generatingAI
                ? <><span className="spinner" /> Nano Banana generating…</>
                : <><Wand2 size={14} /> {(photo || photoUrl) ? 'Place Product in Scene' : 'Generate Scene'}</>}
            </button>
            {aiError && <p className="scan-error">{aiError}</p>}

            {aiImageUrl && (
              <div className="scene-result animate-slide-up">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <Check size={14} style={{ color: 'var(--success)' }} />
                  <strong style={{ fontSize: 13 }}>✓ Nano Banana generated</strong>
                  <button className="btn-ghost" style={{ fontSize: 11, marginLeft: 'auto' }} onClick={generateAiImage}>
                    <RefreshCw size={11} /> Regenerate free
                  </button>
                </div>
                <img src={aiImageUrl} alt="AI scene" className="scene-preview-img" />
                <p className="form-hint">Happy with this? Generate your posts. Regenerate is always free.</p>
              </div>
            )}
          </div>

          <div className="step-nav">
            <button className="btn btn-secondary" onClick={() => setStep(0)}><ChevronLeft size={14} /> Back</button>
            <button className="btn btn-primary" style={{ padding: '12px 24px' }}
              onClick={generatePosts} disabled={generatingPosts || (!photo && !photoUrl && !productInfo && !aiImageUrl)}>
              {generatingPosts ? <><span className="spinner" /> Creating posts…</> : <><Sparkles size={16} /> Generate 3 Posts</>}
            </button>
          </div>
        </div>
      )}

      {/* STEP 2 — Posts */}
      {step === 2 && posts.length > 0 && (
        <div className="studio-step animate-slide-up">
          <div className="card form-card">
            <h3>Your 3 Posts</h3>
            <p className="form-hint" style={{ marginTop: 4 }}>
              {aiImageUrl ? '✓ Nano Banana image — product preserved. ' : 'Using your photo. '}
              Text is in dedicated zones — never overlapping the product.
              Click any field to edit.
            </p>
          </div>

          <div className="card" style={{ display: 'flex', gap: 16, alignItems: 'center', padding: '12px 16px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, color: 'var(--text-mid)', fontFamily: 'Space Grotesk', fontWeight: 600 }}>Accent Colours</span>
            {accentColors.map((c, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 11, color: 'var(--text-lo)' }}>{TEMPLATES[i].label}</span>
                <input type="color" value={c}
                  onChange={e => {
                    const nc = [...accentColors]; nc[i] = e.target.value; setAccentColors(nc)
                    setTimeout(() => renderCanvas(i), 80)
                  }}
                  style={{ width: 28, height: 28, border: 'none', borderRadius: 6, cursor: 'pointer', padding: 0 }} />
              </div>
            ))}
          </div>

          <div className="posts-grid">
            {posts.map((post, i) => (
              <div key={i} className={`post-result-card card ${chosen === i ? 'post-chosen' : ''}`} onClick={() => setChosen(i)}>
                <div className="post-template-label">
                  <span className="tag tag-violet">{TEMPLATES[i % TEMPLATES.length].label}</span>
                  {chosen === i && <span className="tag tag-electric">✓ Favourite</span>}
                </div>
                <div className="canvas-wrap" style={{ width: fmt.pw, height: fmt.ph }}>
                  <canvas
                    ref={el => { canvasRefs.current[i] = el; if (el) setTimeout(() => renderCanvas(i), 100 + i * 80) }}
                    width={fmt.pw} height={fmt.ph} className="post-canvas" />
                </div>
                <div className="edit-fields">
                  {['headline', 'subtext', 'cta'].map(field => (
                    <div key={field} className="edit-field">
                      <div className="edit-field-label"><Type size={10} /> {field}</div>
                      {editing?.idx === i && editing?.field === field ? (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <input value={editVal} onChange={e => setEditVal(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && saveEdit()}
                            style={{ fontSize: 12, padding: '4px 8px' }} autoFocus />
                          <button className="btn btn-primary" style={{ padding: '4px 10px', fontSize: 11 }} onClick={saveEdit}>✓</button>
                        </div>
                      ) : (
                        <div className="edit-field-value"
                          onClick={e => { e.stopPropagation(); startEdit(i, field, post[field]) }}>
                          {post[field] ?? '—'} <Edit2 size={10} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <div className="post-copy">
                  <p className="post-caption-preview">{post.caption}</p>
                  <div className="post-hashtags">
                    {post.hashtags?.map(h => <span key={h} className="tag tag-violet">{h.startsWith('#') ? h : '#' + h}</span>)}
                  </div>
                </div>
                <div className="post-actions">
                  <button className="btn btn-secondary" onClick={e => { e.stopPropagation(); download(i) }}><Download size={14} /> Download</button>
                  <button className="btn btn-primary" onClick={e => { e.stopPropagation(); window.open('https://buffer.com', '_blank') }}><Send size={14} /> Buffer</button>
                </div>
              </div>
            ))}
          </div>

          <div className="step-nav">
            <button className="btn btn-secondary" onClick={reset}>Start a New Post</button>
          </div>
        </div>
      )}

      {editing && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setEditing(null)}>
          <div className="card" style={{ width: 'min(400px,90vw)', padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: 15 }}>Edit {editing.field}</h3>
            <input value={editVal} onChange={e => setEditVal(e.target.value)} autoFocus style={{ fontSize: 14 }} />
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setEditing(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={saveEdit}>Save & Update</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
