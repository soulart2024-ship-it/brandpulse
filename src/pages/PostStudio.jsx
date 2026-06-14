import { useState, useRef, useEffect, useCallback } from 'react'
import { Palette, Sparkles, Download, Send, Check, ChevronRight, Image, Play, Pause, Zap, Edit2, Type, Move } from 'lucide-react'
import { callClaude } from '../lib/api.js'
import './Page.css'
import './PostStudio.css'

const PLATFORMS = ['Instagram', 'TikTok', 'LinkedIn', 'Facebook', 'X (Twitter)', 'Pinterest']
const FORMATS = [
  { id: 'square',    label: '1:1 Square',   pw: 320, ph: 320 },
  { id: 'story',     label: '9:16 Story',   pw: 180, ph: 320 },
  { id: 'landscape', label: '16:9 Banner',  pw: 320, ph: 180 },
]
const STEPS = ['Brief', 'Assets', 'Generate', 'Choose & Export']

// ─── Template renderers ───────────────────────────────────────────────
function drawSplitPanel(ctx, w, h, img, post, brand, accent, frame) {
  // Left half: image, Right half: brand colour panel
  ctx.fillStyle = '#0F0A1E'
  ctx.fillRect(0, 0, w, h)

  if (img) {
    ctx.save()
    ctx.beginPath()
    ctx.rect(0, 0, w * 0.55, h)
    ctx.clip()
    const scale = Math.max((w * 0.55) / img.width, h / img.height)
    const iw = img.width * scale, ih = img.height * scale
    ctx.drawImage(img, -(iw - w * 0.55) / 2, -(ih - h) / 2, iw, ih)
    ctx.restore()
  }

  // Right panel
  ctx.fillStyle = accent
  ctx.fillRect(w * 0.55, 0, w * 0.45, h)

  // Diagonal slice
  ctx.beginPath()
  ctx.moveTo(w * 0.52, 0)
  ctx.lineTo(w * 0.58, 0)
  ctx.lineTo(w * 0.55, h)
  ctx.lineTo(w * 0.49, h)
  ctx.fillStyle = accent
  ctx.fill()

  // Text on right panel
  const tx = w * 0.62
  const maxTw = w * 0.34
  ctx.fillStyle = '#FFFFFF'
  ctx.textAlign = 'left'

  // Category label
  ctx.font = `600 ${Math.max(7, h * 0.038)}px "Space Grotesk", sans-serif`
  ctx.fillStyle = 'rgba(255,255,255,0.6)'
  ctx.fillText((brand?.industry ?? 'BRAND').toUpperCase().slice(0, 12), tx, h * 0.18)

  // Headline
  ctx.fillStyle = '#FFFFFF'
  ctx.font = `800 ${Math.max(11, h * 0.072)}px "Space Grotesk", sans-serif`
  wrapText(ctx, post.headline ?? '', tx, h * 0.32, maxTw, h * 0.082)

  // Subtext
  ctx.font = `400 ${Math.max(8, h * 0.042)}px Inter, sans-serif`
  ctx.fillStyle = 'rgba(255,255,255,0.8)'
  wrapText(ctx, post.subtext ?? '', tx, h * 0.58, maxTw, h * 0.052)

  // CTA
  const ctaY = h * 0.78
  ctx.fillStyle = 'rgba(255,255,255,0.2)'
  ctx.beginPath()
  ctx.roundRect(tx, ctaY, maxTw * 0.85, h * 0.1, 4)
  ctx.fill()
  ctx.fillStyle = '#FFFFFF'
  ctx.font = `700 ${Math.max(7, h * 0.038)}px "Space Grotesk", sans-serif`
  ctx.textAlign = 'center'
  ctx.fillText(post.cta ?? 'Learn More', tx + maxTw * 0.425, ctaY + h * 0.065)

  // Brand name bottom right
  ctx.fillStyle = 'rgba(255,255,255,0.5)'
  ctx.textAlign = 'right'
  ctx.font = `600 ${Math.max(6, h * 0.032)}px "Space Grotesk", sans-serif`
  ctx.fillText(brand?.name ?? '', w - 10, h - 8)
}

