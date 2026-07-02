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

// ── Reliable text helpers ─────────────────────────────────────────────────────
// fitText: auto-scales font down until text fits in ONE line — no overflow ever
function fitText(ctx, text, x, y, maxW, maxSize, weight, align = 'center') {
  if (!text) return
  ctx.textAlign = align
  let size = maxSize
  ctx.font = `${weight} ${size}px "Space Grotesk",sans-serif`
  while (ctx.measureText(text).width > maxW && size > 8) {
    size -= 1
    ctx.font = `${weight} ${size}px "Space Grotesk",sans-serif`
  }
  ctx.fillText(text, x, y)
}

// wrapText2: wraps text into max 2 lines, truncates with … if needed
function wrapText2(ctx, text, x, y, maxW, lineH, maxLines = 2) {
  if (!text) return
  const words = text.split(' ')
  let line = '', cy = y, linesDrawn = 0
  for (let n = 0; n < words.length; n++) {
    const test = line + words[n] + ' '
    if (ctx.measureText(test).width > maxW && n > 0) {
      ctx.fillText(line.trim(), x, cy)
      line = words[n] + ' '
      cy += lineH; linesDrawn++
      if (linesDrawn >= maxLines - 1) {
        // Final line — truncate if needed
        const rest = words.slice(n + 1).join(' ')
        let last = (line + rest).trim()
        while (ctx.measureText(last + '…').width > maxW && last.length > 1) {
          last = last.slice(0, -1)
        }
        ctx.fillText(last.trim() + (rest ? '…' : ''), x, cy)
        return
      }
    } else line = test
  }
  ctx.fillText(line.trim(), x, cy)
}

// ── Canvas Templates ──────────────────────────────────────────────────────────
// All use dedicated text zones — text NEVER overlaps with product area

function drawPodium(ctx, w, h, img, post, brand, accent) {
  // Photo top 63% | Brand colour strip bottom 37%
  ctx.fillStyle = '#0F0A1E'; ctx.fillRect(0, 0, w, h)

  const imgH = h * 0.63
  if (img) {
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, w, imgH); ctx.clip()
    const s = Math.max(w / img.width, imgH / img.height)
    ctx.drawImage(img, -(img.width * s - w) / 2, -(img.height * s - imgH) / 2, img.width * s, img.height * s)
    ctx.restore()
    // Smooth fade into strip
    const fade = ctx.createLinearGradient(0, imgH - 24, 0, imgH + 2)
    fade.addColorStop(0, 'rgba(0,0,0,0)'); fade.addColorStop(1, accent)
    ctx.fillStyle = fade; ctx.fillRect(0, imgH - 24, w, 26)
  }

  // Colour strip
  ctx.fillStyle = accent; ctx.fillRect(0, imgH, w, h - imgH)

  // Text — strictly inside strip
  const pad = w * 0.06
  const stripW = w - pad * 2
  const stripMid = imgH + (h - imgH) * 0.5

  // Kicker
  ctx.fillStyle = 'rgba(255,255,255,0.55)'
  ctx.font = `600 ${Math.max(7, h * 0.032)}px "Space Grotesk",sans-serif`
  ctx.textAlign = 'center'
  ctx.fillText((brand?.industry ?? '').toUpperCase().slice(0, 20), w / 2, imgH + (h - imgH) * 0.2)

  // Headline — auto-fit to one line
  ctx.fillStyle = '#FFF'
  fitText(ctx, post.headline ?? '', w / 2, stripMid - h * 0.01, stripW, Math.max(13, h * 0.068), '800')

  // Subtext — max 2 lines
  ctx.fillStyle = 'rgba(255,255,255,0.78)'
  ctx.font = `400 ${Math.max(9, h * 0.036)}px Inter,sans-serif`
  ctx.textAlign = 'center'
  wrapText2(ctx, post.subtext ?? '', w / 2, stripMid + h * 0.062, stripW, h * 0.044)

  // Brand name
  ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.textAlign = 'right'
  ctx.font = `600 ${Math.max(6, h * 0.029)}px "Space Grotesk",sans-serif`
  ctx.fillText(brand?.name ?? '', w - 10, h - 7)
}

