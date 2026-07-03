import { useState, useRef, useEffect, useCallback } from 'react'
import { Palette, Sparkles, Download, Send, Check, ChevronRight, ChevronLeft,
         Image, Edit2, Type, Upload, TrendingUp, X, Search, Package, Wand2, RefreshCw, Link, Eye, Star } from 'lucide-react'
import { callClaude, extractJSON } from '../lib/api.js'
import './Page.css'
import './PostStudio.css'

const PLATFORMS = ['Instagram','TikTok','LinkedIn','Facebook','X (Twitter)','Pinterest']
const FORMATS = [
  { id:'square',    label:'1:1 Square',  pw:320, ph:320 },
  { id:'story',     label:'9:16 Story',  pw:180, ph:320 },
  { id:'landscape', label:'16:9 Banner', pw:320, ph:180 },
]
const STEPS = ['Product','Scene','Posts']
const LOGO_POSITIONS = [
  { id:'top-left',     label:'↖' },
  { id:'top-center',   label:'↑' },
  { id:'top-right',    label:'↗' },
  { id:'bottom-left',  label:'↙' },
  { id:'bottom-right', label:'↘' },
]
const LOGO_SIZES = [
  { id:'small',  label:'S', scale:0.12 },
  { id:'medium', label:'M', scale:0.20 },
  { id:'large',  label:'L', scale:0.28 },
]

