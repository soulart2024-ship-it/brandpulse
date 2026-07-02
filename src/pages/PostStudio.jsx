import { useState, useRef, useEffect, useCallback } from 'react'
import { Palette, Sparkles, Download, Send, Check, ChevronRight, ChevronLeft,
         Image, Play, Zap, Edit2, Type, Upload, TrendingUp, X,
         Search, Package, Wand2, RefreshCw, Link, Film } from 'lucide-react'
import { callClaude, extractJSON } from '../lib/api.js'
import './Page.css'
import './PostStudio.css'

const PLATFORMS = ['Instagram', 'TikTok', 'LinkedIn', 'Facebook', 'X (Twitter)', 'Pinterest']
const FORMATS = [
  { id: 'square',    label: '1:1 Square',  pw: 320, ph: 320,  falSize: 'square_hd' },
  { id: 'story',     label: '9:16 Story',  pw: 180, ph: 320,  falSize: 'portrait_4_3' },
  { id: 'landscape', label: '16:9 Banner', pw: 320, ph: 180,  falSize: 'landscape_4_3' },
]
const STEPS = ['Product', 'Scene', 'Posts']

// ─── Canvas templates ─────────────────────────────────────────────────────────
function drawSplitPanel(ctx, w, h, img, post, brand, accent) {
  ctx.fillStyle = '#0F0A1E'; ctx.fillRect(0, 0, w, h)
  if (img) {
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, w * 0.55, h); ctx.clip()
    const scale = Math.max((w * 0.55) / img.width, h / img.height)
    ctx.drawImage(img, -((img.width * scale) - w * 0.55) / 2, -((img.height * scale) - h) / 2, img.width * scale, img.height * scale)
    ctx.restore()
  }
  ctx.fillStyle = accent; ctx.fillRect(w * 0.55, 0, w * 0.45, h)
  ctx.beginPath(); ctx.moveTo(w*0.52,0); ctx.lineTo(w*0.58,0); ctx.lineTo(w*0.55,h); ctx.lineTo(w*0.49,h)
  ctx.fillStyle = accent; ctx.fill()
  const tx = w * 0.62, maxTw = w * 0.34
  ctx.textAlign = 'left'
  ctx.font = `600 ${Math.max(7, h*0.036)}px "Space Grotesk",sans-serif`
  ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.fillText((brand?.industry??'BRAND').toUpperCase().slice(0,14), tx, h*0.17)
  ctx.fillStyle = '#FFF'; ctx.font = `800 ${Math.max(11, h*0.07)}px "Space Grotesk",sans-serif`
  wrapText(ctx, post.headline??'', tx, h*0.31, maxTw, h*0.08)
  ctx.font = `400 ${Math.max(8, h*0.04)}px Inter,sans-serif`; ctx.fillStyle = 'rgba(255,255,255,0.8)'
  wrapText(ctx, post.subtext??'', tx, h*0.56, maxTw, h*0.05)
  const ctaY = h*0.77
  ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.beginPath(); ctx.roundRect(tx, ctaY, maxTw*0.88, h*0.1, 4); ctx.fill()
  ctx.fillStyle = '#FFF'; ctx.font = `700 ${Math.max(7, h*0.037)}px "Space Grotesk",sans-serif`; ctx.textAlign = 'center'
  ctx.fillText(post.cta??'Learn More', tx + maxTw*0.44, ctaY + h*0.065)
  ctx.fillStyle='rgba(255,255,255,0.4)'; ctx.textAlign='right'
  ctx.font=`600 ${Math.max(6,h*0.031)}px "Space Grotesk",sans-serif`; ctx.fillText(brand?.name??'', w-10, h-8)
}