function drawEditorialStrip(ctx, w, h, img, post, brand, accent, frame) {
  // Full image top 65%, solid brand strip bottom 35%
  ctx.fillStyle = '#0F0A1E'
  ctx.fillRect(0, 0, w, h)

  const imgH = h * 0.62
  if (img) {
    ctx.save()
    ctx.beginPath()
    ctx.rect(0, 0, w, imgH)
    ctx.clip()
    const scale = Math.max(w / img.width, imgH / img.height)
    const iw = img.width * scale, ih = img.height * scale
    ctx.drawImage(img, -(iw - w) / 2, -(ih - imgH) / 2, iw, ih)
    ctx.restore()
  }

  // Brand strip
  ctx.fillStyle = accent
  ctx.fillRect(0, imgH, w, h - imgH)

  // Accent line
  ctx.fillStyle = 'rgba(255,255,255,0.3)'
  ctx.fillRect(0, imgH, w, 2)

  // Text in strip
  const stripMid = imgH + (h - imgH) / 2
  ctx.textAlign = 'center'

  ctx.fillStyle = '#FFFFFF'
  ctx.font = `800 ${Math.max(12, h * 0.075)}px "Space Grotesk", sans-serif`
  ctx.fillText(post.headline ?? '', w / 2, stripMid - h * 0.04)

  ctx.fillStyle = 'rgba(255,255,255,0.75)'
  ctx.font = `400 ${Math.max(8, h * 0.04)}px Inter, sans-serif`
  ctx.fillText(post.subtext ?? '', w / 2, stripMid + h * 0.055)

  // Brand name top left
  ctx.fillStyle = 'rgba(255,255,255,0.85)'
  ctx.textAlign = 'left'
  ctx.font = `700 ${Math.max(7, h * 0.038)}px "Space Grotesk", sans-serif`
  ctx.fillText(brand?.name ?? '', 12, 22)

  // Small accent dot
  ctx.fillStyle = 'rgba(255,255,255,0.5)'
  ctx.beginPath()
  ctx.arc(12 + (ctx.measureText(brand?.name ?? '').width) + 8, 17, 3, 0, Math.PI * 2)
  ctx.fill()
}

function drawMinimalOverlay(ctx, w, h, img, post, brand, accent, frame) {
  // Full bleed image, minimal elegant text overlay with frosted strip
  ctx.fillStyle = '#111'
  ctx.fillRect(0, 0, w, h)

  if (img) {
    const scale = Math.max(w / img.width, h / img.height)
    const iw = img.width * scale, ih = img.height * scale
    ctx.drawImage(img, -(iw - w) / 2, -(ih - h) / 2, iw, ih)
  }

  // Frosted glass bottom strip
  const stripH = h * 0.38
  const stripY = h - stripH
  const grad = ctx.createLinearGradient(0, stripY - 20, 0, h)
  grad.addColorStop(0, 'rgba(0,0,0,0)')
  grad.addColorStop(0.3, 'rgba(0,0,0,0.7)')
  grad.addColorStop(1, 'rgba(0,0,0,0.92)')
  ctx.fillStyle = grad
  ctx.fillRect(0, stripY - 20, w, stripH + 20)

  // Accent left border
  ctx.fillStyle = accent
  ctx.fillRect(0, stripY, 3, stripH)

  // Text
  ctx.textAlign = 'left'
  const tx = 16

  // Headline
  ctx.fillStyle = '#FFFFFF'
  ctx.font = `700 ${Math.max(13, h * 0.078)}px "Space Grotesk", sans-serif`
  wrapText(ctx, post.headline ?? '', tx, stripY + h * 0.1, w - tx * 2, h * 0.088)

  // Subtext
  ctx.fillStyle = 'rgba(255,255,255,0.7)'
  ctx.font = `400 ${Math.max(9, h * 0.042)}px Inter, sans-serif`
  wrapText(ctx, post.subtext ?? '', tx, stripY + h * 0.22, w - tx * 2, h * 0.052)

  // CTA pill
  const ctaText = post.cta ?? 'Learn More'
  const ctaW = Math.min(w * 0.5, 130)
  const ctaH = h * 0.09
  const ctaX = tx
  const ctaY = h - ctaH - 14
  ctx.fillStyle = accent
  ctx.beginPath()
  ctx.roundRect(ctaX, ctaY, ctaW, ctaH, ctaH / 2)
  ctx.fill()
  ctx.fillStyle = '#FFFFFF'
  ctx.textAlign = 'center'
  ctx.font = `700 ${Math.max(8, h * 0.04)}px "Space Grotesk", sans-serif`
  ctx.fillText(ctaText, ctaX + ctaW / 2, ctaY + ctaH * 0.65)

  // Brand name top right
  ctx.fillStyle = 'rgba(255,255,255,0.8)'
  ctx.textAlign = 'right'
  ctx.font = `600 ${Math.max(7, h * 0.036)}px "Space Grotesk", sans-serif`
  ctx.fillText(brand?.name ?? '', w - 10, 20)
}

