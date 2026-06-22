import { useState, useRef, useEffect, useCallback } from 'react'
import { Palette, Sparkles, Download, Send, Check, ChevronRight, ChevronLeft, Image, Play, Pause, Zap, Edit2, Type, Upload, TrendingUp, X } from 'lucide-react'
import { callClaude } from '../lib/api.js'
import './Page.css'
import './PostStudio.css'

const PLATFORMS = ['Instagram', 'TikTok', 'LinkedIn', 'Facebook', 'X (Twitter)', 'Pinterest']
const FORMATS = [
  { id: 'square',    label: '1:1 Square',  pw: 320, ph: 320 },
  { id: 'story',     label: '9:16 Story',  pw: 180, ph: 320 },
  { id: 'landscape', label: '16:9 Banner', pw: 320, ph: 180 },
]
const STEPS = ['Photo', 'Brief', 'Results']

function drawSplitPanel(ctx, w, h, img, post, brand, accent) {
  ctx.fillStyle = '#0F0A1E'
  ctx.fillRect(0, 0, w, h)
  if (img) {
    ctx.save()
    ctx.beginPath(); ctx.rect(0, 0, w * 0.55, h); ctx.clip()
    const scale = Math.max((w * 0.55) / img.width, h / img.height)
    const iw = img.width * scale, ih = img.height * scale
    ctx.drawImage(img, -(iw - w * 0.55) / 2, -(ih - h) / 2, iw, ih)
    ctx.restore()
  }
  ctx.fillStyle = accent
  ctx.fillRect(w * 0.55, 0, w * 0.45, h)
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
  ctx.fillStyle = 'rgba(255,255,255,0.2)'
  ctx.beginPath(); ctx.roundRect(tx, ctaY, maxTw * 0.85, h * 0.1, 4); ctx.fill()
  ctx.fillStyle = '#FFFFFF'
  ctx.font = `700 ${Math.max(7, h * 0.038)}px "Space Grotesk", sans-serif`
  ctx.textAlign = 'center'
  ctx.fillText(post.cta ?? 'Learn More', tx + maxTw * 0.425, ctaY + h * 0.065)
  ctx.fillStyle = 'rgba(255,255,255,0.5)'
  ctx.textAlign = 'right'
  ctx.font = `600 ${Math.max(6, h * 0.032)}px "Space Grotesk", sans-serif`
  ctx.fillText(brand?.name ?? '', w - 10, h - 8)
}

function drawEditorialStrip(ctx, w, h, img, post, brand, accent) {
  ctx.fillStyle = '#0F0A1E'
  ctx.fillRect(0, 0, w, h)
  const imgH = h * 0.62
  if (img) {
    ctx.save()
    ctx.beginPath(); ctx.rect(0, 0, w, imgH); ctx.clip()
    const scale = Math.max(w / img.width, imgH / img.height)
    const iw = img.width * scale, ih = img.height * scale
    ctx.drawImage(img, -(iw - w) / 2, -(ih - imgH) / 2, iw, ih)
    ctx.restore()
  }
  ctx.fillStyle = accent
  ctx.fillRect(0, imgH, w, h - imgH)
  ctx.fillStyle = 'rgba(255,255,255,0.3)'
  ctx.fillRect(0, imgH, w, 2)
  const stripMid = imgH + (h - imgH) / 2
  ctx.textAlign = 'center'
  ctx.fillStyle = '#FFFFFF'
  ctx.font = `800 ${Math.max(12, h * 0.075)}px "Space Grotesk", sans-serif`
  ctx.fillText(post.headline ?? '', w / 2, stripMid - h * 0.04)
  ctx.fillStyle = 'rgba(255,255,255,0.75)'
  ctx.font = `400 ${Math.max(8, h * 0.04)}px Inter, sans-serif`
  ctx.fillText(post.subtext ?? '', w / 2, stripMid + h * 0.055)
  ctx.fillStyle = 'rgba(255,255,255,0.85)'
  ctx.textAlign = 'left'
  ctx.font = `700 ${Math.max(7, h * 0.038)}px "Space Grotesk", sans-serif`
  ctx.fillText(brand?.name ?? '', 12, 22)
}