function drawEditorialStrip(ctx, w, h, img, post, brand, accent) {
  ctx.fillStyle = '#0F0A1E'; ctx.fillRect(0, 0, w, h)
  const imgH = h * 0.62
  if (img) {
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, w, imgH); ctx.clip()
    const scale = Math.max(w/img.width, imgH/img.height)
    ctx.drawImage(img, -((img.width*scale)-w)/2, -((img.height*scale)-imgH)/2, img.width*scale, img.height*scale)
    ctx.restore()
  }
  const fade = ctx.createLinearGradient(0, imgH-30, 0, imgH+2)
  fade.addColorStop(0, 'rgba(0,0,0,0)'); fade.addColorStop(1, accent)
  ctx.fillStyle = fade; ctx.fillRect(0, imgH-30, w, 32)
  ctx.fillStyle = accent; ctx.fillRect(0, imgH, w, h-imgH)
  const mid = imgH + (h-imgH)/2
  ctx.textAlign = 'center'
  ctx.font = `700 ${Math.max(7,h*0.035)}px "Space Grotesk",sans-serif`; ctx.fillStyle = 'rgba(255,255,255,0.5)'
  ctx.fillText((brand?.industry??'').toUpperCase().slice(0,18), w/2, mid-h*0.115)
  ctx.fillStyle='#FFF'; ctx.font=`800 ${Math.max(12,h*0.073)}px "Space Grotesk",sans-serif`
  ctx.fillText(post.headline??'', w/2, mid-h*0.025)
  ctx.fillStyle='rgba(255,255,255,0.75)'; ctx.font=`400 ${Math.max(8,h*0.039)}px Inter,sans-serif`
  ctx.fillText(post.subtext??'', w/2, mid+h*0.062)
  ctx.fillStyle='rgba(255,255,255,0.9)'; ctx.textAlign='left'
  ctx.font=`700 ${Math.max(7,h*0.037)}px "Space Grotesk",sans-serif`; ctx.fillText(brand?.name??'', 12, 22)
}

function drawMinimalOverlay(ctx, w, h, img, post, brand, accent) {
  ctx.fillStyle='#111'; ctx.fillRect(0,0,w,h)
  if (img) {
    const scale=Math.max(w/img.width, h/img.height)
    ctx.drawImage(img, -((img.width*scale)-w)/2, -((img.height*scale)-h)/2, img.width*scale, img.height*scale)
  }
  const stripH=h*0.4, stripY=h-stripH
  const grad=ctx.createLinearGradient(0,stripY-35,0,h)
  grad.addColorStop(0,'rgba(0,0,0,0)'); grad.addColorStop(0.3,'rgba(0,0,0,0.72)'); grad.addColorStop(1,'rgba(0,0,0,0.95)')
  ctx.fillStyle=grad; ctx.fillRect(0,stripY-35,w,stripH+35)
  ctx.fillStyle=accent; ctx.fillRect(0,stripY,4,stripH)
  const tx=16
  ctx.textAlign='left'; ctx.font=`700 ${Math.max(7,h*0.035)}px "Space Grotesk",sans-serif`; ctx.fillStyle=accent
  ctx.fillText((brand?.industry??'').toUpperCase().slice(0,16), tx, stripY+h*0.05)
  ctx.fillStyle='#FFF'; ctx.font=`700 ${Math.max(13,h*0.076)}px "Space Grotesk",sans-serif`
  wrapText(ctx, post.headline??'', tx, stripY+h*0.125, w-tx*2, h*0.086)
  ctx.fillStyle='rgba(255,255,255,0.7)'; ctx.font=`400 ${Math.max(9,h*0.041)}px Inter,sans-serif`
  wrapText(ctx, post.subtext??'', tx, stripY+h*0.24, w-tx*2, h*0.051)
  const ctaW=Math.min(w*0.52,140), ctaH=h*0.088, ctaX=tx, ctaY2=h-ctaH-14
  ctx.fillStyle=accent; ctx.beginPath(); ctx.roundRect(ctaX,ctaY2,ctaW,ctaH,ctaH/2); ctx.fill()
  ctx.fillStyle='#FFF'; ctx.textAlign='center'; ctx.font=`700 ${Math.max(8,h*0.039)}px "Space Grotesk",sans-serif`
  ctx.fillText(post.cta??'Learn More', ctaX+ctaW/2, ctaY2+ctaH*0.65)
  ctx.fillStyle='rgba(255,255,255,0.8)'; ctx.textAlign='right'
  ctx.font=`600 ${Math.max(7,h*0.035)}px "Space Grotesk",sans-serif`; ctx.fillText(brand?.name??'', w-10, 20)
}