function wrapText(ctx, text, x, y, maxW, lineH) {
  if (!text) return
  const words = text.split(' ')
  let line = ''
  let cy = y
  for (let n = 0; n < words.length; n++) {
    const test = line + words[n] + ' '
    if (ctx.measureText(test).width > maxW && n > 0) {
      ctx.fillText(line.trim(), x, cy)
      line = words[n] + ' '
      cy += lineH
      if (cy > y + lineH * 2.5) break // max 3 lines
    } else { line = test }
  }
  ctx.fillText(line.trim(), x, cy)
}

const TEMPLATES = [
  { id: 'split',     label: 'Split Panel',      draw: drawSplitPanel,     accent: '#7C3AED' },
  { id: 'editorial', label: 'Editorial Strip',  draw: drawEditorialStrip, accent: '#06B6D4' },
  { id: 'minimal',   label: 'Minimal Overlay',  draw: drawMinimalOverlay, accent: '#F472B6' },
]

// ─── Main Component ───────────────────────────────────────────────────
export default function PostStudio({ brand, assets, selectedTrend, onNavigate }) {
  const [step, setStep] = useState(0)
  const [platform, setPlatform] = useState(selectedTrend?.platform ?? 'Instagram')
  const [formatIdx, setFormatIdx] = useState(0)
  const [story, setStory] = useState('')
  const [extraText, setExtraText] = useState('')
  const [animated, setAnimated] = useState(false)
  const [chosenAssets, setChosenAssets] = useState([])
  const [generating, setGenerating] = useState(false)
  const [posts, setPosts] = useState([])
  const [chosen, setChosen] = useState(null)
  const [playing, setPlaying] = useState(true)
  const [editing, setEditing] = useState(null) // { idx, field }
  const [editVal, setEditVal] = useState('')
  const [accentColors, setAccentColors] = useState(['#7C3AED', '#06B6D4', '#F472B6'])
  const canvasRefs = useRef({})
  const imgCache = useRef({})
  const animFrame = useRef(0)
  const animTimer = useRef(null)

  const fmt = FORMATS[formatIdx]

  const toggleAsset = (id) => setChosenAssets(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id])

  const loadImage = (url) => new Promise((resolve) => {
    if (imgCache.current[url]) { resolve(imgCache.current[url]); return }
    const img = new window.Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => { imgCache.current[url] = img; resolve(img) }
    img.onerror = () => resolve(null)
    img.src = url
  })

  const renderCanvas = useCallback(async (idx, frame = 0) => {
    const canvas = canvasRefs.current[idx]
    if (!canvas || !posts[idx]) return
    const ctx = canvas.getContext('2d')
    const { pw, ph } = fmt
    const post = posts[idx]
    const tmpl = TEMPLATES[idx % TEMPLATES.length]
    const accent = accentColors[idx % 3]

    const firstAssetId = chosenAssets[0]
    const firstAsset = assets.find(a => a.id === firstAssetId)
    const img = firstAsset ? await loadImage(firstAsset.url) : null

    tmpl.draw(ctx, pw, ph, img, post, brand, accent, frame)
  }, [posts, fmt, chosenAssets, assets, brand, accentColors])

  useEffect(() => {
    if (posts.length === 0) return
    posts.forEach((_, i) => renderCanvas(i, 0))
  }, [posts, renderCanvas])

  useEffect(() => {
    if (!animated || !playing || posts.length === 0) return
    animTimer.current = setInterval(() => {
      animFrame.current++
      posts.forEach((_, i) => renderCanvas(i, animFrame.current))
    }, 60)
    return () => clearInterval(animTimer.current)
  }, [animated, playing, posts, renderCanvas])

  const generatePosts = async () => {
    setGenerating(true)
    setPosts([])
    try {
      const trendCtx = selectedTrend ? `Trend: "${selectedTrend.title}". Hook: "${selectedTrend.hook}".` : ''
      const brandCtx = brand ? `Brand: ${brand.name}. Industry: ${brand.industry}. Tone: ${brand.tone}.` : ''
      const result = await callClaude({
        system: 'You are a social media copywriter. Return JSON only, no markdown: { "posts": [{ "headline": "max 6 words punchy", "subtext": "max 12 words supporting", "caption": "full caption with emojis for the feed", "hashtags": ["tag1","tag2","tag3","tag4","tag5"], "cta": "3 word action phrase" }] } — exactly 3 variations, each with a different angle/hook.',
        messages: [{ role: 'user', content: `${brandCtx} ${trendCtx} Platform: ${platform}. Story: ${story || brand?.description || 'Share brand value'}. Extra: ${extraText || 'none'}.` }],
        max_tokens: 1200
      })
      const clean = result.replace(/```json|```/g, '').trim()
      const parsed = JSON.parse(clean)
      setPosts(parsed.posts.slice(0, 3))
      setStep(3)
    } catch (e) { console.error(e) }
    setGenerating(false)
  }

  const startEdit = (idx, field, current) => {
    setEditing({ idx, field })
    setEditVal(current ?? '')
  }

  const saveEdit = () => {
    if (!editing) return
    setPosts(prev => prev.map((p, i) =>
      i === editing.idx ? { ...p, [editing.field]: editVal } : p
    ))
    setEditing(null)
  }

  const download = async (idx) => {
    // Render at 2x for quality
    const offscreen = document.createElement('canvas')
    offscreen.width = fmt.pw * 2
    offscreen.height = fmt.ph * 2
    const ctx = offscreen.getContext('2d')
    ctx.scale(2, 2)
    const post = posts[idx]
    const tmpl = TEMPLATES[idx % TEMPLATES.length]
    const accent = accentColors[idx % 3]
    const firstAsset = assets.find(a => a.id === chosenAssets[0])
    const img = firstAsset ? await loadImage(firstAsset.url) : null
    tmpl.draw(ctx, fmt.pw, fmt.ph, img, post, brand, accent, 0)
    const a = document.createElement('a')
    a.download = `brandpulse-${TEMPLATES[idx % TEMPLATES.length].id}-${Date.now()}.png`
    a.href = offscreen.toDataURL('image/png')
    a.click()
  }

  return (
    <div className="page">
      <div className="page-header">
        <Palette size={24} className="page-icon-violet" />
        <div>
          <h2>Post Studio</h2>
          <p>Create finished, branded social posts ready to download or send to Buffer.</p>
        </div>
      </div>

      {selectedTrend && (
        <div className="trend-banner card">
          <span className="tag tag-rose">Trend</span>
          <span className="trend-banner-title">{selectedTrend.title}</span>
          <span className="tag tag-electric">{selectedTrend.platform}</span>
        </div>
      )}

      <div className="steps-bar">
        {STEPS.map((s, i) => (
          <div key={s} className={`step ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`}>
            <div className="step-num">{i < step ? <Check size={12} /> : i + 1}</div>
            <span>{s}</span>
            {i < STEPS.length - 1 && <ChevronRight size={14} className="step-arrow" />}
          </div>
        ))}
      </div>

      {/* STEP 0 — Brief */}
      {step === 0 && (
        <div className="studio-step card form-card animate-slide-up">
          <h3>Your Post Brief</h3>
          <div className="form-grid">
            <div className="form-col">
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
            </div>
            <div className="form-col">
              <div className="field">
                <label>What's the story? (your words)</label>
                <textarea rows={4} value={story} onChange={e => setStory(e.target.value)} placeholder="e.g. We just launched Harmonic Blink — it helps people recalibrate their nervous system in 7 steps. I want to share the excitement..." />
              </div>
              <div className="field">
                <label>Anything extra? (offer, price, link)</label>
                <input value={extraText} onChange={e => setExtraText(e.target.value)} placeholder="e.g. 50% off this week, link in bio" />
              </div>
            </div>
          </div>
          <button className="btn btn-primary next-btn" onClick={() => setStep(1)}>Next — Choose Assets <ChevronRight size={16} /></button>
        </div>
      )}

      {/* STEP 1 — Assets */}
      {step === 1 && (
        <div className="studio-step animate-slide-up">
          <div className="card form-card">
            <h3>Choose Your Photo</h3>
            <p className="form-hint">Select the photo to feature in your post. The first selected will be used.</p>
          </div>
          {assets.length === 0 ? (
            <div className="card empty-state">
              <Image size={32} className="empty-icon" />
              <p>No assets uploaded yet.</p>
              <button className="btn btn-secondary" onClick={() => onNavigate('assets')}>Go to Asset Library</button>
            </div>
          ) : (
            <div className="asset-picker-grid">
              {assets.map(a => (
                <div key={a.id} className={`asset-picker-item ${chosenAssets.includes(a.id) ? 'selected' : ''}`} onClick={() => toggleAsset(a.id)}>
                  <img src={a.url} alt={a.name} className="picker-thumb" />
                  {chosenAssets.includes(a.id) && <div className="picker-check"><Check size={16} /></div>}
                  <div className="picker-tags">{a.tags?.slice(0, 2).map(t => <span key={t} className="picker-tag">{t}</span>)}</div>
                </div>
              ))}
            </div>
          )}
          <div className="step-nav">
            <button className="btn btn-secondary" onClick={() => setStep(0)}>Back</button>
            <button className="btn btn-primary" onClick={() => setStep(2)}>Next — Generate <ChevronRight size={16} /></button>
          </div>
        </div>
      )}

      {/* STEP 2 — Generate */}
      {step === 2 && (
        <div className="studio-step card form-card animate-slide-up">
          <h3>Ready to Generate</h3>
          <div className="generate-summary">
            {[['Platform', platform], ['Format', fmt.label], ['Style', animated ? 'Animated' : 'Static'], ['Photos', chosenAssets.length + ' selected'], selectedTrend && ['Trend', selectedTrend.title]].filter(Boolean).map(([k, v]) => (
              <div key={k} className="summary-item"><span>{k}</span><strong>{v}</strong></div>
            ))}
          </div>
          <p className="form-hint">BrandPulse will create 3 professionally designed post versions — Split Panel, Editorial Strip, and Minimal Overlay.</p>
          <div className="step-nav">
            <button className="btn btn-secondary" onClick={() => setStep(1)}>Back</button>
            <button className="btn btn-primary generate-btn" onClick={generatePosts} disabled={generating}>
              {generating ? <><span className="spinner" /> Creating your posts…</> : <><Sparkles size={16} /> Generate 3 Designs</>}
            </button>
          </div>
        </div>
      )}

      {/* STEP 3 — Choose */}
      {step === 3 && posts.length > 0 && (
        <div className="studio-step animate-slide-up">
          <div className="card form-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3>Your 3 Designs</h3>
                <p className="form-hint" style={{ marginTop: 4 }}>Click any text to edit it. Click a design to select it.</p>
              </div>
              {animated && (
                <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: 12 }} onClick={() => setPlaying(p => !p)}>
                  {playing ? <><Pause size={12} /> Pause</> : <><Play size={12} /> Play</>}
                </button>
              )}
            </div>
          </div>

          {/* Accent colour pickers */}
          <div className="card" style={{ display: 'flex', gap: 16, alignItems: 'center', padding: '12px 16px' }}>
            <span style={{ fontSize: 12, color: 'var(--text-mid)', fontFamily: 'Space Grotesk', fontWeight: 600 }}>Accent Colours</span>
            {accentColors.map((c, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 11, color: 'var(--text-lo)' }}>Design {i + 1}</span>
                <input type="color" value={c} onChange={e => {
                  const nc = [...accentColors]; nc[i] = e.target.value; setAccentColors(nc)
                  setTimeout(() => renderCanvas(i, 0), 100)
                }} style={{ width: 28, height: 28, border: 'none', borderRadius: 6, cursor: 'pointer', background: 'none', padding: 0 }} />
              </div>
            ))}
          </div>

          <div className="posts-grid">
            {posts.map((post, i) => (
              <div key={i} className={`post-result-card card ${chosen === i ? 'post-chosen' : ''}`} onClick={() => setChosen(i)}>
                <div className="post-template-label">
                  <span className="tag tag-violet">{TEMPLATES[i % TEMPLATES.length].label}</span>
                  {chosen === i && <span className="tag tag-electric">✓ Selected</span>}
                </div>

                <div className="canvas-wrap" style={{ width: fmt.pw, height: fmt.ph }}>
                  <canvas ref={el => { canvasRefs.current[i] = el; if (el && posts.length > 0) setTimeout(() => renderCanvas(i, 0), 50) }}
                    width={fmt.pw} height={fmt.ph} className="post-canvas" />
                </div>

                {/* Editable text fields */}
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
              <div>
                <h4>Want AI-generated backgrounds?</h4>
                <p>Upgrade to BrandPulse Pro to generate stunning AI images — no photographer needed.</p>
              </div>
            </div>
            <button className="btn btn-primary" style={{ flexShrink: 0 }}>Upgrade to Pro</button>
          </div>

          <div className="step-nav">
            <button className="btn btn-secondary" onClick={() => { setStep(0); setPosts([]); setChosen(null) }}>Start Over</button>
          </div>
        </div>
      )}

      {/* Edit modal */}
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
