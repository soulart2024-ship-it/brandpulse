import { useState, useRef, useEffect } from 'react'
import { Palette, Download, Sparkles } from 'lucide-react'
import { callClaude } from '../lib/api.js'
import './Page.css'
import './ImageStudio.css'

const GRADIENTS = [
  { name: 'Violet Dream', stops: ['#7C3AED', '#C4B5FD'] },
  { name: 'Ocean Pulse', stops: ['#0F172A', '#06B6D4'] },
  { name: 'Rose Gold',   stops: ['#F472B6', '#FBBF24'] },
  { name: 'Forest Deep', stops: ['#064E3B', '#10B981'] },
  { name: 'Midnight',    stops: ['#0F0A1E', '#7C3AED'] },
  { name: 'Coral',       stops: ['#EF4444', '#F97316'] },
]

const RATIOS = [
  { label: '9:16 Story',   w: 270, h: 480 },
  { label: '1:1 Square',   w: 380, h: 380 },
  { label: '16:9 Banner',  w: 480, h: 270 },
]

export default function ImageStudio({ brand }) {
  const [gradient, setGradient] = useState(0)
  const [ratio, setRatio] = useState(0)
  const [headline, setHeadline] = useState('')
  const [subtext, setSubtext] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const canvasRef = useRef()

  const { w, h } = RATIOS[ratio]

  const drawCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const gr = GRADIENTS[gradient]
    const g = ctx.createLinearGradient(0, 0, w, h)
    g.addColorStop(0, gr.stops[0])
    g.addColorStop(1, gr.stops[1])
    ctx.fillStyle = g
    ctx.fillRect(0, 0, w, h)

    // Overlay pattern
    ctx.fillStyle = 'rgba(255,255,255,0.03)'
    for (let i = 0; i < 5; i++) {
      ctx.beginPath()
      ctx.arc(w * Math.random(), h * Math.random(), 40 + Math.random() * 80, 0, Math.PI * 2)
      ctx.fill()
    }

    // Text
    if (headline) {
      ctx.fillStyle = '#FFFFFF'
      ctx.textAlign = 'center'
      const fontSize = Math.max(16, Math.floor(w / 12))
      ctx.font = `700 ${fontSize}px "Space Grotesk", sans-serif`
      ctx.fillText(headline, w / 2, h * 0.45)
    }
    if (subtext) {
      ctx.fillStyle = 'rgba(255,255,255,0.75)'
      ctx.textAlign = 'center'
      const fontSize2 = Math.max(11, Math.floor(w / 20))
      ctx.font = `400 ${fontSize2}px Inter, sans-serif`
      ctx.fillText(subtext, w / 2, h * 0.57)
    }

    // Watermark brand name
    if (brand?.name) {
      ctx.fillStyle = 'rgba(255,255,255,0.4)'
      ctx.textAlign = 'right'
      ctx.font = `600 ${Math.floor(w / 28)}px "Space Grotesk", sans-serif`
      ctx.fillText(brand.name, w - 12, h - 12)
    }
  }

  useEffect(() => { drawCanvas() })

  const download = () => {
    const a = document.createElement('a')
    a.download = `brandpulse-${Date.now()}.png`
    a.href = canvasRef.current.toDataURL()
    a.click()
  }

  const aiSuggest = async () => {
    setAiLoading(true)
    try {
      const result = await callClaude({
        system: 'You are a graphic designer. Return JSON only: { "headline": "...", "subtext": "..." } — short punchy headline max 6 words, subtext max 10 words.',
        messages: [{ role: 'user', content: `Suggest headline and subtext for a ${brand?.industry ?? 'wellness'} brand social image. Brand tone: ${brand?.tone ?? 'inspirational'}. Brand: ${brand?.name ?? 'BrandPulse'}.` }]
      })
      const clean = result.replace(/```json|```/g, '').trim()
      const parsed = JSON.parse(clean)
      setHeadline(parsed.headline ?? '')
      setSubtext(parsed.subtext ?? '')
    } catch { /* silent fail */ }
    setAiLoading(false)
  }

  return (
    <div className="page">
      <div className="page-header">
        <Palette size={24} className="page-icon-violet" />
        <div>
          <h2>AI Image Studio</h2>
          <p>Generate branded graphics with gradient backgrounds and automatic logo watermarking.</p>
        </div>
      </div>

      <div className="studio-layout">
        <div className="studio-controls card form-card">
          <h3>Canvas Size</h3>
          <div className="chip-grid">
            {RATIOS.map((r, i) => (
              <button key={r.label} className={`chip ${ratio === i ? 'chip-active' : ''}`} onClick={() => setRatio(i)}>{r.label}</button>
            ))}
          </div>
          <h3>Background</h3>
          <div className="gradient-grid">
            {GRADIENTS.map((gr, i) => (
              <button key={gr.name}
                className={`gradient-swatch ${gradient === i ? 'swatch-active' : ''}`}
                style={{ background: `linear-gradient(135deg, ${gr.stops[0]}, ${gr.stops[1]})` }}
                onClick={() => setGradient(i)}
                title={gr.name}
              />
            ))}
          </div>
          <div className="field">
            <label>Headline</label>
            <input value={headline} onChange={e => setHeadline(e.target.value)} placeholder="Your headline text" />
          </div>
          <div className="field">
            <label>Subtext</label>
            <input value={subtext} onChange={e => setSubtext(e.target.value)} placeholder="Supporting text" />
          </div>
          <button className="btn btn-secondary" onClick={aiSuggest} disabled={aiLoading}>
            {aiLoading ? <span className="spinner" /> : <><Sparkles size={14} /> AI Suggest Text</>}
          </button>
          <button className="btn btn-primary" onClick={download}>
            <Download size={14} /> Download PNG
          </button>
        </div>

        <div className="studio-preview">
          <canvas ref={canvasRef} width={w} height={h} className="studio-canvas" />
          {brand?.name && <p className="preview-note">✓ Watermarked with "{brand.name}"</p>}
        </div>
      </div>
    </div>
  )
}
