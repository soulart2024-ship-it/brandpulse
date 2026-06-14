import { useState, useRef, useEffect } from 'react'
import { Palette, Sparkles, Download, Send, Check, ChevronRight, Image, Play, Pause, Zap } from 'lucide-react'
import { callClaude } from '../lib/api.js'
import './Page.css'
import './PostStudio.css'

const PLATFORMS = ['Instagram', 'TikTok', 'LinkedIn', 'Facebook', 'X (Twitter)', 'Pinterest']
const FORMATS = [
  { id: 'square',  label: '1:1 Square',   w: 1080, h: 1080, preview: { w: 300, h: 300 } },
  { id: 'story',   label: '9:16 Story',   w: 1080, h: 1920, preview: { w: 169, h: 300 } },
  { id: 'landscape', label: '16:9 Banner', w: 1920, h: 1080, preview: { w: 300, h: 169 } },
]
const TEMPLATES = [
  { id: 'bold',    label: 'Bold',      textPos: 'bottom', overlay: 0.55, textColor: '#FFFFFF', accent: '#7C3AED' },
  { id: 'minimal', label: 'Minimal',   textPos: 'top',    overlay: 0.3,  textColor: '#FFFFFF', accent: '#06B6D4' },
  { id: 'split',   label: 'Split',     textPos: 'middle', overlay: 0.65, textColor: '#FFFFFF', accent: '#F472B6' },
]

const STEPS = ['Brief', 'Assets', 'Generate', 'Choose & Export']