function drawMinimalOverlay(ctx, w, h, img, post, brand, accent) {
  ctx.fillStyle = '#111'
  ctx.fillRect(0, 0, w, h)
  if (img) {
    const scale = Math.max(w / img.width, h / img.height)
    const iw = img.width * scale, ih = img.height * scale
    ctx.drawImage(img, -(iw - w) / 2, -(ih - h) / 2, iw, ih)
  }
  const stripH = h * 0.38, stripY = h - stripH
  const grad = ctx.createLinearGradient(0, stripY - 20, 0, h)
  grad.addColorStop(0, 'rgba(0,0,0,0)'); grad.addColorStop(0.3, 'rgba(0,0,0,0.7)'); grad.addColorStop(1, 'rgba(0,0,0,0.92)')
  ctx.fillStyle = grad
  ctx.fillRect(0, stripY - 20, w, stripH + 20)
  ctx.fillStyle = accent
  ctx.fillRect(0, stripY, 3, stripH)
  ctx.textAlign = 'left'
  const tx = 16
  ctx.fillStyle = '#FFFFFF'
  ctx.font = `700 ${Math.max(13, h * 0.078)}px "Space Grotesk", sans-serif`
  wrapText(ctx, post.headline ?? '', tx, stripY + h * 0.1, w - tx * 2, h * 0.088)
  ctx.fillStyle = 'rgba(255,255,255,0.7)'
  ctx.font = `400 ${Math.max(9, h * 0.042)}px Inter, sans-serif`
  wrapText(ctx, post.subtext ?? '', tx, stripY + h * 0.22, w - tx * 2, h * 0.052)
  const ctaText = post.cta ?? 'Learn More'
  const ctaW = Math.min(w * 0.5, 130), ctaH = h * 0.09
  ctx.fillStyle = accent
  ctx.beginPath(); ctx.roundRect(tx, h - ctaH - 14, ctaW, ctaH, ctaH / 2); ctx.fill()
  ctx.fillStyle = '#FFFFFF'
  ctx.textAlign = 'center'
  ctx.font = `700 ${Math.max(8, h * 0.04)}px "Space Grotesk", sans-serif`
  ctx.fillText(ctaText, tx + ctaW / 2, h - ctaH - 14 + ctaH * 0.65)
  ctx.fillStyle = 'rgba(255,255,255,0.8)'
  ctx.textAlign = 'right'
  ctx.font = `600 ${Math.max(7, h * 0.036)}px "Space Grotesk", sans-serif`
  ctx.fillText(brand?.name ?? '', w - 10, 20)
}

