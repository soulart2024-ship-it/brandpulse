import { useState, useRef, useEffect, useCallback } from 'react'
import { Palette, Sparkles, Download, Send, Check, ChevronRight, ChevronLeft,
         Image, Play, Pause, Zap, Edit2, Type, Upload, TrendingUp, X,
         Search, Package, Wand2, RefreshCw, Star } from 'lucide-react'
import { callClaude, extractJSON } from '../lib/api.js'
import './Page.css'
import './PostStudio.css'

const PLATFORMS = ['Instagram', 'TikTok', 'LinkedIn', 'Facebook', 'X (Twitter)', 'Pinterest']
const FORMATS = [
  { id: 'square',    label: '1:1 Square',  pw: 320, ph: 320,  falSize: 'square_hd' },
  { id: 'story',     label: '9:16 Story',  pw: 180, ph: 320,  falSize: 'portrait_4_3' },
  { id: 'landscape', label: '16:9 Banner', pw: 320, ph: 180,  falSize: 'landscape_4_3' },
]
const STEPS = ['Photo', 'Brief', 'Results']

// ─── Canvas template renderers ────────────────────────────────────────────────
function drawSplitPanel(ctx, w, h, img, post, brand, accent) {
  ctx.fillStyle = '#0F0A1E'; ctx.fillRect(0, 0, w, h)
  if (img) {
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, w * 0.55, h); ctx.clip()
    const scale = Math.max((w * 0.55) / img.width, h / img.height)
    const iw = img.width * scale, ih = img.height * scale
    ctx.drawImage(img, -(iw - w * 0.55) / 2, -(ih - h) / 2, iw, ih); ctx.restore()
  }
  ctx.fillStyle = accent; ctx.fillRect(w * 0.55, 0, w * 0.45, h)
  ctx.beginPath()
  ctx.moveTo(w * 0.52, 0); ctx.lineTo(w * 0.58, 0); ctx.lineTo(w * 0.55, h); ctx.lineTo(w * 0.49, h)
  ctx.fillStyle = accent; ctx.fill()
  const tx = w * 0.62, maxTw = w * 0.34
  ctx.textAlign = 'left'
  ctx.font = `600 ${Math.max(7, h * 0.038)}px "Space Grotesk", sans-serif`
  ctx.fillStyle = 'rgba(255,255,255,0.6)'
  ctx.fillText((brand?.industry ?? 'BRAND').toUpperCase().slice(0, 12), tx, h * 0.18)
  ctx.fillStyle = '#FFFFFF'
  ctx.font = `800 ${Math.max(11, h * 0.072)}px "Space Grotesk", sans-serif`
  wrapText(ctx, post.headline ?? '', tx, h * 0.32, maxTw, h * 0.082)
  ctx.font = `400 ${Math.max(8, h * 0.042)}px Inter, sans-serif`
  ctx.fillStyle = 'rgba(255,255,255,0.8)'
  wrapText(ctx, post.subtext ?? '', tx, h * 0.58, maxTw, h * 0.052)
  const ctaY = h * 0.78
  ctx.fillStyle = 'rgba(255,255,255,0.2)'; ctx.beginPath()
  ctx.roundRect(tx, ctaY, maxTw * 0.85, h * 0.1, 4); ctx.fill()
  ctx.fillStyle = '#FFFFFF'
  ctx.font = `700 ${Math.max(7, h * 0.038)}px "Space Grotesk", sans-serif`
  ctx.textAlign = 'center'
  ctx.fillText(post.cta ?? 'Learn More', tx + maxTw * 0.425, ctaY + h * 0.065)
  ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.textAlign = 'right'
  ctx.font = `600 ${Math.max(6, h * 0.032)}px "Space Grotesk", sans-serif`
  ctx.fillText(brand?.name ?? '', w - 10, h - 8)
}