async function toBase64(url) {
  const res = await fetch(url)
  const blob = await res.blob()
  return new Promise((resolve,reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

// ── Text helpers ──────────────────────────────────────────────────────────────
function fitLine(ctx, text, cx, y, maxW, maxPx, weight, align='center') {
  if (!text) return
  ctx.textAlign = align
  let sz = maxPx
  ctx.font = `${weight} ${sz}px "Space Grotesk",sans-serif`
  while (ctx.measureText(text).width > maxW && sz > 7) { sz--; ctx.font = `${weight} ${sz}px "Space Grotesk",sans-serif` }
  ctx.fillText(text, cx, y)
}

function fitSubtext(ctx, text, cx, y, maxW, lineH, size, align='center') {
  if (!text) return
  ctx.textAlign = align; ctx.font = `400 ${size}px Inter,sans-serif`
  const words = text.split(' '); let line='', cy=y, lines=0
  for (let i=0;i<words.length;i++) {
    const test = line+words[i]+' '
    if (ctx.measureText(test).width>maxW && i>0) {
      ctx.fillText(line.trim(),cx,cy); line=words[i]+' '; cy+=lineH; lines++
      if (lines>=1) {
        let last=(line+words.slice(i+1).join(' ')).trim()
        while(ctx.measureText(last+'…').width>maxW && last.length>2) last=last.slice(0,-1)
        ctx.fillText(last+(words.length>i+1?'…':''),cx,cy); return
      }
    } else line=test
  }
  ctx.fillText(line.trim(),cx,cy)
}

// ── Logo helper ───────────────────────────────────────────────────────────────
function drawLogo(ctx, w, h, logoImg, position, scale) {
  if (!logoImg) return
  const logoW = Math.max(16, w*scale)
  const logoH = (logoImg.height/logoImg.width)*logoW
  const pad = Math.max(8, w*0.032)
  let x, y
  switch(position) {
    case 'top-left':     x=pad;         y=pad; break
    case 'top-center':   x=(w-logoW)/2; y=pad; break
    case 'top-right':    x=w-logoW-pad; y=pad; break
    case 'bottom-left':  x=pad;         y=h-logoH-pad; break
    case 'bottom-right': x=w-logoW-pad; y=h-logoH-pad; break
    default:             x=w-logoW-pad; y=pad
  }
  ctx.drawImage(logoImg, x, y, logoW, logoH)
}

// ── TEMPLATE 1: Bright Strip ──────────────────────────────────────────────────
function drawBrightStrip(ctx, w, h, img, post, brand, accent, logoImg, logoPos, logoScale) {
  const imgH=Math.floor(h*0.63), stripY=imgH, stripH=h-imgH
  const pad=Math.max(12,w*0.07), tw=w-pad*2
  ctx.fillStyle='#0F0A1E'; ctx.fillRect(0,0,w,h)
  if(img){ctx.save();ctx.beginPath();ctx.rect(0,0,w,imgH);ctx.clip();const s=Math.max(w/img.width,imgH/img.height);ctx.drawImage(img,(w-img.width*s)/2,(imgH-img.height*s)/2,img.width*s,img.height*s);ctx.restore()}
  const fade=ctx.createLinearGradient(0,imgH-20,0,imgH);fade.addColorStop(0,'rgba(0,0,0,0)');fade.addColorStop(1,accent);ctx.fillStyle=fade;ctx.fillRect(0,imgH-20,w,22)
  ctx.fillStyle=accent;ctx.fillRect(0,stripY,w,stripH)
  ctx.fillStyle='rgba(255,255,255,0.55)';ctx.textAlign='center';ctx.font=`600 ${Math.max(7,stripH*0.13)}px "Space Grotesk",sans-serif`
  ctx.fillText((brand?.industry??'').toUpperCase().slice(0,20),w/2,stripY+stripH*0.2)
  ctx.fillStyle='#FFF';fitLine(ctx,post.headline??'',w/2,stripY+stripH*0.47,tw,Math.max(12,stripH*0.24),'800')
  ctx.fillStyle='rgba(255,255,255,0.8)';fitSubtext(ctx,post.subtext??'',w/2,stripY+stripH*0.67,tw,stripH*0.14,Math.max(8,stripH*0.12))
  ctx.fillStyle='rgba(255,255,255,0.45)';ctx.textAlign='right';ctx.font=`600 ${Math.max(6,h*0.028)}px "Space Grotesk",sans-serif`;ctx.fillText(brand?.name??'',w-8,h-6)
  drawLogo(ctx,w,h,logoImg,logoPos,logoScale)
}

// ── TEMPLATE 2: Dark Strip ────────────────────────────────────────────────────
function drawDarkStrip(ctx, w, h, img, post, brand, accent, logoImg, logoPos, logoScale) {
  const imgH=Math.floor(h*0.60), stripY=imgH, stripH=h-imgH, kx=18, tw=w-kx-12
  ctx.fillStyle='#0a0518';ctx.fillRect(0,0,w,h)
  if(img){ctx.save();ctx.beginPath();ctx.rect(0,0,w,imgH);ctx.clip();const s=Math.max(w/img.width,imgH/img.height);ctx.drawImage(img,(w-img.width*s)/2,(imgH-img.height*s)/2,img.width*s,img.height*s);ctx.restore()}
  const grad=ctx.createLinearGradient(0,imgH-16,0,h);grad.addColorStop(0,'rgba(10,5,24,0)');grad.addColorStop(0.2,'rgba(10,5,24,0.96)');grad.addColorStop(1,'#0a0518');ctx.fillStyle=grad;ctx.fillRect(0,imgH-16,w,stripH+16)
  ctx.fillStyle=accent;ctx.fillRect(0,stripY+2,3,stripH-4)
  ctx.fillStyle=accent;ctx.textAlign='left';ctx.font=`700 ${Math.max(7,stripH*0.12)}px "Space Grotesk",sans-serif`
  ctx.fillText((brand?.industry??'').toUpperCase().slice(0,16),kx,stripY+stripH*0.18)
  ctx.fillStyle='#FFF';fitLine(ctx,post.headline??'',kx,stripY+stripH*0.40,tw,Math.max(12,stripH*0.22),'700','left');ctx.textAlign='left'
  ctx.fillStyle='rgba(255,255,255,0.72)';fitSubtext(ctx,post.subtext??'',kx,stripY+stripH*0.60,tw,stripH*0.13,Math.max(8,stripH*0.11),'left')
  // CTA as text only — no pill that overflows
  ctx.fillStyle=accent;ctx.textAlign='left';ctx.font=`700 ${Math.max(8,stripH*0.14)}px "Space Grotesk",sans-serif`
  ctx.fillText('→ '+(post.cta??'Learn More'),kx,stripY+stripH*0.84)
  ctx.fillStyle='rgba(255,255,255,0.7)';ctx.textAlign='right';ctx.font=`600 ${Math.max(6,h*0.028)}px "Space Grotesk",sans-serif`;ctx.fillText(brand?.name??'',w-8,18)
  drawLogo(ctx,w,h,logoImg,logoPos,logoScale)
}

// ── TEMPLATE 3: Duo Strip ─────────────────────────────────────────────────────
function drawDuoStrip(ctx, w, h, img, post, brand, accent, logoImg, logoPos, logoScale) {
  const imgH=Math.floor(h*0.65), stripY=imgH, stripH=h-imgH, pad=Math.max(12,w*0.06), tw=w-pad*2
  ctx.fillStyle='#0F0A1E';ctx.fillRect(0,0,w,h)
  if(img){ctx.save();ctx.beginPath();ctx.rect(0,0,w,imgH);ctx.clip();const s=Math.max(w/img.width,imgH/img.height);ctx.drawImage(img,(w-img.width*s)/2,(imgH-img.height*s)/2,img.width*s,img.height*s);ctx.restore()}
  const fade=ctx.createLinearGradient(0,imgH-18,0,imgH+1);fade.addColorStop(0,'rgba(15,10,30,0)');fade.addColorStop(1,'#1a0f3a');ctx.fillStyle=fade;ctx.fillRect(0,imgH-18,w,20)
  ctx.fillStyle='#1a0f3a';ctx.fillRect(0,stripY,w,stripH);ctx.fillStyle=accent;ctx.fillRect(0,stripY,w,3)
  ctx.fillStyle='#FFF';fitLine(ctx,post.headline??'',w/2,stripY+stripH*0.36,tw,Math.max(12,stripH*0.26),'800')
  ctx.fillStyle='rgba(255,255,255,0.7)';fitSubtext(ctx,post.subtext??'',w/2,stripY+stripH*0.57,tw,stripH*0.14,Math.max(8,stripH*0.12))
  ctx.fillStyle=accent;ctx.textAlign='center';ctx.font=`700 ${Math.max(7,stripH*0.13)}px "Space Grotesk",sans-serif`;ctx.fillText((post.cta??'Learn More').toUpperCase(),w/2,stripY+stripH*0.83)
  ctx.fillStyle='rgba(255,255,255,0.4)';ctx.textAlign='right';ctx.font=`600 ${Math.max(6,h*0.027)}px "Space Grotesk",sans-serif`;ctx.fillText(brand?.name??'',w-8,h-6)
  drawLogo(ctx,w,h,logoImg,logoPos,logoScale)
}

// ── TEMPLATE 4: Bold Overlay ──────────────────────────────────────────────────
// Full image, bold headline centered middle, thin accent bar, minimal text
function drawBoldOverlay(ctx, w, h, img, post, brand, accent, logoImg, logoPos, logoScale) {
  ctx.fillStyle='#111';ctx.fillRect(0,0,w,h)
  if(img){const s=Math.max(w/img.width,h/img.height);ctx.drawImage(img,(w-img.width*s)/2,(h-img.height*s)/2,img.width*s,img.height*s)}
  // Dark scrim bottom half
  const scrim=ctx.createLinearGradient(0,h*0.3,0,h);scrim.addColorStop(0,'rgba(0,0,0,0)');scrim.addColorStop(0.5,'rgba(0,0,0,0.7)');scrim.addColorStop(1,'rgba(0,0,0,0.92)');ctx.fillStyle=scrim;ctx.fillRect(0,h*0.3,w,h*0.7)
  // Accent bar across middle
  ctx.fillStyle=accent;ctx.fillRect(0,h*0.52,w,2)
  // Headline above bar
  ctx.fillStyle='#FFF';ctx.textAlign='center'
  const pad=w*0.07, tw=w-pad*2
  fitLine(ctx,post.headline??'',w/2,h*0.48,tw,Math.max(14,h*0.072),'800')
  // Subtext below bar
  ctx.fillStyle='rgba(255,255,255,0.75)';fitSubtext(ctx,post.subtext??'',w/2,h*0.59,tw,h*0.046,Math.max(9,h*0.038))
  // CTA
  ctx.fillStyle=accent;ctx.font=`700 ${Math.max(8,h*0.038)}px "Space Grotesk",sans-serif`;ctx.textAlign='center'
  ctx.fillText((post.cta??'Learn More').toUpperCase(),w/2,h*0.72)
  // Brand
  ctx.fillStyle='rgba(255,255,255,0.7)';ctx.textAlign='left';ctx.font=`600 ${Math.max(7,h*0.03)}px "Space Grotesk",sans-serif`;ctx.fillText(brand?.name??'',12,20)
  drawLogo(ctx,w,h,logoImg,logoPos,logoScale)
}

// ── TEMPLATE 5: Gradient Frame ────────────────────────────────────────────────
// Gradient background, product centered top, clean text bottom
function drawGradientFrame(ctx, w, h, img, post, brand, accent, logoImg, logoPos, logoScale) {
  // Gradient background
  const bg=ctx.createLinearGradient(0,0,w,h)
  bg.addColorStop(0,'#0F0A1E');bg.addColorStop(0.5,accent+'44');bg.addColorStop(1,'#0F0A1E')
  ctx.fillStyle=bg;ctx.fillRect(0,0,w,h)
  const imgH=Math.floor(h*0.60), stripY=imgH, stripH=h-imgH
  if(img){ctx.save();ctx.beginPath();ctx.rect(0,0,w,imgH);ctx.clip();const s=Math.max(w/img.width,imgH/img.height);ctx.drawImage(img,(w-img.width*s)/2,(imgH-img.height*s)/2,img.width*s,img.height*s);ctx.restore()}
  // Glass strip
  ctx.fillStyle='rgba(255,255,255,0.08)';ctx.fillRect(0,stripY,w,stripH)
  ctx.fillStyle=accent;ctx.fillRect(0,stripY,w,2)
  const pad=Math.max(12,w*0.07), tw=w-pad*2
  ctx.fillStyle='#FFF';fitLine(ctx,post.headline??'',w/2,stripY+stripH*0.38,tw,Math.max(12,stripH*0.26),'800')
  ctx.fillStyle='rgba(255,255,255,0.72)';fitSubtext(ctx,post.subtext??'',w/2,stripY+stripH*0.60,tw,stripH*0.14,Math.max(8,stripH*0.12))
  // CTA pill
  const ctaW=Math.min(tw*0.55,120),ctaH=Math.max(18,stripH*0.18),ctaX=(w-ctaW)/2,ctaY=stripY+stripH*0.78
  ctx.fillStyle=accent;ctx.beginPath();ctx.roundRect(ctaX,ctaY,ctaW,ctaH,ctaH/2);ctx.fill()
  ctx.fillStyle='#FFF';fitLine(ctx,post.cta??'Learn More',(w)/2,ctaY+ctaH*0.67,ctaW-10,Math.max(7,ctaH*0.46),'700')
  ctx.fillStyle='rgba(255,255,255,0.5)';ctx.textAlign='right';ctx.font=`600 ${Math.max(6,h*0.028)}px "Space Grotesk",sans-serif`;ctx.fillText(brand?.name??'',w-8,h-6)
  drawLogo(ctx,w,h,logoImg,logoPos,logoScale)
}

const TEMPLATES = [
  { id:'bright',   label:'Bright Strip',    draw:drawBrightStrip,   accent:'#7C3AED' },
  { id:'dark',     label:'Dark Strip',      draw:drawDarkStrip,     accent:'#06B6D4' },
  { id:'duo',      label:'Duo Strip',       draw:drawDuoStrip,      accent:'#F472B6' },
  { id:'bold',     label:'Bold Overlay',    draw:drawBoldOverlay,   accent:'#F59E0B' },
  { id:'gradient', label:'Gradient Frame',  draw:drawGradientFrame, accent:'#10B981' },
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
  const [analyzingColors, setAnalyzingColors] = useState(false)
  const [colorAnalysis, setColorAnalysis] = useState(null)
  const [generatingPosts, setGeneratingPosts] = useState(false)
  const [posts, setPosts] = useState([])
  const [chosen, setChosen] = useState(null)
  const [editing, setEditing] = useState(null)
  const [editVal, setEditVal] = useState('')
  const [accentColors, setAccentColors] = useState(TEMPLATES.map(t=>t.accent))

  // Logo — auto-populate from Brand Brain logo
  const [logoOverrideUrl, setLogoOverrideUrl] = useState(null)
  const [logoPosition, setLogoPosition] = useState('top-right')
  const [logoSizeId, setLogoSizeId] = useState('small')
  const [showLogo, setShowLogo] = useState(false)
  const logoFileRef = useRef()

  // Auto-set logo from brand when brand changes
  useEffect(() => {
    if (brand?.logo && !logoOverrideUrl) setShowLogo(true)
  }, [brand?.logo])

  const logoUrl = logoOverrideUrl || brand?.logo || null
  const logoScale = LOGO_SIZES.find(s=>s.id===logoSizeId)?.scale ?? 0.12

  const canvasRefs = useRef({})
  const imgCache = useRef({})
  const fileRef = useRef()
  const fmt = FORMATS[formatIdx]
  const photo = assets.find(a => a.id === photoId)

  const loadImage = useCallback((url) => new Promise((resolve) => {
    if (!url) { resolve(null); return }
    if (imgCache.current[url]) { resolve(imgCache.current[url]); return }
    const img = new window.Image()
    if (!url.startsWith('data:') && !url.startsWith('blob:')) img.crossOrigin='anonymous'
    img.onload = () => { imgCache.current[url]=img; resolve(img) }
    img.onerror = () => resolve(null)
    img.src = url
  }), [])

  const handleUpload = (files) => {
    Array.from(files).forEach(f => {
      const reader = new FileReader()
      reader.onload = e => {
        const asset = { id:Date.now()+Math.random(), name:f.name, url:e.target.result, type:f.type, tags:[], caption:'', isAI:false }
        onAssetsChange(prev => [asset, ...prev])
        setPhotoId(asset.id); setPhotoUrl(''); setAiImageUrl(null)
      }
      reader.readAsDataURL(f) // base64 so it persists
    })
  }

  const handleLogoUpload = (files) => {
    const f = files[0]; if (!f) return
    const reader = new FileReader()
    reader.onload = e => { setLogoOverrideUrl(e.target.result); setShowLogo(true) }
    reader.readAsDataURL(f)
  }

  const analyzeImageColors = async (imageUrl) => {
    setAnalyzingColors(true); setColorAnalysis(null)
    try {
      const result = await callClaude({
        system:'You are a visual design expert. Analyze product photography and suggest accent colors for social media text strip overlays. Return JSON only.',
        messages:[{ role:'user', content:[
          { type:'image', source:{ type:'url', url:imageUrl } },
          { type:'text', text:'Analyze this product lifestyle photo. Recommend 5 accent colors (one per template style) that complement it for social media text strips. Colors must contrast well with white text. Return JSON only: {"accentColors":["#hex1","#hex2","#hex3","#hex4","#hex5"],"imageTone":"warm|cool|neutral|vibrant","reasoning":"one sentence"}' }
        ]}],
        max_tokens:250
      })
      const parsed = extractJSON(result)
      if (parsed.accentColors?.length >= 3) {
        const colors = parsed.accentColors.slice(0,5)
        while(colors.length < 5) colors.push(TEMPLATES[colors.length].accent)
        setAccentColors(colors); setColorAnalysis(parsed)
      }
    } catch(e) { console.log('Color analysis skipped') }
    setAnalyzingColors(false)
  }

  const scrapeProductUrl = async () => {
    if (!productUrl) return
    setScrapingProduct(true); setProductInfo(null); setProductError('')
    try {
      const res = await fetch('/api/scrape-product', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({url:productUrl}) })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setProductInfo(data.product)
    } catch(e) { setProductError(e.message||'Could not read this URL.') }
    setScrapingProduct(false)
  }

  const searchProductByName = async () => {
    if (!productQuery) return
    setSearchingProduct(true); setProductInfo(null); setProductError('')
    try {
      const result = await callClaude({
        system:'Search for the product and return JSON only: {"name":"...","brand":"...","tagline":"...","description":"...","benefits":["...","...","..."],"idealFor":"...","callToAction":"..."}',
        messages:[{role:'user',content:`Search for and summarise: ${productQuery}`}],
        tools:[{type:'web_search_20250305',name:'web_search'}], max_tokens:800
      })
      setProductInfo(extractJSON(result))
    } catch { setProductError('Could not find that product.') }
    setSearchingProduct(false)
  }

  const fetchScenes = async () => {
    setLoadingScenes(true); setScenes([]); setChosenScene(null)
    try {
      const productCtx = productInfo ? `Product: ${productInfo.name}. ${productInfo.description?.slice(0,80)}.` : ''
      const result = await callClaude({
        system:'Return JSON only: {"scenes":[{"label":"4 word label","prompt":"Detailed lifestyle setting for product photography. Describe environment, lighting, props. Very visual and specific.","mood":"one word"}]} — exactly 3 scenes.',
        messages:[{role:'user',content:`Platform: ${platform}. ${productCtx} Brand: ${brand?.name??''}. Industry: ${brand?.industry??''}. Suggest 3 lifestyle scene backgrounds.`}],
        max_tokens:600
      })
      const parsed = extractJSON(result)
      setScenes(parsed.scenes??[])
      if (parsed.scenes?.[0]) { setChosenScene(0); setCustomScene(parsed.scenes[0].prompt) }
    } catch { setScenes([]) }
    setLoadingScenes(false)
  }

  const generateAiImage = async () => {
    const hasPhoto = photo || photoUrl
    setGeneratingAI(true); setAiImageUrl(null); setAiError(''); setColorAnalysis(null)
    try {
      const prompt = customScene || scenes[chosenScene]?.prompt || 'professional lifestyle photography, clean natural light'
      let body = { prompt, mode:'create' }
      if (hasPhoto) {
        body.mode='edit'; body.productName=productInfo?.name||photo?.name||'product'
        if (photoUrl) { body.imageUrl=photoUrl }
        else if (photo) { body.imageBase64=photo.url.startsWith('data:')?photo.url:await toBase64(photo.url); body.imageType=photo.type||'image/jpeg' }
      }
      const res = await fetch('/api/generate-image', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body) })
      const data = await res.json()
      if (!res.ok||data.error) throw new Error(data.error||'Image generation failed')
      setAiImageUrl(data.url); imgCache.current={}
      analyzeImageColors(data.url)
    } catch(e) { setAiError(e.message||'Check your FAL_KEY in Vercel.') }
    setGeneratingAI(false)
  }

  const generatePosts = async () => {
    setGeneratingPosts(true); setPosts([])
    try {
      const brandCtx = brand ? `Brand: ${brand.name}. Industry: ${brand.industry}. Tone: ${brand.tone}.` : ''
      const productCtx = productInfo ? `Product: ${productInfo.name}. Tagline: ${productInfo.tagline}. Description: ${productInfo.description}. Benefits: ${productInfo.benefits?.join('; ')}. Ideal for: ${productInfo.idealFor}.` : ''
      const result = await callClaude({
        system:'Social media copywriter. Return JSON only: {"posts":[{"headline":"max 5 words","subtext":"max 10 words","caption":"full caption with emojis","hashtags":["tag1","tag2","tag3","tag4","tag5"],"cta":"2-3 words"}]} — exactly 5 variations (one per template).',
        messages:[{role:'user',content:`${brandCtx} ${productCtx} Platform: ${platform}. Create 5 post variations.`}],
        max_tokens:1500
      })
      const parsed = extractJSON(result)
      setPosts(parsed.posts.slice(0,5)); setStep(2)
    } catch(e) { console.error(e) }
    setGeneratingPosts(false)
  }

  const renderCanvas = useCallback(async (idx) => {
    const canvas = canvasRefs.current[idx]
    if (!canvas||!posts[idx]) return
    const ctx = canvas.getContext('2d')
    const {pw,ph} = fmt
    const tmpl = TEMPLATES[idx%TEMPLATES.length]
    const accent = accentColors[idx%TEMPLATES.length]
    const imageUrl = aiImageUrl||photo?.url||null
    const img = imageUrl ? await loadImage(imageUrl) : null
    const logoImg = (showLogo&&logoUrl) ? await loadImage(logoUrl) : null
    tmpl.draw(ctx,pw,ph,img,posts[idx],brand,accent,logoImg,logoPosition,logoScale)
  }, [posts,fmt,aiImageUrl,photo,brand,accentColors,showLogo,logoUrl,logoPosition,logoScale,loadImage])

  useEffect(() => { if(posts.length) posts.forEach((_,i)=>setTimeout(()=>renderCanvas(i),100+i*80)) }, [posts,renderCanvas])
  useEffect(() => { if(posts.length&&colorAnalysis) posts.forEach((_,i)=>setTimeout(()=>renderCanvas(i),50+i*60)) }, [accentColors])
  useEffect(() => { if(posts.length) posts.forEach((_,i)=>setTimeout(()=>renderCanvas(i),50+i*50)) }, [showLogo,logoUrl,logoPosition,logoScale])

  const startEdit = (idx,field,current) => { setEditing({idx,field}); setEditVal(current??'') }
  const saveEdit = () => {
    if(!editing) return
    setPosts(prev=>prev.map((p,i)=>i===editing.idx?{...p,[editing.field]:editVal}:p))
    setEditing(null)
  }

  const download = async (idx) => {
    const off=document.createElement('canvas'); off.width=fmt.pw*2; off.height=fmt.ph*2
    const ctx=off.getContext('2d'); ctx.scale(2,2)
    const imageUrl=aiImageUrl||photo?.url||null; const img=imageUrl?await loadImage(imageUrl):null
    const logoImg=(showLogo&&logoUrl)?await loadImage(logoUrl):null
    TEMPLATES[idx%TEMPLATES.length].draw(ctx,fmt.pw,fmt.ph,img,posts[idx],brand,accentColors[idx%TEMPLATES.length],logoImg,logoPosition,logoScale)
    const a=document.createElement('a'); a.download=`brandpulse-${TEMPLATES[idx%TEMPLATES.length].id}-${Date.now()}.png`; a.href=off.toDataURL('image/png'); a.click()
  }

  const reset = () => {
    setStep(0);setPosts([]);setChosen(null);setProductInfo(null);setProductUrl('');setProductQuery('')
    setAiImageUrl(null);setPhotoUrl('');setScenes([]);setChosenScene(null);setCustomScene('');setColorAnalysis(null)
    setAccentColors(TEMPLATES.map(t=>t.accent))
  }

  return (
    <div className="page">
      <div className="page-header">
        <Palette size={24} className="page-icon-violet"/>
        <div><h2>Post Studio</h2><p>Real product + AI scene + Claude Vision + logo overlay. 5 templates.</p></div>
      </div>

      <div className="steps-bar">
        {STEPS.map((s,i)=>(
          <div key={s} className={`step ${i===step?'active':''} ${i<step?'done':''}`}>
            <div className="step-num">{i<step?<Check size={12}/>:i+1}</div><span>{s}</span>
            {i<STEPS.length-1&&<ChevronRight size={14} className="step-arrow"/>}
          </div>
        ))}
      </div>

      {/* STEP 0 — Product */}
      {step===0&&(
        <div className="studio-step animate-slide-up">
          <div className="card form-card">
            <h3 style={{display:'flex',alignItems:'center',gap:8}}><Link size={15}/> Paste product page URL</h3>
            <p className="form-hint">Reads the real page — name, benefits, ingredients extracted automatically.</p>
            <div className="scan-row">
              <input value={productUrl} onChange={e=>setProductUrl(e.target.value)} placeholder="https://heatherandroseh.co.uk/product/nac-600" onKeyDown={e=>e.key==='Enter'&&scrapeProductUrl()}/>
              <button className="btn btn-primary" onClick={scrapeProductUrl} disabled={scrapingProduct||!productUrl}>{scrapingProduct?<span className="spinner"/>:<><Sparkles size={14}/> Read Page</>}</button>
            </div>
          </div>
          <div className="card form-card">
            <h3 style={{display:'flex',alignItems:'center',gap:8}}><Search size={15}/> Or search by name</h3>
            <div className="scan-row">
              <input value={productQuery} onChange={e=>setProductQuery(e.target.value)} placeholder="e.g. Zooki Creatin+ for men" onKeyDown={e=>e.key==='Enter'&&searchProductByName()}/>
              <button className="btn btn-secondary" onClick={searchProductByName} disabled={searchingProduct||!productQuery}>{searchingProduct?<span className="spinner"/>:<><Search size={14}/> Search</>}</button>
            </div>
            {productError&&<p className="scan-error">{productError}</p>}
          </div>
          {productInfo&&(
            <div className="product-result-card card animate-slide-up">
              <div className="product-result-header">
                <div><strong className="product-result-name">{productInfo.name}</strong>{productInfo.brand&&<span className="product-result-brand"> by {productInfo.brand}</span>}</div>
                <button onClick={()=>setProductInfo(null)} className="product-result-clear"><X size={14}/></button>
              </div>
              {productInfo.tagline&&<p className="product-tagline">"{productInfo.tagline}"</p>}
              {productInfo.description&&<p className="product-summary">{productInfo.description}</p>}
              {productInfo.benefits?.length>0&&<ul className="product-benefits">{productInfo.benefits.map((b,i)=><li key={i}>{b}</li>)}</ul>}
              {productInfo.idealFor&&<p className="product-ideal-for">Ideal for: {productInfo.idealFor}</p>}
            </div>
          )}
          <div className="step-nav">
            <span style={{fontSize:12,color:'var(--text-lo)'}}>{productInfo?'✓ Product info ready':'Skip to create general brand content'}</span>
            <button className="btn btn-primary" onClick={()=>setStep(1)}>Next — Photo & Scene <ChevronRight size={16}/></button>
          </div>
        </div>
      )}

      {/* STEP 1 — Scene */}
      {step===1&&(
        <div className="studio-step animate-slide-up">
          {productInfo&&<div className="product-mini-card card"><Package size={14} style={{color:'var(--electric)'}}/><strong>{productInfo.name}</strong><button onClick={()=>setStep(0)} className="btn-ghost" style={{fontSize:11,marginLeft:'auto'}}>Change</button></div>}

          <div className="card form-card">
            <h3><Image size={15}/> Product photo</h3>
            <p className="form-hint">Upload a photo OR paste a direct image URL. Flux Kontext keeps your product exactly as is.</p>
            <div className="scan-row">
              <input value={photoUrl} onChange={e=>{setPhotoUrl(e.target.value);if(e.target.value){setPhotoId(null);setAiImageUrl(null)}}} placeholder="Paste product image URL e.g. https://site.com/product.jpg"/>
              {photoUrl&&<button className="btn-ghost" onClick={()=>setPhotoUrl('')}><X size={14}/></button>}
            </div>
            <div style={{display:'flex',alignItems:'center',gap:10}}><div style={{flex:1,height:1,background:'var(--border)'}}/><span style={{fontSize:11,color:'var(--text-lo)'}}>or upload</span><div style={{flex:1,height:1,background:'var(--border)'}}/></div>
            <button className="btn btn-secondary" onClick={()=>fileRef.current.click()} style={{alignSelf:'flex-start'}}><Upload size={14}/> Upload Photo</button>
            <input ref={fileRef} type="file" accept="image/*" style={{display:'none'}} onChange={e=>handleUpload(e.target.files)}/>
            {assets.filter(a=>!a.isAI).length>0&&(
              <div>
                <p style={{fontSize:11,color:'var(--text-lo)',marginBottom:6}}>Your saved photos — click to select</p>
                <div className="asset-picker-grid">
                  {assets.filter(a=>!a.isAI).map(a=>(
                    <div key={a.id} className={`asset-picker-item ${photoId===a.id&&!photoUrl?'selected':''}`} onClick={()=>{setPhotoId(a.id);setPhotoUrl('');setAiImageUrl(null)}}>
                      <img src={a.url} alt={a.name} className="picker-thumb"/>
                      {photoId===a.id&&!photoUrl&&<div className="picker-check"><Check size={14}/></div>}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {photoUrl&&<div className="url-preview animate-slide-up"><img src={photoUrl} alt="Product" className="url-preview-img" onError={e=>e.target.style.display='none'}/><p style={{fontSize:11,color:'var(--success)'}}>✓ Image URL ready</p></div>}
          </div>

          <div className="card form-card">
            <h3><Wand2 size={15} style={{color:'var(--gold)'}}/> AI Scene — Flux Kontext</h3>
            <p className="form-hint">Flux Kontext keeps your product intact. Claude Vision then picks matching colors for all 5 templates.</p>
            <div className="field"><label>Platform</label><div className="chip-grid">{PLATFORMS.map(p=><button key={p} className={`chip ${platform===p?'chip-active':''}`} onClick={()=>setPlatform(p)}>{p}</button>)}</div></div>
            <div className="field"><label>Format</label><div className="chip-grid">{FORMATS.map((f,i)=><button key={f.id} className={`chip ${formatIdx===i?'chip-active':''}`} onClick={()=>setFormatIdx(i)}>{f.label}</button>)}</div></div>
            {scenes.length===0?(
              <button className="btn btn-secondary" onClick={fetchScenes} disabled={loadingScenes}>{loadingScenes?<><span className="spinner"/> Finding scenes…</>:<><TrendingUp size={14}/> Get Scene Ideas</>}</button>
            ):(
              <div className="scene-options">
                {scenes.map((s,i)=><button key={i} className={`scene-chip ${chosenScene===i?'scene-active':''}`} onClick={()=>{setChosenScene(i);setCustomScene(s.prompt)}}><strong>{s.label}</strong><span className={`mood-tag mood-${i}`}>{s.mood}</span></button>)}
                <button className="btn-ghost" style={{fontSize:11}} onClick={fetchScenes}>↻ Different ideas</button>
              </div>
            )}
            {(chosenScene!==null||customScene)&&<div className="field"><label>Scene description</label><textarea rows={2} value={customScene} onChange={e=>setCustomScene(e.target.value)}/></div>}
            <button className="btn btn-primary" onClick={generateAiImage} disabled={generatingAI||(!photo&&!photoUrl&&!customScene)}>
              {generatingAI?<><span className="spinner"/> Generating…</>:<><Wand2 size={14}/> {(photo||photoUrl)?'Place Product in Scene':'Generate Scene'}</>}
            </button>
            {aiError&&<p className="scan-error">{aiError}</p>}
            {aiImageUrl&&(
              <div className="scene-result animate-slide-up">
                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
                  <Check size={14} style={{color:'var(--success)'}}/><strong style={{fontSize:13}}>✓ Scene generated</strong>
                  <button className="btn-ghost" style={{fontSize:11,marginLeft:'auto'}} onClick={generateAiImage}><RefreshCw size={11}/> Regenerate free</button>
                </div>
                <img src={aiImageUrl} alt="AI scene" className="scene-preview-img"/>
                {analyzingColors&&<div className="color-analysis-status"><Eye size={12}/><span>Claude Vision picking matching colors for all templates…</span></div>}
                {colorAnalysis&&!analyzingColors&&(
                  <div className="color-analysis-result">
                    <Eye size={12} style={{color:'var(--success)'}}/><span>Claude matched colors ({colorAnalysis.imageTone} tone)</span>
                    <div className="color-swatches">{accentColors.slice(0,5).map((c,i)=><div key={i} className="color-swatch" style={{background:c}}/>)}</div>
                    {colorAnalysis.reasoning&&<span className="color-reasoning">{colorAnalysis.reasoning}</span>}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="step-nav">
            <button className="btn btn-secondary" onClick={()=>setStep(0)}><ChevronLeft size={14}/> Back</button>
            <button className="btn btn-primary" style={{padding:'12px 24px'}} onClick={generatePosts} disabled={generatingPosts||(!photo&&!photoUrl&&!productInfo&&!aiImageUrl)}>
              {generatingPosts?<><span className="spinner"/> Creating posts…</>:<><Sparkles size={16}/> Generate 5 Posts</>}
            </button>
          </div>
        </div>
      )}

      {/* STEP 2 — Posts */}
      {step===2&&posts.length>0&&(
        <div className="studio-step animate-slide-up">
          <div className="card form-card">
            <h3>Your 5 Posts — 5 Templates</h3>
            <p className="form-hint" style={{marginTop:4}}>{colorAnalysis?`✓ Claude Vision matched colors (${colorAnalysis.imageTone} tone). `:''}Click any field to edit.</p>
          </div>

          {/* Accent colors */}
          <div className="card" style={{display:'flex',gap:12,alignItems:'center',padding:'12px 16px',flexWrap:'wrap'}}>
            <span style={{fontSize:12,color:'var(--text-mid)',fontFamily:'Space Grotesk',fontWeight:600}}>{colorAnalysis?'Claude-matched':'Accent'} Colours</span>
            {accentColors.slice(0,TEMPLATES.length).map((c,i)=>(
              <div key={i} style={{display:'flex',alignItems:'center',gap:4}}>
                <span style={{fontSize:10,color:'var(--text-lo)'}}>{TEMPLATES[i].label.split(' ')[0]}</span>
                <input type="color" value={c} onChange={e=>{const nc=[...accentColors];nc[i]=e.target.value;setAccentColors(nc);setTimeout(()=>renderCanvas(i),80)}}
                  style={{width:24,height:24,border:'none',borderRadius:4,cursor:'pointer',padding:0}}/>
              </div>
            ))}
          </div>

          {/* Logo controls */}
          <div className="card logo-panel">
            <div className="logo-panel-header">
              <div style={{display:'flex',alignItems:'center',gap:8}}><Star size={15} style={{color:'var(--gold)'}}/><strong style={{fontSize:13,fontFamily:'Space Grotesk'}}>Logo Overlay {brand?.logo?'— brand logo loaded ✓':''}</strong></div>
              <label className="logo-toggle"><input type="checkbox" checked={showLogo} onChange={e=>setShowLogo(e.target.checked)}/><span className="logo-toggle-slider"/></label>
            </div>
            {showLogo&&(
              <div className="logo-controls animate-slide-up">
                <div style={{display:'flex',gap:10,alignItems:'flex-start',flexWrap:'wrap'}}>
                  <div>
                    <p style={{fontSize:11,color:'var(--text-lo)',marginBottom:4}}>Upload different logo</p>
                    <button className="btn btn-secondary" style={{fontSize:12,padding:'6px 12px'}} onClick={()=>logoFileRef.current.click()}><Upload size={12}/> Upload</button>
                    <input ref={logoFileRef} type="file" accept="image/*" style={{display:'none'}} onChange={e=>handleLogoUpload(e.target.files)}/>
                  </div>
                  {logoUrl&&(
                    <div className="logo-preview-thumb">
                      <img src={logoUrl} alt="Logo"/>
                      <p style={{fontSize:9,color:'var(--success)',marginTop:2}}>✓ Active</p>
                      {logoOverrideUrl&&<button onClick={()=>setLogoOverrideUrl(null)} style={{fontSize:9,color:'var(--text-lo)',background:'none',border:'none',cursor:'pointer'}}>Use brand logo</button>}
                    </div>
                  )}
                </div>
                <div style={{display:'flex',gap:20,flexWrap:'wrap',marginTop:4}}>
                  <div>
                    <p style={{fontSize:11,color:'var(--text-lo)',marginBottom:6}}>Position</p>
                    <div className="logo-position-grid">
                      {LOGO_POSITIONS.map(pos=><button key={pos.id} className={`logo-pos-btn ${logoPosition===pos.id?'active':''}`} onClick={()=>setLogoPosition(pos.id)} title={pos.id.replace('-',' ')}>{pos.label}</button>)}
                    </div>
                  </div>
                  <div>
                    <p style={{fontSize:11,color:'var(--text-lo)',marginBottom:6}}>Size</p>
                    <div style={{display:'flex',gap:6}}>{LOGO_SIZES.map(sz=><button key={sz.id} className={`logo-size-btn ${logoSizeId===sz.id?'active':''}`} onClick={()=>setLogoSizeId(sz.id)}>{sz.label}</button>)}</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="posts-grid">
            {posts.map((post,i)=>(
              <div key={i} className={`post-result-card card ${chosen===i?'post-chosen':''}`} onClick={()=>setChosen(i)}>
                <div className="post-template-label">
                  <span className="tag tag-violet">{TEMPLATES[i%TEMPLATES.length].label}</span>
                  {chosen===i&&<span className="tag tag-electric">✓ Favourite</span>}
                </div>
                <div className="canvas-wrap" style={{width:fmt.pw,height:fmt.ph}}>
                  <canvas ref={el=>{canvasRefs.current[i]=el;if(el)setTimeout(()=>renderCanvas(i),100+i*80)}} width={fmt.pw} height={fmt.ph} className="post-canvas"/>
                </div>
                <div className="edit-fields">
                  {['headline','subtext','cta'].map(field=>(
                    <div key={field} className="edit-field">
                      <div className="edit-field-label"><Type size={10}/> {field}</div>
                      {editing?.idx===i&&editing?.field===field?(
                        <div style={{display:'flex',gap:6}}>
                          <input value={editVal} onChange={e=>setEditVal(e.target.value)} onKeyDown={e=>e.key==='Enter'&&saveEdit()} style={{fontSize:12,padding:'4px 8px'}} autoFocus/>
                          <button className="btn btn-primary" style={{padding:'4px 10px',fontSize:11}} onClick={saveEdit}>✓</button>
                        </div>
                      ):(
                        <div className="edit-field-value" onClick={e=>{e.stopPropagation();startEdit(i,field,post[field])}}>{post[field]??'—'} <Edit2 size={10}/></div>
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
          <div className="step-nav"><button className="btn btn-secondary" onClick={reset}>Start a New Post</button></div>
        </div>
      )}

      {editing&&(
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