function drawFeature(ctx, w, h, img, post, brand, accent) {
  // Photo left 54% | Brand panel right 46%
  ctx.fillStyle = '#0F0A1E'; ctx.fillRect(0, 0, w, h)

  if (img) {
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, w * 0.54, h); ctx.clip()
    const s = Math.max((w * 0.54) / img.width, h / img.height)
    ctx.drawImage(img, -(img.width * s - w * 0.54) / 2, -(img.height * s - h) / 2, img.width * s, img.height * s)
    ctx.restore()
  }

  ctx.fillStyle = accent; ctx.fillRect(w * 0.54, 0, w * 0.46, h)
  // Diagonal accent
  ctx.beginPath()
  ctx.moveTo(w * 0.51, 0); ctx.lineTo(w * 0.57, 0); ctx.lineTo(w * 0.54, h); ctx.lineTo(w * 0.48, h)
  ctx.fillStyle = accent; ctx.fill()

  // Text panel — right side strictly
  const tx = w * 0.61
  const panelW = w - tx - w * 0.04
  const panelMid = h * 0.48

  // Kicker
  ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.textAlign = 'left'
  ctx.font = `600 ${Math.max(7, h * 0.031)}px "Space Grotesk",sans-serif`
  ctx.fillText((brand?.industry ?? 'BRAND').toUpperCase().slice(0, 12), tx, h * 0.16)

  // Headline — auto-fit
  ctx.fillStyle = '#FFF'
  fitText(ctx, post.headline ?? '', tx, panelMid - h * 0.04, panelW, Math.max(11, h * 0.067), '800', 'left')

  // Subtext — 2 lines max
  ctx.fillStyle = 'rgba(255,255,255,0.78)'
  ctx.font = `400 ${Math.max(8, h * 0.036)}px Inter,sans-serif`
  ctx.textAlign = 'left'
  wrapText2(ctx, post.subtext ?? '', tx, panelMid + h * 0.038, panelW, h * 0.044)

  // CTA pill
  const ctaY = h * 0.76, ctaW = panelW * 0.9, ctaH = h * 0.09
  ctx.fillStyle = 'rgba(255,255,255,0.2)'; ctx.beginPath()
  ctx.roundRect(tx, ctaY, ctaW, ctaH, 4); ctx.fill()
  ctx.fillStyle = '#FFF'; ctx.textAlign = 'center'
  fitText(ctx, post.cta ?? 'Learn More', tx + ctaW / 2, ctaY + ctaH * 0.65, ctaW - 8, Math.max(7, h * 0.034), '700')

  // Brand
  ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.textAlign = 'right'
  ctx.font = `600 ${Math.max(6, h * 0.028)}px "Space Grotesk",sans-serif`
  ctx.fillText(brand?.name ?? '', w - 8, h - 7)
}

function drawDrama(ctx, w, h, img, post, brand, accent) {
  // Full image | gradient text zone bottom 39%
  ctx.fillStyle = '#111'; ctx.fillRect(0, 0, w, h)

  if (img) {
    const s = Math.max(w / img.width, h / img.height)
    ctx.drawImage(img, -(img.width * s - w) / 2, -(img.height * s - h) / 2, img.width * s, img.height * s)
  }

  // Text zone — bottom 39%, gradient overlay
  const textY = h * 0.61
  const textH = h - textY
  const grad = ctx.createLinearGradient(0, textY - 28, 0, h)
  grad.addColorStop(0, 'rgba(0,0,0,0)'); grad.addColorStop(0.25, 'rgba(0,0,0,0.82)'); grad.addColorStop(1, 'rgba(0,0,0,0.97)')
  ctx.fillStyle = grad; ctx.fillRect(0, textY - 28, w, textH + 28)

  // Accent left bar
  ctx.fillStyle = accent; ctx.fillRect(0, textY, 4, textH)

  const tx = 14, textW = w - tx - 12

  // Kicker
  ctx.fillStyle = accent; ctx.textAlign = 'left'
  ctx.font = `700 ${Math.max(7, h * 0.031)}px "Space Grotesk",sans-serif`
  ctx.fillText((brand?.industry ?? '').toUpperCase().slice(0, 16), tx, textY + textH * 0.14)

  // Headline — auto-fit one line
  ctx.fillStyle = '#FFF'
  fitText(ctx, post.headline ?? '', tx, textY + textH * 0.36, textW, Math.max(13, h * 0.073), '700', 'left')

  // Subtext — 2 lines
  ctx.fillStyle = 'rgba(255,255,255,0.72)'
  ctx.font = `400 ${Math.max(9, h * 0.038)}px Inter,sans-serif`
  ctx.textAlign = 'left'
  wrapText2(ctx, post.subtext ?? '', tx, textY + textH * 0.56, textW, h * 0.046)

  // CTA pill
  const ctaW = Math.min(textW * 0.6, 140), ctaH = h * 0.082
  const ctaX = tx, ctaY2 = h - ctaH - 12
  ctx.fillStyle = accent; ctx.beginPath(); ctx.roundRect(ctaX, ctaY2, ctaW, ctaH, ctaH / 2); ctx.fill()
  ctx.fillStyle = '#FFF'; ctx.textAlign = 'center'
  fitText(ctx, post.cta ?? 'Learn More', ctaX + ctaW / 2, ctaY2 + ctaH * 0.65, ctaW - 10, Math.max(8, h * 0.037), '700')

  // Brand
  ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.textAlign = 'right'
  ctx.font = `600 ${Math.max(7, h * 0.032)}px "Space Grotesk",sans-serif`
  ctx.fillText(brand?.name ?? '', w - 10, 20)
}