function drawEditorialStrip(ctx, w, h, img, post, brand, accent) {
  ctx.fillStyle = '#0F0A1E'; ctx.fillRect(0, 0, w, h)
  const imgH = h * 0.62
  if (img) {
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, w, imgH); ctx.clip()
    const scale = Math.max(w / img.width, imgH / img.height)
    const iw = img.width * scale, ih = img.height * scale
    ctx.drawImage(img, -(iw - w) / 2, -(ih - imgH) / 2, iw, ih)
    ctx.restore()
  }
  // Fade from photo into strip
  const fadeGrad = ctx.createLinearGradient(0, imgH - 30, 0, imgH)
  fadeGrad.addColorStop(0, 'rgba(0,0,0,0)'); fadeGrad.addColorStop(1, accent)
  ctx.fillStyle = fadeGrad; ctx.fillRect(0, imgH - 30, w, 32)
  ctx.fillStyle = accent; ctx.fillRect(0, imgH, w, h - imgH)
  const stripMid = imgH + (h - imgH) / 2
  ctx.textAlign = 'center'; ctx.fillStyle = '#FFFFFF'
  // Kicker label
  ctx.font = `700 ${Math.max(7, h * 0.036)}px "Space Grotesk", sans-serif`
  ctx.fillStyle = 'rgba(255,255,255,0.55)'
  ctx.fillText((brand?.industry ?? '').toUpperCase().slice(0, 18), w / 2, stripMid - h * 0.115)
  ctx.fillStyle = '#FFFFFF'
  ctx.font = `800 ${Math.max(12, h * 0.075)}px "Space Grotesk", sans-serif`
  ctx.fillText(post.headline ?? '', w / 2, stripMid - h * 0.028)
  ctx.fillStyle = 'rgba(255,255,255,0.75)'
  ctx.font = `400 ${Math.max(8, h * 0.04)}px Inter, sans-serif`
  ctx.fillText(post.subtext ?? '', w / 2, stripMid + h * 0.06)
  // Brand name top left
  ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.textAlign = 'left'
  ctx.font = `700 ${Math.max(7, h * 0.038)}px "Space Grotesk", sans-serif`
  ctx.fillText(brand?.name ?? '', 12, 22)
}

function drawMinimalOverlay(ctx, w, h, img, post, brand, accent) {
  ctx.fillStyle = '#111'; ctx.fillRect(0, 0, w, h)
  if (img) {
    const scale = Math.max(w / img.width, h / img.height)
    const iw = img.width * scale, ih = img.height * scale
    ctx.drawImage(img, -(iw - w) / 2, -(ih - h) / 2, iw, ih)
  }
  const stripH = h * 0.38, stripY = h - stripH
  const grad = ctx.createLinearGradient(0, stripY - 30, 0, h)
  grad.addColorStop(0, 'rgba(0,0,0,0)'); grad.addColorStop(0.35, 'rgba(0,0,0,0.75)'); grad.addColorStop(1, 'rgba(0,0,0,0.95)')
  ctx.fillStyle = grad; ctx.fillRect(0, stripY - 30, w, stripH + 30)
  // Accent left bar
  ctx.fillStyle = accent; ctx.fillRect(0, stripY, 4, stripH)
  // Kicker
  ctx.textAlign = 'left'; const tx = 16
  ctx.font = `700 ${Math.max(7, h * 0.036)}px "Space Grotesk", sans-serif`
  ctx.fillStyle = accent
  ctx.fillText((brand?.industry ?? '').toUpperCase().slice(0, 16), tx, stripY + h * 0.055)
  ctx.fillStyle = '#FFFFFF'
  ctx.font = `700 ${Math.max(13, h * 0.078)}px "Space Grotesk", sans-serif`
  wrapText(ctx, post.headline ?? '', tx, stripY + h * 0.13, w - tx * 2, h * 0.088)
  ctx.fillStyle = 'rgba(255,255,255,0.7)'
  ctx.font = `400 ${Math.max(9, h * 0.042)}px Inter, sans-serif`
  wrapText(ctx, post.subtext ?? '', tx, stripY + h * 0.245, w - tx * 2, h * 0.052)
  // CTA pill
  const ctaText = post.cta ?? 'Learn More'
  const ctaW = Math.min(w * 0.52, 140), ctaH = h * 0.088
  const ctaX = tx, ctaY2 = h - ctaH - 14
  ctx.fillStyle = accent; ctx.beginPath(); ctx.roundRect(ctaX, ctaY2, ctaW, ctaH, ctaH / 2); ctx.fill()
  ctx.fillStyle = '#FFFFFF'; ctx.textAlign = 'center'
  ctx.font = `700 ${Math.max(8, h * 0.04)}px "Space Grotesk", sans-serif`
  ctx.fillText(ctaText, ctaX + ctaW / 2, ctaY2 + ctaH * 0.65)
  // Brand name top right
  ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.textAlign = 'right'
  ctx.font = `600 ${Math.max(7, h * 0.036)}px "Space Grotesk", sans-serif`
  ctx.fillText(brand?.name ?? '', w - 10, 20)
}