function wrapText(ctx, text, x, y, maxW, lineH) {
  if (!text) return
  const words = text.split(' ')
  let line = '', cy = y
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
  const [generating, setGenerating] = useState(false)
  const [posts, setPosts] = useState([])
  const [chosen, setChosen] = useState(null)
  const [playing, setPlaying] = useState(true)
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
      type: f.type, size: (f.size / 1024).toFixed(0) + ' KB', tags: [], caption: ''
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

  const findTrendOptions = async () => {
    setFindingTrends(true)
    setTrendOptions([])
    try {
      const result = await callClaude({
        system: 'Return JSON only: { "trends": [{ "title": "...", "hook": "..." }] } — exactly 3 short trending content angles, no markdown.',
        messages: [{ role: 'user', content: `Platform: ${platform}. Topic/story: ${story || brand?.industry || 'general'}. Brand: ${brand?.name ?? ''}.` }],
        max_tokens: 400
      })
      const parsed = JSON.parse(result.replace(/```json|```/g, '').trim())
      setTrendOptions(parsed.trends ?? [])
    } catch { setTrendOptions([]) }
    setFindingTrends(false)
  }

  const generatePosts = async () => {
    setGenerating(true); setPosts([])
    try {
      const brandCtx = brand ? `Brand: ${brand.name}. Industry: ${brand.industry}. Tone: ${brand.tone}. Description: ${brand.description}.` : ''
      const trendCtx = (useTrend && activeTrend)
        ? `IMPORTANT — adapt this trend's structure and energy into OUR OWN brand content. Do not use the trend's literal wording. Trend angle: "${activeTrend.title}". Trend hook style: "${activeTrend.hook}". Reframe this entirely around our brand, our products, our story.`
        : ''
      const result = await callClaude({
        system: 'You are a social media copywriter for small businesses. Return JSON only, no markdown: { "posts": [{ "headline": "max 6 words punchy", "subtext": "max 12 words supporting", "caption": "full caption with emojis for the feed", "hashtags": ["tag1","tag2","tag3","tag4","tag5"], "cta": "3 word action phrase" }] } — exactly 3 variations with different angles.',
        messages: [{ role: 'user', content: `${brandCtx} ${trendCtx} Platform: ${platform}. What this post is about: ${story || brand?.description || 'Share brand value'}.` }],
        max_tokens: 1200
      })
      const parsed = JSON.parse(result.replace(/```json|```/g, '').trim())
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
  useEffect(() => {
    if (!animated || !playing || !posts.length) return
    animTimer.current = setInterval(() => { animFrame.current++; posts.forEach((_, i) => renderCanvas(i)) }, 800)
    return () => clearInterval(animTimer.current)
  }, [animated, playing, posts, renderCanvas])

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
    a.href = off.toDataURL('image/png')
    a.click()
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

      {step === 0 && (
        <div className="studio-step animate-slide-up">
          <div className="card form-card">
            <h3>Pick Your Photo</h3>
            <p className="form-hint">Choose from your Asset Library, or upload a new one right now.</p>
            <button className="btn btn-secondary" onClick={() => fileRef.current.click()} style={{ alignSelf: 'flex-start' }}>
              <Upload size={14} /> Upload New Photo
            </button>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handleUpload(e.target.files)} />
          </div>

          {assets.length === 0 ? (
            <div className="card empty-state">
              <Image size={32} className="empty-icon" />
              <p>No photos yet — upload one above to get started.</p>
            </div>
          ) : (
            <div className="asset-picker-grid">
              {assets.map(a => (
                <div key={a.id} className={`asset-picker-item ${photoId === a.id ? 'selected' : ''}`} onClick={() => setPhotoId(a.id)}>
                  <img src={a.url} alt={a.name} className="picker-thumb" />
                  {photoId === a.id && <div className="picker-check"><Check size={16} /></div>}
                </div>
              ))}
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

      {step === 1 && (
        <div className="studio-step animate-slide-up">
          <div className="card" style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            {photo && <img src={photo.url} alt="" style={{ width: 60, height: 60, borderRadius: 10, objectFit: 'cover' }} />}
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 12, color: 'var(--text-mid)' }}>Your photo is ready. Now tell us about this post.</p>
            </div>
            <button className="btn-ghost" onClick={() => setStep(0)} style={{ fontSize: 12 }}>Change photo</button>
          </div>

          <div className="card form-card">
            <div className="field">
              <label>What's this post about?</label>
              <textarea rows={4} value={story} onChange={e => setStory(e.target.value)}
                placeholder="e.g. New organic vitamin C range just arrived — boosts immunity, great for the whole family. Want to drive people into the shop this week." autoFocus />
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

            <div className="field">
              <label>Style</label>
              <div className="toggle-row">
                <button className={`toggle-opt ${!animated ? 'active' : ''}`} onClick={() => setAnimated(false)}><Image size={14} /> Static</button>
                <button className={`toggle-opt ${animated ? 'active' : ''}`} onClick={() => setAnimated(true)}><Play size={14} /> Animated</button>
              </div>
            </div>

            <div className="trend-toggle-section">
              <label className="trend-toggle-label">
                <input type="checkbox" checked={useTrend} onChange={e => { setUseTrend(e.target.checked); if (e.target.checked && !activeTrend) findTrendOptions() }} />
                <TrendingUp size={14} /> Adapt a trend into this post
              </label>

              {useTrend && (
                <div className="trend-options-box">
                  {activeTrend && (
                    <div className="active-trend-pill">
                      <span>Using: <strong>{activeTrend.title}</strong></span>
                      <button onClick={() => setActiveTrend(null)}><X size={12} /></button>
                    </div>
                  )}
                  {!activeTrend && (
                    <>
                      {findingTrends ? (
                        <p className="form-hint"><span className="spinner" /> Finding trend ideas…</p>
                      ) : trendOptions.length > 0 ? (
                        <div className="trend-chip-list">
                          {trendOptions.map((t, i) => (
                            <button key={i} className="trend-pick-chip" onClick={() => setActiveTrend(t)}>
                              <strong>{t.title}</strong>
                              <span>{t.hook}</span>
                            </button>
                          ))}
                          <button className="btn-ghost" style={{ fontSize: 11 }} onClick={findTrendOptions}>↻ Find different ideas</button>
                        </div>
                      ) : (
                        <button className="btn btn-secondary" onClick={findTrendOptions} style={{ fontSize: 12 }}>
                          <Sparkles size={12} /> Find Trend Ideas
                        </button>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="step-nav">
            <button className="btn btn-secondary" onClick={() => setStep(0)}><ChevronLeft size={14} /> Back</button>
            <button className="btn btn-primary generate-btn" onClick={generatePosts} disabled={generating || !story}>
              {generating ? <><span className="spinner" /> Creating your posts…</> : <><Sparkles size={16} /> Generate 3 Posts</>}
            </button>
          </div>
        </div>
      )}

      {step === 2 && posts.length > 0 && (
        <div className="studio-step animate-slide-up">
          <div className="card form-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3>Your 3 Posts</h3>
                <p className="form-hint" style={{ marginTop: 4 }}>Click any text to edit it. Click a post to mark it as your favourite.</p>
              </div>
              {animated && (
                <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: 12 }} onClick={() => setPlaying(p => !p)}>
                  {playing ? <><Pause size={12} /> Pause</> : <><Play size={12} /> Play</>}
                </button>
              )}
            </div>
          </div>

          <div className="card" style={{ display: 'flex', gap: 16, alignItems: 'center', padding: '12px 16px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, color: 'var(--text-mid)', fontFamily: 'Space Grotesk', fontWeight: 600 }}>Accent Colours</span>
            {accentColors.map((c, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 11, color: 'var(--text-lo)' }}>{i + 1}</span>
                <input type="color" value={c} onChange={e => { const nc = [...accentColors]; nc[i] = e.target.value; setAccentColors(nc); setTimeout(() => renderCanvas(i), 80) }}
                  style={{ width: 28, height: 28, border: 'none', borderRadius: 6, cursor: 'pointer', background: 'none', padding: 0 }} />
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
                  <canvas ref={el => { canvasRefs.current[i] = el; if (el) setTimeout(() => renderCanvas(i), 50) }} width={fmt.pw} height={fmt.ph} className="post-canvas" />
                </div>
                <div className="edit-fields">
                  {['headline', 'subtext', 'cta'].map(field => (
                    <div key={field} className="edit-field">
                      <div className="edit-field-label"><Type size={10} /> {field}</div>
                      {editing?.idx === i && editing?.field === field ? (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <input value={editVal} onChange={e => setEditVal(e.target.value)} onKeyDown={e => e.key === 'Enter' && saveEdit()} style={{ fontSize: 12, padding: '4px 8px' }} autoFocus />
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
                  <div className="post-hashtags">{post.hashtags?.map(h => <span key={h} className="tag tag-violet">{h.startsWith('#') ? h : '#' + h}</span>)}</div>
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
              <Zap size={20} style={{ color: 'var(--gold)', flexShrink: 0 }} />
              <div><h4>Want AI-generated backgrounds?</h4><p>Upgrade to BrandPulse Pro to generate stunning AI images — no photographer needed.</p></div>
            </div>
            <button className="btn btn-primary" style={{ flexShrink: 0 }}>Upgrade to Pro</button>
          </div>

          <div className="step-nav">
            <button className="btn btn-secondary" onClick={() => { setStep(0); setPosts([]); setChosen(null); setStory(''); setActiveTrend(null) }}>
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