const TEMPLATES = [
  { id: 'podium',  label: 'Podium',  draw: drawPodium,  accent: '#7C3AED' },
  { id: 'feature', label: 'Feature', draw: drawFeature, accent: '#06B6D4' },
  { id: 'drama',   label: 'Drama',   draw: drawDrama,   accent: '#F472B6' },
]

export default function PostStudio({ brand, assets, onAssetsChange, selectedTrend, onNavigate }) {
  const [step, setStep] = useState(0)

  // Product
  const [productUrl, setProductUrl] = useState('')
  const [productQuery, setProductQuery] = useState('')
  const [productInfo, setProductInfo] = useState(null)
  const [scrapingProduct, setScrapingProduct] = useState(false)
  const [searchingProduct, setSearchingProduct] = useState(false)
  const [productError, setProductError] = useState('')

  // Photo
  const [photoId, setPhotoId] = useState(null)
  const [photoUrl, setPhotoUrl] = useState('') // direct image URL input
  const [platform, setPlatform] = useState(selectedTrend?.platform ?? 'Instagram')
  const [formatIdx, setFormatIdx] = useState(0)

  // Scene
  const [scenes, setScenes] = useState([])
  const [loadingScenes, setLoadingScenes] = useState(false)
  const [chosenScene, setChosenScene] = useState(null)
  const [customScene, setCustomScene] = useState('')
  const [generating, setGenerating] = useState(false)
  const [aiImageUrl, setAiImageUrl] = useState(null)
  const [aiError, setAiError] = useState('')

  // Posts
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

  const loadImage = (url) => new Promise((resolve) => {
    if (!url) { resolve(null); return }
    if (imgCache.current[url]) { resolve(imgCache.current[url]); return }
    const img = new window.Image()
    if (!url.startsWith('data:') && !url.startsWith('blob:')) img.crossOrigin = 'anonymous'
    img.onload = () => { imgCache.current[url] = img; resolve(img) }
    img.onerror = () => resolve(null)
    img.src = url
  })

  const handleUpload = (files) => {
    const newOnes = Array.from(files).map(f => ({
      id: Date.now() + Math.random(), name: f.name, url: URL.createObjectURL(f),
      type: f.type, tags: [], caption: '', isAI: false
    }))
    onAssetsChange(prev => [...prev, ...newOnes])
    if (newOnes[0]) { setPhotoId(newOnes[0].id); setPhotoUrl(''); setAiImageUrl(null) }
  }

  // Product scraping
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
    } catch { setProductError('Could not find that product — try the URL instead.') }
    setSearchingProduct(false)
  }

  // Scene suggestions
  const fetchScenes = async () => {
    setLoadingScenes(true); setScenes([]); setChosenScene(null)
    try {
      const productCtx = productInfo ? `Product: ${productInfo.name}. ${productInfo.description?.slice(0, 80)}.` : ''
      const trendCtx = selectedTrend ? `Trending: ${selectedTrend.title}.` : ''
      const result = await callClaude({
        system: 'Return JSON only: { "scenes": [{ "label": "4 word label", "prompt": "Detailed scene description for professional product photography. Describe setting, lighting, props, environment. Very visual and specific. e.g. Rustic wooden kitchen counter with fresh herbs and morning sunlight, marble surface, warm lifestyle aesthetic", "mood": "one word" }] } — exactly 3 different scenes.',
        messages: [{ role: 'user', content: `Platform: ${platform}. ${productCtx} ${trendCtx} Brand: ${brand?.name ?? ''}. Industry: ${brand?.industry ?? ''}. Suggest 3 lifestyle scene settings for this product.` }],
        max_tokens: 600
      })
      const parsed = extractJSON(result)
      setScenes(parsed.scenes ?? [])
      if (parsed.scenes?.[0]) { setChosenScene(0); setCustomScene(parsed.scenes[0].prompt) }
    } catch { setScenes([]) }
    setLoadingScenes(false)
  }

  // Generate AI image with Gemini
  const generateAiImage = async () => {
    const hasPhoto = photo || photoUrl
    if (!hasPhoto && !customScene) return
    setGenerating(true); setAiImageUrl(null); setAiError('')
    try {
      const scenePrompt = customScene || scenes[chosenScene]?.prompt || 'professional lifestyle photography, clean natural light'
      let body = { prompt: scenePrompt, mode: 'create' }

      if (hasPhoto) {
        body.mode = 'edit'
        body.productName = productInfo?.name || photo?.name || 'product'
        if (photoUrl) {
          // Direct image URL — server fetches it
          body.imageUrl = photoUrl
        } else if (photo) {
          // Uploaded file — convert to base64
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
    } catch (e) {
      setAiError(e.message || 'Could not generate image — check your GOOGLE_AI_KEY in Vercel.')
    }
    setGenerating(false)
  }

  // Generate posts
  const generatePosts = async () => {
    setGeneratingPosts(true); setPosts([])
    try {
      const brandCtx = brand ? `Brand: ${brand.name}. Industry: ${brand.industry}. Tone: ${brand.tone}.` : ''
      const productCtx = productInfo
        ? `Product: ${productInfo.name}. Tagline: ${productInfo.tagline}. Description: ${productInfo.description}. Benefits: ${productInfo.benefits?.join('; ')}. Ideal for: ${productInfo.idealFor}. CTA: ${productInfo.callToAction}.`
        : ''
      const result = await callClaude({
        system: 'Social media copywriter for small businesses. Return JSON only: {"posts":[{"headline":"max 5 words punchy","subtext":"max 10 words","caption":"full caption with emojis","hashtags":["tag1","tag2","tag3","tag4","tag5"],"cta":"2-3 word action"}]} — exactly 3 variations with different angles.',
        messages: [{ role: 'user', content: `${brandCtx} ${productCtx} Platform: ${platform}. Create 3 post variations.` }],
        max_tokens: 1200
      })
      const parsed = extractJSON(result)
      setPosts(parsed.posts.slice(0, 3)); setStep(2)
    } catch (e) { console.error(e) }
    setGeneratingPosts(false)
  }

  // Canvas rendering
  const renderCanvas = useCallback(async (idx) => {
    const canvas = canvasRefs.current[idx]
    if (!canvas || !posts[idx]) return
    const ctx = canvas.getContext('2d')
    const { pw, ph } = fmt
    const tmpl = TEMPLATES[idx % TEMPLATES.length]
    const accent = accentColors[idx % 3]
    const imageUrl = aiImageUrl || photo?.url
    const img = imageUrl ? await loadImage(imageUrl) : null
    tmpl.draw(ctx, pw, ph, img, posts[idx], brand, accent)
  }, [posts, fmt, aiImageUrl, photo, brand, accentColors])

  useEffect(() => { if (posts.length) posts.forEach((_, i) => renderCanvas(i)) }, [posts, renderCanvas])

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
    const imageUrl = aiImageUrl || photo?.url
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
          <p>Your real product, Nano Banana AI scene, professional posts in minutes.</p>
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
            <p className="form-hint">BrandPulse reads the real page and extracts name, benefits, ingredients automatically.</p>
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
            <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Search size={15} /> Or search by product name</h3>
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
                  {productInfo.price && <span className="product-result-price"> {productInfo.price}</span>}
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
            <p className="form-hint">Upload a photo OR paste a direct image URL. Nano Banana will keep your product exactly as is.</p>

            {/* Image URL input — new! */}
            <div className="scan-row">
              <input value={photoUrl} onChange={e => { setPhotoUrl(e.target.value); if (e.target.value) setPhotoId(null) }}
                placeholder="Paste product image URL e.g. https://site.com/product.jpg" />
              {photoUrl && <button className="btn-ghost" onClick={() => setPhotoUrl('')}><X size={14} /></button>}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
              <span style={{ fontSize: 11, color: 'var(--text-lo)' }}>or upload</span>
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            </div>

            <button className="btn btn-secondary" onClick={() => fileRef.current.click()} style={{ alignSelf: 'flex-start' }}>
              <Upload size={14} /> Upload from device
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
                <img src={photoUrl} alt="Product" className="url-preview-img"
                  onError={e => { e.target.style.display = 'none' }} />
                <p style={{ fontSize: 11, color: 'var(--success)' }}>✓ Image URL ready</p>
              </div>
            )}
          </div>

          <div className="card form-card">
            <h3><Wand2 size={15} style={{ color: 'var(--gold)' }} /> AI Scene — Nano Banana</h3>
            <p className="form-hint">Gemini keeps your product exactly as photographed and places it into a trending lifestyle scene.</p>

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
                <label>Scene description (edit if needed)</label>
                <textarea rows={2} value={customScene} onChange={e => setCustomScene(e.target.value)} />
              </div>
            )}

            <button className="btn btn-primary" onClick={generateAiImage}
              disabled={generating || (!photo && !photoUrl && !customScene)}>
              {generating
                ? <><span className="spinner" /> Generating with Nano Banana…</>
                : <><Wand2 size={14} /> {(photo || photoUrl) ? 'Place Product in Scene' : 'Generate Scene'}</>}
            </button>
            {aiError && <p className="scan-error">{aiError}</p>}

            {aiImageUrl && (
              <div className="scene-result animate-slide-up">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <Check size={14} style={{ color: 'var(--success)' }} />
                  <strong style={{ fontSize: 13 }}>Nano Banana generated ✓</strong>
                  <button className="btn-ghost" style={{ fontSize: 11, marginLeft: 'auto' }} onClick={generateAiImage}>
                    <RefreshCw size={11} /> Regenerate free
                  </button>
                </div>
                <img src={aiImageUrl} alt="AI scene" className="scene-preview-img" />
                <p className="form-hint">Happy? Generate posts below. Regenerate as many times as needed — free.</p>
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
              {aiImageUrl ? '✓ Nano Banana AI image — your product is preserved. ' : ''}
              Click any text field to edit. Change accent colours below.
            </p>
          </div>

          <div className="card" style={{ display: 'flex', gap: 16, alignItems: 'center', padding: '12px 16px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, color: 'var(--text-mid)', fontFamily: 'Space Grotesk', fontWeight: 600 }}>Accent Colours</span>
            {accentColors.map((c, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 11, color: 'var(--text-lo)' }}>{TEMPLATES[i].label}</span>
                <input type="color" value={c}
                  onChange={e => { const nc = [...accentColors]; nc[i] = e.target.value; setAccentColors(nc); setTimeout(() => renderCanvas(i), 80) }}
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
                  <canvas ref={el => { canvasRefs.current[i] = el; if (el) setTimeout(() => renderCanvas(i), 50) }}
                    width={fmt.pw} height={fmt.ph} className="post-canvas" />
                </div>
                <div className="edit-fields">
                  {['headline', 'subtext', 'cta'].map(field => (
                    <div key={field} className="edit-field">
                      <div className="edit-field-label"><Type size={10} /> {field}</div>
                      {editing?.idx === i && editing?.field === field ? (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <input value={editVal} onChange={e => setEditVal(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && saveEdit()} style={{ fontSize: 12, padding: '4px 8px' }} autoFocus />
                          <button className="btn btn-primary" style={{ padding: '4px 10px', fontSize: 11 }} onClick={saveEdit}>✓</button>
                        </div>
                      ) : (
                        <div className="edit-field-value" onClick={e => { e.stopPropagation(); startEdit(i, field, post[field]) }}>
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