function wrapText(ctx, text, x, y, maxW, lineH) {
  if (!text) return
  const words = text.split(' '); let line = '', cy = y
  for (let n = 0; n < words.length; n++) {
    const test = line + words[n] + ' '
    if (ctx.measureText(test).width > maxW && n > 0) {
      ctx.fillText(line.trim(), x, cy); line = words[n] + ' '; cy += lineH
      if (cy > y + lineH * 2.5) break
    } else { line = test }
  }
  ctx.fillText(line.trim(), x, cy)
}

const TEMPLATES = [
  { id: 'split',     label: 'Split Panel',     draw: drawSplitPanel,     accent: '#7C3AED' },
  { id: 'editorial', label: 'Editorial Strip', draw: drawEditorialStrip, accent: '#06B6D4' },
  { id: 'minimal',   label: 'Minimal Overlay', draw: drawMinimalOverlay, accent: '#F472B6' },
]

// ─── Main Component ───────────────────────────────────────────────────────────
export default function PostStudio({ brand, assets, onAssetsChange, selectedTrend, onNavigate }) {
  const [step, setStep] = useState(0)
  const [photoId, setPhotoId] = useState(null)
  const [platform, setPlatform] = useState(selectedTrend?.platform ?? 'Instagram')
  const [formatIdx, setFormatIdx] = useState(0)
  const [animated, setAnimated] = useState(false)
  const [story, setStory] = useState('')
  const [useTrend, setUseTrend] = useState(!!selectedTrend)
  const [activeTrend, setActiveTrend] = useState(selectedTrend ?? null)
  const [trendOptions, setTrendOptions] = useState([])
  const [findingTrends, setFindingTrends] = useState(false)

  // Product search
  const [productQuery, setProductQuery] = useState('')
  const [productInfo, setProductInfo] = useState(null)
  const [searchingProduct, setSearchingProduct] = useState(false)
  const [productError, setProductError] = useState('')

  // AI Image Generation
  const [aiImagePrompt, setAiImagePrompt] = useState('')
  const [generatingImage, setGeneratingImage] = useState(false)
  const [aiImageError, setAiImageError] = useState('')
  const [showAiPanel, setShowAiPanel] = useState(false)

  const [generating, setGenerating] = useState(false)
  const [posts, setPosts] = useState([])
  const [chosen, setChosen] = useState(null)
  const [editing, setEditing] = useState(null)
  const [editVal, setEditVal] = useState('')
  const [accentColors, setAccentColors] = useState(['#7C3AED', '#06B6D4', '#F472B6'])
  const canvasRefs = useRef({})
  const imgCache = useRef({})
  const fileRef = useRef()
  const animTimer = useRef(null)
  const animFrame = useRef(0)

  const fmt = FORMATS[formatIdx]

  const handleUpload = (files) => {
    const newOnes = Array.from(files).map(f => ({
      id: Date.now() + Math.random(), name: f.name, url: URL.createObjectURL(f),
      type: f.type, size: (f.size / 1024).toFixed(0) + ' KB', tags: [], caption: '', isAI: false
    }))
    onAssetsChange(prev => [...prev, ...newOnes])
    if (newOnes[0]) setPhotoId(newOnes[0].id)
  }

  const loadImage = (url) => new Promise((resolve) => {
    if (imgCache.current[url]) { resolve(imgCache.current[url]); return }
    const img = new window.Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => { imgCache.current[url] = img; resolve(img) }
    img.onerror = () => resolve(null)
    img.src = url
  })

  // Auto-build AI prompt from brand + product + story context
  const buildAutoPrompt = () => {
    const parts = []
    if (productInfo) parts.push(`professional product photography of ${productInfo.name}`)
    else if (story) parts.push(story.slice(0, 80))
    if (brand?.industry) parts.push(`${brand.industry} brand`)
    parts.push('clean studio lighting, modern aesthetic, social media ready, high quality')
    if (platform === 'Instagram') parts.push('Instagram aesthetic, lifestyle photography')
    if (platform === 'TikTok') parts.push('vibrant, energetic, Gen Z aesthetic')
    if (platform === 'LinkedIn') parts.push('professional, corporate, clean background')
    return parts.join(', ')
  }

  const generateAiImage = async () => {
    setGeneratingImage(true)
    setAiImageError('')
    try {
      const prompt = aiImagePrompt || buildAutoPrompt()
      const res = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, image_size: fmt.falSize })
      })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error || 'Generation failed')

      // Add the AI image to assets
      const aiAsset = {
        id: Date.now() + Math.random(),
        name: `AI Generated — ${prompt.slice(0, 30)}…`,
        url: data.url,
        type: 'image/jpeg',
        tags: ['AI Generated'],
        caption: 'AI generated image',
        isAI: true
      }
      onAssetsChange(prev => [aiAsset, ...prev])
      setPhotoId(aiAsset.id)
      setShowAiPanel(false)
    } catch (e) {
      setAiImageError(e.message || 'Could not generate image. Check your FAL_KEY in Vercel.')
    }
    setGeneratingImage(false)
  }

  const findTrendOptions = async () => {
    setFindingTrends(true); setTrendOptions([])
    try {
      const result = await callClaude({
        system: 'Return JSON only: { "trends": [{ "title": "...", "hook": "..." }] } — exactly 3 short trending content angles.',
        messages: [{ role: 'user', content: `Platform: ${platform}. Topic: ${story || brand?.industry || 'general'}. Brand: ${brand?.name ?? ''}.` }],
        max_tokens: 400
      })
      const parsed = extractJSON(result)
      setTrendOptions(parsed.trends ?? [])
    } catch { setTrendOptions([]) }
    setFindingTrends(false)
  }

  const searchProduct = async () => {
    if (!productQuery) return
    setSearchingProduct(true); setProductInfo(null); setProductError('')
    try {
      const result = await callClaude({
        system: 'Search for the product and return JSON only: { "name": "official product name", "summary": "1-2 sentence overview", "benefits": ["benefit 1", "benefit 2", "benefit 3", "benefit 4"], "idealFor": "who this is best for" }',
        messages: [{ role: 'user', content: `Search for and summarise this product: ${productQuery}` }],
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        max_tokens: 800
      })
      const parsed = extractJSON(result)
      setProductInfo(parsed)
      // Auto-populate AI prompt with product context
      setAiImagePrompt(`professional product photography of ${parsed.name}, clean white background, studio lighting, commercial photography`)
    } catch { setProductError('Could not find that product — try a more specific name, or describe it manually below.') }
    setSearchingProduct(false)
  }

  const generatePosts = async () => {
    setGenerating(true); setPosts([])
    try {
      const brandCtx = brand ? `Brand: ${brand.name}. Industry: ${brand.industry}. Tone: ${brand.tone}. Description: ${brand.description}.` : ''
      const trendCtx = (useTrend && activeTrend)
        ? `IMPORTANT — adapt this trend's structure into OUR OWN brand content. Trend: "${activeTrend.title}". Hook style: "${activeTrend.hook}". Reframe entirely around our brand.`
        : ''
      const productCtx = productInfo
        ? `Product: ${productInfo.name}. Summary: ${productInfo.summary}. Benefits: ${productInfo.benefits?.join('; ')}. Ideal for: ${productInfo.idealFor}.`
        : ''
      const angle = story || (productInfo ? `Best points of ${productInfo.name} for ${platform}` : brand?.description) || 'Share brand value'

      const result = await callClaude({
        system: 'You are a social media copywriter for small businesses. Return JSON only, no markdown: { "posts": [{ "headline": "max 6 words punchy", "subtext": "max 12 words supporting", "caption": "full caption with emojis", "hashtags": ["tag1","tag2","tag3","tag4","tag5"], "cta": "3 word action phrase" }] } — exactly 3 variations.',
        messages: [{ role: 'user', content: `${brandCtx} ${trendCtx} ${productCtx} Platform: ${platform}. Post angle: ${angle}.` }],
        max_tokens: 1200
      })
      const parsed = extractJSON(result)
      setPosts(parsed.posts.slice(0, 3))
      setStep(2)
    } catch (e) { console.error(e) }
    setGenerating(false)
  }

  const renderCanvas = useCallback(async (idx) => {
    const canvas = canvasRefs.current[idx]
    if (!canvas || !posts[idx]) return
    const ctx = canvas.getContext('2d')
    const { pw, ph } = fmt
    const tmpl = TEMPLATES[idx % TEMPLATES.length]
    const accent = accentColors[idx % 3]
    const photo = assets.find(a => a.id === photoId)
    const img = photo ? await loadImage(photo.url) : null
    tmpl.draw(ctx, pw, ph, img, posts[idx], brand, accent)
  }, [posts, fmt, photoId, assets, brand, accentColors])

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
    const photo = assets.find(a => a.id === photoId)
    const img = photo ? await loadImage(photo.url) : null
    TEMPLATES[idx % TEMPLATES.length].draw(ctx, fmt.pw, fmt.ph, img, posts[idx], brand, accentColors[idx % 3])
    const a = document.createElement('a')
    a.download = `brandpulse-${TEMPLATES[idx % TEMPLATES.length].id}-${Date.now()}.png`
    a.href = off.toDataURL('image/png'); a.click()
  }

  const photo = assets.find(a => a.id === photoId)

  return (
    <div className="page">
      <div className="page-header">
        <Palette size={24} className="page-icon-violet" />
        <div><h2>Post Studio</h2><p>Pick a photo, tell us what it's about, get 3 finished posts.</p></div>
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

      {/* ── STEP 0 — Photo ── */}
      {step === 0 && (
        <div className="studio-step animate-slide-up">
          <div className="photo-source-row">
            {/* Upload your own */}
            <div className="card form-card photo-source-card">
              <h3><Image size={15} /> Your Photos</h3>
              <p className="form-hint">Upload a real photo from your brand or choose from your library.</p>
              <button className="btn btn-secondary" onClick={() => fileRef.current.click()} style={{ alignSelf: 'flex-start' }}>
                <Upload size={14} /> Upload Photo
              </button>
              <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={e => handleUpload(e.target.files)} />
            </div>

            {/* AI Generate */}
            <div className="card form-card photo-source-card ai-source-card">
              <h3><Wand2 size={15} style={{ color: 'var(--gold)' }} /> AI Generate <span className="tag tag-gold" style={{ fontSize: 10 }}>Pro</span></h3>
              <p className="form-hint">No photo? Let AI create a stunning visual for your post.</p>
              {!showAiPanel ? (
                <button className="btn btn-primary" onClick={() => { setShowAiPanel(true); if (!aiImagePrompt) setAiImagePrompt(buildAutoPrompt()) }}>
                  <Wand2 size={14} /> Generate AI Image
                </button>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <textarea rows={3} value={aiImagePrompt} onChange={e => setAiImagePrompt(e.target.value)}
                    placeholder="Describe the image you want, e.g. professional product photography of vitamin C supplements, clean white background, studio lighting" />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-secondary" style={{ fontSize: 12 }} onClick={() => setAiImagePrompt(buildAutoPrompt())}>
                      <RefreshCw size={12} /> Auto
                    </button>
                    <button className="btn btn-primary" onClick={generateAiImage} disabled={generatingImage} style={{ flex: 1, justifyContent: 'center' }}>
                      {generatingImage ? <><span className="spinner" /> Generating…</> : <><Sparkles size={14} /> Generate</>}
                    </button>
                  </div>
                  {aiImageError && <p className="scan-error">{aiImageError}</p>}
                </div>
              )}
            </div>
          </div>

          {assets.length > 0 && (
            <div className="card form-card">
              <h3>Choose Photo for This Post</h3>
              <div className="asset-picker-grid">
                {assets.map(a => (
                  <div key={a.id} className={`asset-picker-item ${photoId === a.id ? 'selected' : ''}`} onClick={() => setPhotoId(a.id)}>
                    <img src={a.url} alt={a.name} className="picker-thumb" />
                    {photoId === a.id && <div className="picker-check"><Check size={16} /></div>}
                    {a.isAI && <div className="ai-badge"><Star size={8} /> AI</div>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {assets.length === 0 && (
            <div className="card empty-state">
              <Image size={32} className="empty-icon" />
              <p>Upload a photo or generate one with AI to get started.</p>
            </div>
          )}

          <div className="step-nav">
            <span />
            <button className="btn btn-primary" disabled={!photoId} onClick={() => setStep(1)}>
              Next — Tell Us About It <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 1 — Brief ── */}
      {step === 1 && (
        <div className="studio-step animate-slide-up">
          <div className="card" style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            {photo && <img src={photo.url} alt="" style={{ width: 60, height: 60, borderRadius: 10, objectFit: 'cover' }} />}
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 12, color: 'var(--text-mid)' }}>
                {photo?.isAI ? '✨ AI-generated image selected.' : 'Your photo is ready.'}
                {' '}Now tell us about this post.
              </p>
            </div>
            <button className="btn-ghost" onClick={() => setStep(0)} style={{ fontSize: 12 }}>Change photo</button>
          </div>

          {/* Product search */}
          <div className="card form-card">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Package size={16} /> Featuring a product? <span style={{ fontSize: 11, color: 'var(--text-lo)', fontWeight: 400 }}>optional</span></h3>
            <p className="form-hint">Search for it — we'll pull real benefits so you don't have to type them out.</p>
            <div className="scan-row">
              <input value={productQuery} onChange={e => setProductQuery(e.target.value)}
                placeholder="e.g. Zooki Creatin+ for men, Heather & Rose Vitamin C"
                onKeyDown={e => e.key === 'Enter' && searchProduct()} />
              <button className="btn btn-secondary" onClick={searchProduct} disabled={searchingProduct || !productQuery}>
                {searchingProduct ? <span className="spinner" /> : <><Search size={14} /> Search</>}
              </button>
            </div>
            {productError && <p className="scan-error">{productError}</p>}
            {productInfo && (
              <div className="product-info-card">
                <div className="product-info-header">
                  <strong>{productInfo.name}</strong>
                  <button onClick={() => setProductInfo(null)}><X size={12} /></button>
                </div>
                <p className="product-summary">{productInfo.summary}</p>
                {productInfo.benefits?.length > 0 && (
                  <ul className="product-benefits">
                    {productInfo.benefits.map((b, i) => <li key={i}>{b}</li>)}
                  </ul>
                )}
                {productInfo.idealFor && <p className="product-ideal-for">Ideal for: {productInfo.idealFor}</p>}
              </div>
            )}
          </div>

          <div className="card form-card">
            <div className="field">
              <label>What's this post about?{productInfo ? ' (optional — we have the product details)' : ''}</label>
              <textarea rows={3} value={story} onChange={e => setStory(e.target.value)}
                placeholder={productInfo
                  ? `e.g. Highlight the top benefit for new customers, keep it punchy for ${platform}`
                  : 'e.g. New organic vitamin C range just arrived — boosts immunity, great for the whole family.'} />
            </div>

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

            <div className="trend-toggle-section">
              <label className="trend-toggle-label">
                <input type="checkbox" checked={useTrend} onChange={e => { setUseTrend(e.target.checked); if (e.target.checked && !activeTrend) findTrendOptions() }} />
                <TrendingUp size={14} /> Adapt a trend into this post
              </label>
              {useTrend && (
                <div className="trend-options-box">
                  {activeTrend ? (
                    <div className="active-trend-pill">
                      <span>Using: <strong>{activeTrend.title}</strong></span>
                      <button onClick={() => setActiveTrend(null)}><X size={12} /></button>
                    </div>
                  ) : findingTrends ? (
                    <p className="form-hint"><span className="spinner" /> Finding trend ideas…</p>
                  ) : trendOptions.length > 0 ? (
                    <div className="trend-chip-list">
                      {trendOptions.map((t, i) => (
                        <button key={i} className="trend-pick-chip" onClick={() => setActiveTrend(t)}>
                          <strong>{t.title}</strong><span>{t.hook}</span>
                        </button>
                      ))}
                      <button className="btn-ghost" style={{ fontSize: 11 }} onClick={findTrendOptions}>↻ Refresh ideas</button>
                    </div>
                  ) : (
                    <button className="btn btn-secondary" onClick={findTrendOptions} style={{ fontSize: 12 }}>
                      <Sparkles size={12} /> Find Trend Ideas
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="step-nav">
            <button className="btn btn-secondary" onClick={() => setStep(0)}><ChevronLeft size={14} /> Back</button>
            <button className="btn btn-primary generate-btn" onClick={generatePosts} disabled={generating || (!story && !productInfo)}>
              {generating ? <><span className="spinner" /> Creating your posts…</> : <><Sparkles size={16} /> Generate 3 Posts</>}
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 2 — Results ── */}
      {step === 2 && posts.length > 0 && (
        <div className="studio-step animate-slide-up">
          <div className="card form-card">
            <h3>Your 3 Posts</h3>
            <p className="form-hint" style={{ marginTop: 4 }}>Click any text field below to edit it. Change accent colours to match your brand.</p>
          </div>

          <div className="card" style={{ display: 'flex', gap: 16, alignItems: 'center', padding: '12px 16px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, color: 'var(--text-mid)', fontFamily: 'Space Grotesk', fontWeight: 600 }}>Accent Colours</span>
            {accentColors.map((c, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 11, color: 'var(--text-lo)' }}>{TEMPLATES[i].label}</span>
                <input type="color" value={c} onChange={e => { const nc = [...accentColors]; nc[i] = e.target.value; setAccentColors(nc); setTimeout(() => renderCanvas(i), 80) }}
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
                            onKeyDown={e => e.key === 'Enter' && saveEdit()}
                            style={{ fontSize: 12, padding: '4px 8px' }} autoFocus />
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

          <div className="ai-upsell card">
            <div className="upsell-content">
              <Wand2 size={20} style={{ color: 'var(--gold)', flexShrink: 0 }} />
              <div>
                <h4>Generate more AI images</h4>
                <p>Go back to Step 1 and try the AI Generate button to create different background styles for these posts.</p>
              </div>
            </div>
            <button className="btn btn-secondary" style={{ flexShrink: 0 }} onClick={() => { setStep(0); setPosts([]) }}>
              Try New Visual
            </button>
          </div>

          <div className="step-nav">
            <button className="btn btn-secondary" onClick={() => { setStep(0); setPosts([]); setChosen(null); setStory(''); setActiveTrend(null); setProductInfo(null); setProductQuery('') }}>
              Start a New Post
            </button>
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