function wrapText(ctx, text, x, y, maxW, lineH) {
  if (!text) return
  const words=text.split(' '); let line='', cy=y
  for (let n=0;n<words.length;n++) {
    const test=line+words[n]+' '
    if (ctx.measureText(test).width>maxW && n>0) { ctx.fillText(line.trim(),x,cy); line=words[n]+' '; cy+=lineH; if(cy>y+lineH*2.5) break }
    else line=test
  }
  ctx.fillText(line.trim(),x,cy)
}

const TEMPLATES = [
  { id:'split',     label:'Split Panel',     draw:drawSplitPanel,     accent:'#7C3AED' },
  { id:'editorial', label:'Editorial Strip', draw:drawEditorialStrip, accent:'#06B6D4' },
  { id:'minimal',   label:'Minimal Overlay', draw:drawMinimalOverlay, accent:'#F472B6' },
]

// Convert a local blob/object URL to base64 data URL
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

export default function PostStudio({ brand, assets, onAssetsChange, selectedTrend, onNavigate }) {
  const [step, setStep] = useState(0)

  // Product
  const [productUrl, setProductUrl] = useState('')
  const [productQuery, setProductQuery] = useState('')
  const [productInfo, setProductInfo] = useState(null)
  const [scrapingProduct, setScrapingProduct] = useState(false)
  const [searchingProduct, setSearchingProduct] = useState(false)
  const [productError, setProductError] = useState('')

  // Photo + Scene
  const [photoId, setPhotoId] = useState(null)
  const [platform, setPlatform] = useState(selectedTrend?.platform ?? 'Instagram')
  const [formatIdx, setFormatIdx] = useState(0)
  const [animated, setAnimated] = useState(false)
  const [scenes, setScenes] = useState([])
  const [loadingScenes, setLoadingScenes] = useState(false)
  const [chosenScene, setChosenScene] = useState(null)
  const [customScene, setCustomScene] = useState('')
  const [generatingScene, setGeneratingScene] = useState(false)
  const [sceneResult, setSceneResult] = useState(null) // { url, type }
  const [sceneError, setSceneError] = useState('')
  const [strength, setStrength] = useState(0.72)

  // Trend
  const [useTrend, setUseTrend] = useState(!!selectedTrend)
  const [activeTrend, setActiveTrend] = useState(selectedTrend ?? null)

  // Posts
  const [generating, setGenerating] = useState(false)
  const [posts, setPosts] = useState([])
  const [chosen, setChosen] = useState(null)
  const [editing, setEditing] = useState(null)
  const [editVal, setEditVal] = useState('')
  const [accentColors, setAccentColors] = useState(['#7C3AED','#06B6D4','#F472B6'])
  const canvasRefs = useRef({})
  const imgCache = useRef({})
  const fileRef = useRef()

  const fmt = FORMATS[formatIdx]
  const photo = assets.find(a => a.id === photoId)

  // ── Product scraping ──────────────────────────────────────────────────────
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
    } catch (e) { setProductError(e.message || 'Could not read this URL — try pasting the product name below instead.') }
    setScrapingProduct(false)
  }

  const searchProductByName = async () => {
    if (!productQuery) return
    setSearchingProduct(true); setProductInfo(null); setProductError('')
    try {
      const result = await callClaude({
        system: 'Search for this product and return JSON only: { "name":"...", "brand":"...", "tagline":"...", "description":"...", "benefits":["...","...","...","..."], "keyIngredients":["..."], "idealFor":"...", "callToAction":"..." }',
        messages: [{ role:'user', content:`Search for and summarise this product: ${productQuery}` }],
        tools: [{ type:'web_search_20250305', name:'web_search' }],
        max_tokens: 800
      })
      setProductInfo(extractJSON(result))
    } catch { setProductError('Could not find that product — try the URL instead or fill in manually.') }
    setSearchingProduct(false)
  }

  // ── Photo upload ──────────────────────────────────────────────────────────
  const handleUpload = (files) => {
    const newOnes = Array.from(files).map(f => ({
      id: Date.now()+Math.random(), name:f.name, url:URL.createObjectURL(f),
      type:f.type, tags:[], caption:'', isAI:false
    }))
    onAssetsChange(prev => [...prev, ...newOnes])
    if (newOnes[0]) setPhotoId(newOnes[0].id)
  }

  const loadImage = (url) => new Promise((resolve) => {
    if (imgCache.current[url]) { resolve(imgCache.current[url]); return }
    const img = new window.Image(); img.crossOrigin='anonymous'
    img.onload = () => { imgCache.current[url]=img; resolve(img) }
    img.onerror = () => resolve(null); img.src=url
  })

  // ── Scene suggestions ─────────────────────────────────────────────────────
  const fetchScenes = async () => {
    setLoadingScenes(true); setScenes([]); setChosenScene(null); setSceneResult(null)
    try {
      const productCtx = productInfo ? `Product: ${productInfo.name}. Type: ${productInfo.description?.slice(0,80)}.` : ''
      const trendCtx = (useTrend && activeTrend) ? `Trending angle: ${activeTrend.title}.` : ''
      const result = await callClaude({
        system: 'You are a creative director for social media. Return JSON only: { "scenes": [{ "label": "short 4-word label", "prompt": "detailed image generation prompt that keeps the product visible and central, describes the scene around it, e.g. hand holding the product at golden hour outdoors with bokeh background, lifestyle photography, 50mm lens, warm tones", "mood": "one word mood" }] } — exactly 3 scene ideas.',
        messages: [{ role:'user', content:`Platform: ${platform}. ${productCtx} ${trendCtx} Brand: ${brand?.name??''}. Industry: ${brand?.industry??''}. Suggest 3 trending lifestyle scenes to place this product into. Each scene must keep the product as the hero.` }],
        max_tokens: 600
      })
      const parsed = extractJSON(result)
      setScenes(parsed.scenes ?? [])
      if (parsed.scenes?.[0]) { setChosenScene(0); setCustomScene(parsed.scenes[0].prompt) }
    } catch { setScenes([]) }
    setLoadingScenes(false)
  }

  // ── AI Scene generation ───────────────────────────────────────────────────
  const generateScene = async () => {
    if (!photo) return
    setGeneratingScene(true); setSceneResult(null); setSceneError('')
    try {
      const prompt = customScene || scenes[chosenScene]?.prompt || 'professional product photography, lifestyle scene, beautiful lighting'
      const imageBase64 = await toBase64(photo.url)
      const res = await fetch('/api/generate-image', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          prompt,
          imageBase64,
          mode: animated ? 'image-to-video' : 'image-to-image',
          image_size: fmt.falSize,
          strength
        })
      })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error || 'Generation failed')

      // Save result as a new asset
      const aiAsset = {
        id: Date.now()+Math.random(),
        name: `AI Scene — ${scenes[chosenScene]?.label ?? 'custom'}`,
        url: data.url, type: data.type==='video' ? 'video/mp4' : 'image/jpeg',
        tags:['AI Scene'], caption:'AI-generated scene', isAI:true
      }
      onAssetsChange(prev => [aiAsset, ...prev])
      setPhotoId(aiAsset.id)
      setSceneResult(data)
    } catch (e) { setSceneError(e.message || 'Scene generation failed — please try again.') }
    setGeneratingScene(false)
  }

  // ── Post generation ───────────────────────────────────────────────────────
  const generatePosts = async () => {
    setGenerating(true); setPosts([])
    try {
      const brandCtx = brand ? `Brand: ${brand.name}. Industry: ${brand.industry}. Tone: ${brand.tone}. Description: ${brand.description}.` : ''
      const trendCtx = (useTrend && activeTrend) ? `Adapt this trend into OUR brand content. Trend: "${activeTrend.title}". Hook style: "${activeTrend.hook}". Reframe entirely around our brand.` : ''
      const productCtx = productInfo ? `Product: ${productInfo.name}. Tagline: ${productInfo.tagline}. Description: ${productInfo.description}. Benefits: ${productInfo.benefits?.join('; ')}. Ideal for: ${productInfo.idealFor}. CTA: ${productInfo.callToAction}.` : ''

      const result = await callClaude({
        system: 'You are a social media copywriter for small businesses. Return JSON only, no markdown: { "posts": [{ "headline": "max 6 words punchy", "subtext": "max 12 words", "caption": "full caption with emojis", "hashtags": ["tag1","tag2","tag3","tag4","tag5"], "cta": "3 word action phrase" }] } — exactly 3 variations.',
        messages: [{ role:'user', content:`${brandCtx} ${trendCtx} ${productCtx} Platform: ${platform}. Create 3 post variations.` }],
        max_tokens: 1200
      })
      const parsed = extractJSON(result)
      setPosts(parsed.posts.slice(0,3)); setStep(2)
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
    const p = assets.find(a => a.id === photoId)
    const img = p ? await loadImage(p.url) : null
    tmpl.draw(ctx, pw, ph, img, posts[idx], brand, accent)
  }, [posts, fmt, photoId, assets, brand, accentColors])

  useEffect(() => { if (posts.length) posts.forEach((_,i) => renderCanvas(i)) }, [posts, renderCanvas])

  const startEdit = (idx, field, current) => { setEditing({idx, field}); setEditVal(current??'') }
  const saveEdit = () => {
    if (!editing) return
    setPosts(prev => prev.map((p,i) => i===editing.idx ? {...p,[editing.field]:editVal} : p))
    setEditing(null)
  }

  const download = async (idx) => {
    const off = document.createElement('canvas')
    off.width=fmt.pw*2; off.height=fmt.ph*2
    const ctx=off.getContext('2d'); ctx.scale(2,2)
    const p=assets.find(a=>a.id===photoId)
    const img=p?await loadImage(p.url):null
    TEMPLATES[idx%TEMPLATES.length].draw(ctx,fmt.pw,fmt.ph,img,posts[idx],brand,accentColors[idx%3])
    const a=document.createElement('a')
    a.download=`brandpulse-${TEMPLATES[idx%TEMPLATES.length].id}-${Date.now()}.png`
    a.href=off.toDataURL('image/png'); a.click()
  }

  const reset = () => { setStep(0); setPosts([]); setChosen(null); setSceneResult(null); setProductInfo(null); setProductUrl(''); setProductQuery(''); setScenes([]); setChosenScene(null); setActiveTrend(null) }

  return (
    <div className="page">
      <div className="page-header">
        <Palette size={24} className="page-icon-violet" />
        <div><h2>Post Studio</h2><p>Your asset, AI-enhanced — real product, real scene, professional posts.</p></div>
      </div>

      <div className="steps-bar">
        {STEPS.map((s,i) => (
          <div key={s} className={`step ${i===step?'active':''} ${i<step?'done':''}`}>
            <div className="step-num">{i<step?<Check size={12}/>:i+1}</div>
            <span>{s}</span>
            {i<STEPS.length-1 && <ChevronRight size={14} className="step-arrow"/>}
          </div>
        ))}
      </div>

      {/* ── STEP 0 — Product ── */}
      {step===0 && (
        <div className="studio-step animate-slide-up">
          <div className="card form-card">
            <h3><Link size={15} /> Paste product URL</h3>
            <p className="form-hint">BrandPulse will read the real product page — name, benefits, ingredients, everything. No manual typing needed.</p>
            <div className="scan-row">
              <input value={productUrl} onChange={e=>setProductUrl(e.target.value)}
                placeholder="https://heatherandroseh.co.uk/product/nac-600mg"
                onKeyDown={e=>e.key==='Enter'&&scrapeProductUrl()} />
              <button className="btn btn-primary" onClick={scrapeProductUrl} disabled={scrapingProduct||!productUrl}>
                {scrapingProduct?<span className="spinner"/>:<><Sparkles size={14}/> Read Page</>}
              </button>
            </div>
          </div>

          <div className="card form-card">
            <h3><Search size={15}/> Or search by product name</h3>
            <div className="scan-row">
              <input value={productQuery} onChange={e=>setProductQuery(e.target.value)}
                placeholder="e.g. Zooki Creatin+ for men, NaturesPlus NAC 600mg"
                onKeyDown={e=>e.key==='Enter'&&searchProductByName()} />
              <button className="btn btn-secondary" onClick={searchProductByName} disabled={searchingProduct||!productQuery}>
                {searchingProduct?<span className="spinner"/>:<><Search size={14}/> Search</>}
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
                  {productInfo.price && <span className="product-result-price">{productInfo.price}</span>}
                </div>
                <button onClick={() => setProductInfo(null)} className="product-result-clear"><X size={14}/></button>
              </div>
              {productInfo.tagline && <p className="product-tagline">"{productInfo.tagline}"</p>}
              {productInfo.description && <p className="product-summary">{productInfo.description}</p>}
              {productInfo.benefits?.length > 0 && (
                <ul className="product-benefits">
                  {productInfo.benefits.map((b,i) => <li key={i}>{b}</li>)}
                </ul>
              )}
              <div style={{display:'flex', gap:12, flexWrap:'wrap'}}>
                {productInfo.idealFor && <p className="product-ideal-for">For: {productInfo.idealFor}</p>}
                {productInfo.keyIngredients?.length > 0 && <p className="product-ideal-for">Key: {productInfo.keyIngredients.join(', ')}</p>}
              </div>
            </div>
          )}

          <div className="step-nav">
            <span style={{fontSize:12, color:'var(--text-lo)'}}>
              {productInfo ? '✓ Product ready' : 'No product? Skip to create brand content instead.'}
            </span>
            <button className="btn btn-primary" onClick={() => setStep(1)}>
              Next — Photo & Scene <ChevronRight size={16}/>
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 1 — Photo + Scene ── */}
      {step===1 && (
        <div className="studio-step animate-slide-up">
          {productInfo && (
            <div className="product-mini-card card">
              <Package size={14} style={{color:'var(--electric)'}}/>
              <strong>{productInfo.name}</strong>
              <button onClick={()=>setStep(0)} className="btn-ghost" style={{fontSize:11,marginLeft:'auto'}}>Change</button>
            </div>
          )}

          <div className="card form-card">
            <h3><Image size={15}/> Your product photo</h3>
            <p className="form-hint">Upload your real product photo — Fal.ai will use this as the base and place it into an AI-generated scene.</p>
            <button className="btn btn-secondary" onClick={()=>fileRef.current.click()} style={{alignSelf:'flex-start'}}>
              <Upload size={14}/> Upload Photo
            </button>
            <input ref={fileRef} type="file" accept="image/*" style={{display:'none'}} onChange={e=>handleUpload(e.target.files)} />
          </div>

          {assets.filter(a=>!a.isAI).length > 0 && (
            <div className="asset-picker-grid">
              {assets.filter(a=>!a.isAI).map(a=>(
                <div key={a.id} className={`asset-picker-item ${photoId===a.id?'selected':''}`} onClick={()=>setPhotoId(a.id)}>
                  <img src={a.url} alt={a.name} className="picker-thumb"/>
                  {photoId===a.id && <div className="picker-check"><Check size={16}/></div>}
                </div>
              ))}
            </div>
          )}

          {photo && (
            <div className="card form-card scene-section">
              <h3><Wand2 size={15} style={{color:'var(--gold)'}}/> AI Scene Generator</h3>
              <p className="form-hint">Choose a trending scene — Fal.ai will keep your product as the hero and build the scene around it.</p>

              <div style={{display:'flex', gap:10, flexWrap:'wrap'}}>
                <div className="field" style={{flex:1, minWidth:140}}>
                  <label>Platform</label>
                  <div className="chip-grid">
                    {PLATFORMS.map(p=><button key={p} className={`chip ${platform===p?'chip-active':''}`} onClick={()=>setPlatform(p)}>{p}</button>)}
                  </div>
                </div>
                <div className="field" style={{flex:1, minWidth:140}}>
                  <label>Format</label>
                  <div className="chip-grid">
                    {FORMATS.map((f,i)=><button key={f.id} className={`chip ${formatIdx===i?'chip-active':''}`} onClick={()=>setFormatIdx(i)}>{f.label}</button>)}
                  </div>
                </div>
              </div>

              <div className="field">
                <label>Output</label>
                <div className="toggle-row">
                  <button className={`toggle-opt ${!animated?'active':''}`} onClick={()=>setAnimated(false)}><Image size={14}/> Still Image</button>
                  <button className={`toggle-opt ${animated?'active':''}`} onClick={()=>setAnimated(true)}><Film size={14}/> Animated Video</button>
                </div>
              </div>

              {scenes.length === 0 ? (
                <button className="btn btn-secondary" onClick={fetchScenes} disabled={loadingScenes}>
                  {loadingScenes?<><span className="spinner"/> Finding trending scenes…</>:<><TrendingUp size={14}/> Get Scene Ideas</>}
                </button>
              ) : (
                <div className="scene-options">
                  {scenes.map((s,i)=>(
                    <button key={i} className={`scene-chip ${chosenScene===i?'scene-active':''}`} onClick={()=>{setChosenScene(i);setCustomScene(s.prompt)}}>
                      <strong>{s.label}</strong>
                      <span className={`mood-tag mood-${i}`}>{s.mood}</span>
                    </button>
                  ))}
                  <button className="btn-ghost" style={{fontSize:11}} onClick={fetchScenes}>↻ Different ideas</button>
                </div>
              )}

              {chosenScene !== null && (
                <div className="field">
                  <label>Scene description (edit if needed)</label>
                  <textarea rows={3} value={customScene} onChange={e=>setCustomScene(e.target.value)}/>
                </div>
              )}

              <div className="field">
                <label>Transformation strength — {Math.round(strength*100)}%</label>
                <p className="form-hint" style={{marginTop:-6}}>Lower = product stays closer to original photo. Higher = more creative scene transformation.</p>
                <input type="range" min="0.45" max="0.90" step="0.05" value={strength}
                  onChange={e=>setStrength(parseFloat(e.target.value))}
                  style={{width:'100%', accentColor:'var(--violet)'}} />
                <div style={{display:'flex',justifyContent:'space-between',fontSize:10,color:'var(--text-lo)'}}>
                  <span>Subtle enhancement</span><span>Creative transformation</span>
                </div>
              </div>

              <button className="btn btn-primary" onClick={generateScene} disabled={generatingScene || !chosenScene===null}>
                {generatingScene?<><span className="spinner"/> {animated?'Animating your product…':'Generating scene…'}</>
                  :<><Wand2 size={14}/> {animated?'Animate Product':'Generate AI Scene'}</>}
              </button>

              {sceneError && <p className="scan-error">{sceneError}</p>}

              {sceneResult && (
                <div className="scene-result animate-slide-up">
                  <div className="scene-result-header">
                    <Check size={14} style={{color:'var(--success)'}}/> <strong>Scene generated!</strong>
                    <button className="btn-ghost" style={{fontSize:11,marginLeft:'auto'}} onClick={generateScene}>
                      <RefreshCw size={11}/> Regenerate
                    </button>
                  </div>
                  {sceneResult.type==='video'
                    ? <video src={sceneResult.url} autoPlay loop muted className="scene-preview-media"/>
                    : <img src={sceneResult.url} alt="AI scene" className="scene-preview-media"/>}
                  <p className="form-hint">Happy with this? Generate your posts below. Not right? Hit Regenerate — it's free.</p>
                </div>
              )}
            </div>
          )}

          <div className="step-nav">
            <button className="btn btn-secondary" onClick={()=>setStep(0)}><ChevronLeft size={14}/> Back</button>
            <button className="btn btn-primary generate-btn" onClick={generatePosts} disabled={generating || (!photo && !productInfo)}>
              {generating?<><span className="spinner"/> Creating posts…</>:<><Sparkles size={16}/> Generate 3 Posts</>}
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 2 — Posts ── */}
      {step===2 && posts.length>0 && (
        <div className="studio-step animate-slide-up">
          <div className="card form-card">
            <h3>Your 3 Posts</h3>
            <p className="form-hint" style={{marginTop:4}}>Click any text to edit. Change accent colours to match your brand.</p>
          </div>

          <div className="card" style={{display:'flex',gap:16,alignItems:'center',padding:'12px 16px',flexWrap:'wrap'}}>
            <span style={{fontSize:12,color:'var(--text-mid)',fontFamily:'Space Grotesk',fontWeight:600}}>Accent Colours</span>
            {accentColors.map((c,i)=>(
              <div key={i} style={{display:'flex',alignItems:'center',gap:6}}>
                <span style={{fontSize:11,color:'var(--text-lo)'}}>{TEMPLATES[i].label}</span>
                <input type="color" value={c} onChange={e=>{const nc=[...accentColors];nc[i]=e.target.value;setAccentColors(nc);setTimeout(()=>renderCanvas(i),80)}}
                  style={{width:28,height:28,border:'none',borderRadius:6,cursor:'pointer',padding:0}}/>
              </div>
            ))}
          </div>

          <div className="posts-grid">
            {posts.map((post,i)=>(
              <div key={i} className={`post-result-card card ${chosen===i?'post-chosen':''}`} onClick={()=>setChosen(i)}>
                <div className="post-template-label">
                  <span className="tag tag-violet">{TEMPLATES[i%TEMPLATES.length].label}</span>
                  {chosen===i && <span className="tag tag-electric">✓ Favourite</span>}
                </div>
                <div className="canvas-wrap" style={{width:fmt.pw,height:fmt.ph}}>
                  <canvas ref={el=>{canvasRefs.current[i]=el;if(el)setTimeout(()=>renderCanvas(i),50)}} width={fmt.pw} height={fmt.ph} className="post-canvas"/>
                </div>
                <div className="edit-fields">
                  {['headline','subtext','cta'].map(field=>(
                    <div key={field} className="edit-field">
                      <div className="edit-field-label"><Type size={10}/> {field}</div>
                      {editing?.idx===i && editing?.field===field?(
                        <div style={{display:'flex',gap:6}}>
                          <input value={editVal} onChange={e=>setEditVal(e.target.value)} onKeyDown={e=>e.key==='Enter'&&saveEdit()} style={{fontSize:12,padding:'4px 8px'}} autoFocus/>
                          <button className="btn btn-primary" style={{padding:'4px 10px',fontSize:11}} onClick={saveEdit}>✓</button>
                        </div>
                      ):(
                        <div className="edit-field-value" onClick={e=>{e.stopPropagation();startEdit(i,field,post[field])}}>
                          {post[field]??'—'} <Edit2 size={10}/>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <div className="post-copy">
                  <p className="post-caption-preview">{post.caption}</p>
                  <div className="post-hashtags">{post.hashtags?.map(h=><span key={h} className="tag tag-violet">{h.startsWith('#')?h:'#'+h}</span>)}</div>
                </div>
                <div className="post-actions">
                  <button className="btn btn-secondary" onClick={e=>{e.stopPropagation();download(i)}}><Download size={14}/> Download</button>
                  <button className="btn btn-primary" onClick={e=>{e.stopPropagation();window.open('https://buffer.com','_blank')}}><Send size={14}/> Buffer</button>
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
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:300,display:'flex',alignItems:'center',justifyContent:'center'}} onClick={()=>setEditing(null)}>
          <div className="card" style={{width:'min(400px,90vw)',padding:24,display:'flex',flexDirection:'column',gap:14}} onClick={e=>e.stopPropagation()}>
            <h3 style={{fontSize:15}}>Edit {editing.field}</h3>
            <input value={editVal} onChange={e=>setEditVal(e.target.value)} autoFocus style={{fontSize:14}}/>
            <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
              <button className="btn btn-secondary" onClick={()=>setEditing(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={saveEdit}>Save & Update</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