export default function PostStudio({ brand, assets, selectedTrend, onNavigate }) {
  const [step, setStep] = useState(0)
  const [platform, setPlatform] = useState(selectedTrend?.platform ?? 'Instagram')
  const [format, setFormat] = useState(0)
  const [story, setStory] = useState('')
  const [extraText, setExtraText] = useState('')
  const [animated, setAnimated] = useState(false)
  const [chosenAssets, setChosenAssets] = useState([])
  const [generating, setGenerating] = useState(false)
  const [posts, setPosts] = useState([])
  const [chosen, setChosen] = useState(null)
  const [playing, setPlaying] = useState(true)
  const canvasRefs = useRef({})

  const fmt = FORMATS[format]

  const toggleAsset = (id) => {
    setChosenAssets(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const generatePosts = async () => {
    setGenerating(true)
    setPosts([])
    try {
      const trendCtx = selectedTrend
        ? `Trend: "${selectedTrend.title}". Hook: "${selectedTrend.hook}". Hashtags: ${selectedTrend.hashtags?.join(', ')}.`
        : ''
      const brandCtx = brand
        ? `Brand: ${brand.name}. Industry: ${brand.industry}. Tone: ${brand.tone}.`
        : ''

      const result = await callClaude({
        system: 'You are a social media copywriter. Return JSON only — no markdown: { "posts": [{ "headline": "max 8 words", "subtext": "max 15 words", "caption": "full caption with emojis", "hashtags": ["tag1","tag2","tag3","tag4","tag5"], "cta": "call to action text" }] } — generate exactly 3 post variations.',
        messages: [{
          role: 'user',
          content: `${brandCtx} ${trendCtx} Platform: ${platform}. Format: ${fmt.label}. Story/message: ${story || 'Use brand description'}. Extra info: ${extraText || 'none'}.`
        }],
        max_tokens: 1200
      })
      const clean = result.replace(/```json|```/g, '').trim()
      const parsed = JSON.parse(clean)
      setPosts(parsed.posts.map((p, i) => ({ ...p, template: i % TEMPLATES.length, id: i })))
      setStep(3)
    } catch (e) {
      console.error(e)
    }
    setGenerating(false)
  }

  // Draw canvas for each post
  const drawPost = (canvas, post, assetUrl, templateIdx, isAnimated, frame = 0) => {
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const { w, h } = fmt.preview
    const tmpl = TEMPLATES[templateIdx]

    ctx.clearRect(0, 0, w, h)

    if (assetUrl) {
      const img = new window.Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        // Draw image filling canvas
        const scale = Math.max(w / img.width, h / img.height)
        const iw = img.width * scale
        const ih = img.height * scale
        const ix = (w - iw) / 2
        const iy = (h - ih) / 2
        ctx.drawImage(img, ix, iy, iw, ih)

        // Animated shimmer
        if (isAnimated) {
          const shimmerX = ((frame % 100) / 100) * (w * 2) - w
          const grad = ctx.createLinearGradient(shimmerX, 0, shimmerX + w * 0.4, h)
          grad.addColorStop(0, 'rgba(255,255,255,0)')
          grad.addColorStop(0.5, 'rgba(255,255,255,0.08)')
          grad.addColorStop(1, 'rgba(255,255,255,0)')
          ctx.fillStyle = grad
          ctx.fillRect(0, 0, w, h)
        }

        drawOverlay(ctx, w, h, post, tmpl, isAnimated, frame)
      }
      img.src = assetUrl
    } else {
      // Gradient background if no asset
      const g = ctx.createLinearGradient(0, 0, w, h)
      g.addColorStop(0, '#0F0A1E')
      g.addColorStop(1, tmpl.accent)
      ctx.fillStyle = g
      ctx.fillRect(0, 0, w, h)
      drawOverlay(ctx, w, h, post, tmpl, isAnimated, frame)
    }
  }

  const drawOverlay = (ctx, w, h, post, tmpl, isAnimated, frame) => {
    // Overlay gradient
    const overlayY = tmpl.textPos === 'top' ? 0 : tmpl.textPos === 'middle' ? h * 0.25 : h * 0.4
    const grad = ctx.createLinearGradient(0, overlayY, 0, h)
    grad.addColorStop(0, `rgba(0,0,0,0)`)
    grad.addColorStop(1, `rgba(0,0,0,${tmpl.overlay})`)
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, w, h)

    // Accent bar
    const barY = tmpl.textPos === 'top' ? 0 : h - 4
    ctx.fillStyle = tmpl.accent
    const barW = isAnimated ? Math.min(w, (frame % 60) / 60 * w) : w
    ctx.fillRect(0, barY, barW, 4)

    // Text positioning
    const textY = tmpl.textPos === 'top' ? 40
      : tmpl.textPos === 'middle' ? h / 2 - 20
      : h - 80

    // Headline
    ctx.fillStyle = tmpl.textColor
    ctx.textAlign = 'center'
    const headSize = Math.max(14, Math.floor(w / 14))
    ctx.font = `700 ${headSize}px "Space Grotesk", sans-serif`
    wrapText(ctx, post.headline || '', w / 2, textY, w - 30, headSize + 6)

    // Subtext
    ctx.fillStyle = 'rgba(255,255,255,0.85)'
    const subSize = Math.max(10, Math.floor(w / 22))
    ctx.font = `400 ${subSize}px Inter, sans-serif`
    wrapText(ctx, post.subtext || '', w / 2, textY + headSize + 14, w - 40, subSize + 4)

    // CTA pill
    if (post.cta) {
      const ctaY = h - 20
      ctx.fillStyle = tmpl.accent
      ctx.beginPath()
      ctx.roundRect(w / 2 - 60, ctaY - 14, 120, 22, 11)
      ctx.fill()
      ctx.fillStyle = '#FFFFFF'
      ctx.font = `600 ${Math.max(8, Math.floor(w / 28))}px "Space Grotesk", sans-serif`
      ctx.fillText(post.cta, w / 2, ctaY)
    }

    // Brand watermark
    if (brand?.name) {
      ctx.fillStyle = 'rgba(255,255,255,0.45)'
      ctx.textAlign = 'right'
      ctx.font = `600 ${Math.max(7, Math.floor(w / 32))}px "Space Grotesk", sans-serif`
      ctx.fillText(brand.name, w - 8, h - 8)
    }
  }

  const wrapText = (ctx, text, x, y, maxW, lineH) => {
    const words = text.split(' ')
    let line = ''
    let currentY = y
    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' '
      const metrics = ctx.measureText(testLine)
      if (metrics.width > maxW && n > 0) {
        ctx.fillText(line.trim(), x, currentY)
        line = words[n] + ' '
        currentY += lineH
      } else {
        line = testLine
      }
    }
    ctx.fillText(line.trim(), x, currentY)
  }

  useEffect(() => {
    if (posts.length === 0) return
    const firstAsset = assets.find(a => chosenAssets.includes(a.id))
    posts.forEach((post, i) => {
      const canvas = canvasRefs.current[i]
      if (canvas) drawPost(canvas, post, firstAsset?.url, post.template, animated)
    })
  }, [posts, animated, chosenAssets])

  // Animation loop
  useEffect(() => {
    if (!animated || !playing || posts.length === 0) return
    let frame = 0
    const firstAsset = assets.find(a => chosenAssets.includes(a.id))
    const interval = setInterval(() => {
      frame++
      posts.forEach((post, i) => {
        const canvas = canvasRefs.current[i]
        if (canvas) drawPost(canvas, post, firstAsset?.url, post.template, true, frame)
      })
    }, 50)
    return () => clearInterval(interval)
  }, [animated, playing, posts, chosenAssets])

  const download = (idx) => {
    const canvas = canvasRefs.current[idx]
    if (!canvas) return
    const a = document.createElement('a')
    a.download = `brandpulse-post-${idx + 1}.png`
    a.href = canvas.toDataURL('image/png')
    a.click()
  }

  const openBuffer = () => {
    window.open('https://buffer.com', '_blank')
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

      {/* Step indicator */}
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
                  {PLATFORMS.map(p => (
                    <button key={p} className={`chip ${platform === p ? 'chip-active' : ''}`}
                      onClick={() => setPlatform(p)}>{p}</button>
                  ))}
                </div>
              </div>
              <div className="field">
                <label>Format</label>
                <div className="chip-grid">
                  {FORMATS.map((f, i) => (
                    <button key={f.id} className={`chip ${format === i ? 'chip-active' : ''}`}
                      onClick={() => setFormat(i)}>{f.label}</button>
                  ))}
                </div>
              </div>
              <div className="field">
                <label>Static or Animated?</label>
                <div className="toggle-row">
                  <button className={`toggle-opt ${!animated ? 'active' : ''}`} onClick={() => setAnimated(false)}>
                    <Image size={14} /> Static
                  </button>
                  <button className={`toggle-opt ${animated ? 'active' : ''}`} onClick={() => setAnimated(true)}>
                    <Play size={14} /> Animated
                  </button>
                </div>
              </div>
            </div>
            <div className="form-col">
              <div className="field">
                <label>What's the story? (your message in your own words)</label>
                <textarea rows={4} value={story} onChange={e => setStory(e.target.value)}
                  placeholder="e.g. We just launched our new Harmonic Blink app — it helps people recalibrate their nervous system in 7 steps. I want to share the excitement and drive downloads..." />
              </div>
              <div className="field">
                <label>Anything else to include? (offer, price, date, link)</label>
                <input value={extraText} onChange={e => setExtraText(e.target.value)}
                  placeholder="e.g. 50% off this week only, link in bio" />
              </div>
            </div>
          </div>
          <button className="btn btn-primary next-btn" onClick={() => setStep(1)}>
            Next — Choose Assets <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* STEP 1 — Asset Selection */}
      {step === 1 && (
        <div className="studio-step animate-slide-up">
          <div className="card form-card">
            <h3>Choose Your Assets</h3>
            <p className="form-hint">Select the photos you want to use in this post. You can select multiple.</p>
          </div>

          {assets.length === 0 ? (
            <div className="card empty-state">
              <Image size={32} className="empty-icon" />
              <p>No assets uploaded yet.</p>
              <button className="btn btn-secondary" onClick={() => onNavigate('assets')}>
                Go to Asset Library
              </button>
            </div>
          ) : (
            <div className="asset-picker-grid">
              {assets.map(a => (
                <div key={a.id}
                  className={`asset-picker-item ${chosenAssets.includes(a.id) ? 'selected' : ''}`}
                  onClick={() => toggleAsset(a.id)}>
                  <img src={a.url} alt={a.name} className="picker-thumb" />
                  {chosenAssets.includes(a.id) && (
                    <div className="picker-check"><Check size={16} /></div>
                  )}
                  <div className="picker-tags">
                    {a.tags?.slice(0, 2).map(t => <span key={t} className="picker-tag">{t}</span>)}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="step-nav">
            <button className="btn btn-secondary" onClick={() => setStep(0)}>Back</button>
            <button className="btn btn-primary" onClick={() => setStep(2)}>
              Next — Generate Posts <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2 — Generate */}
      {step === 2 && (
        <div className="studio-step card form-card animate-slide-up">
          <h3>Ready to Generate</h3>
          <div className="generate-summary">
            <div className="summary-item"><span>Platform</span><strong>{platform}</strong></div>
            <div className="summary-item"><span>Format</span><strong>{fmt.label}</strong></div>
            <div className="summary-item"><span>Type</span><strong>{animated ? 'Animated' : 'Static'}</strong></div>
            <div className="summary-item"><span>Assets</span><strong>{chosenAssets.length} selected</strong></div>
            {selectedTrend && <div className="summary-item"><span>Trend</span><strong>{selectedTrend.title}</strong></div>}
          </div>
          <p className="form-hint" style={{marginTop:0}}>BrandPulse will create 3 different post versions using your brand voice, story, and chosen assets.</p>
          <div className="step-nav">
            <button className="btn btn-secondary" onClick={() => setStep(1)}>Back</button>
            <button className="btn btn-primary generate-btn" onClick={generatePosts} disabled={generating}>
              {generating
                ? <><span className="spinner" /> Creating your posts…</>
                : <><Sparkles size={16} /> Generate 3 Post Versions</>}
            </button>
          </div>
        </div>
      )}

      {/* STEP 3 — Choose & Export */}
      {step === 3 && posts.length > 0 && (
        <div className="studio-step animate-slide-up">
          <div className="card form-card">
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
              <h3>Choose Your Post</h3>
              {animated && (
                <button className="btn btn-secondary" style={{padding:'6px 12px', fontSize:12}}
                  onClick={() => setPlaying(p => !p)}>
                  {playing ? <><Pause size={12} /> Pause</> : <><Play size={12} /> Play</>}
                </button>
              )}
            </div>
            <p className="form-hint">Click a post to select it, then download or send to Buffer.</p>
          </div>

          <div className="posts-grid">
            {posts.map((post, i) => (
              <div key={i} className={`post-result-card card ${chosen === i ? 'post-chosen' : ''}`}
                onClick={() => setChosen(i)}>
                <div className="post-template-label">
                  <span className="tag tag-violet">{TEMPLATES[post.template].label}</span>
                  {chosen === i && <span className="tag tag-electric">✓ Selected</span>}
                </div>
                <div className="canvas-wrap" style={{width: fmt.preview.w, height: fmt.preview.h}}>
                  <canvas
                    ref={el => canvasRefs.current[i] = el}
                    width={fmt.preview.w}
                    height={fmt.preview.h}
                    className="post-canvas"
                  />
                </div>
                <div className="post-copy">
                  <p className="post-caption-preview">{post.caption}</p>
                  <div className="post-hashtags">
                    {post.hashtags?.map(h => <span key={h} className="tag tag-violet">{h.startsWith('#') ? h : '#'+h}</span>)}
                  </div>
                </div>
                <div className="post-actions">
                  <button className="btn btn-secondary" onClick={e => { e.stopPropagation(); download(i) }}>
                    <Download size={14} /> Download
                  </button>
                  <button className="btn btn-primary" onClick={e => { e.stopPropagation(); openBuffer() }}>
                    <Send size={14} /> Send to Buffer
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="ai-upsell card">
            <div className="upsell-content">
              <Zap size={20} style={{color:'var(--gold)', flexShrink:0}} />
              <div>
                <h4>Want AI-generated visuals?</h4>
                <p>Upgrade to BrandPulse Pro to generate stunning AI images using your brand style — no photographer needed.</p>
              </div>
            </div>
            <button className="btn btn-primary" style={{flexShrink:0}}>
              Upgrade to Pro
            </button>
          </div>

          <div className="step-nav">
            <button className="btn btn-secondary" onClick={() => { setStep(0); setPosts([]); setChosen(null) }}>
              Start Over
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
