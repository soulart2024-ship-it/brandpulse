import { useState, useEffect, useRef } from 'react'
import { Film, Play, Pause, Download } from 'lucide-react'
import './Page.css'
import './MotionCards.css'

const TEMPLATES = [
  { id: 'slide-up',  label: 'Slide Up',   color: ['#7C3AED', '#C4B5FD'] },
  { id: 'pulse',     label: 'Pulse Glow', color: ['#0F0A1E', '#06B6D4'] },
  { id: 'diagonal',  label: 'Diagonal',   color: ['#F472B6', '#FBBF24'] },
]
const RATIOS = [
  { label: '9:16 Story', w: 200, h: 356, css: 'ratio-story' },
  { label: '1:1 Square', w: 300, h: 300, css: 'ratio-square' },
]

export default function MotionCards({ brand }) {
  const [template, setTemplate] = useState(0)
  const [ratio, setRatio] = useState(0)
  const [headline, setHeadline] = useState(brand?.name ?? 'Your Brand')
  const [sub, setSub] = useState('Drop a message that moves people.')
  const [playing, setPlaying] = useState(true)

  const r = RATIOS[ratio]
  const t = TEMPLATES[template]

  return (
    <div className="page">
      <div className="page-header">
        <Film size={24} className="page-icon-electric" />
        <div>
          <h2>Motion Cards</h2>
          <p>Animated social content previews in 9:16 Story and 1:1 Square formats.</p>
        </div>
      </div>

      <div className="motion-layout">
        <div className="card form-card">
          <h3>Format</h3>
          <div className="chip-grid">
            {RATIOS.map((rv, i) => (
              <button key={rv.label} className={`chip ${ratio === i ? 'chip-active' : ''}`} onClick={() => setRatio(i)}>{rv.label}</button>
            ))}
          </div>
          <h3>Animation Style</h3>
          <div className="chip-grid">
            {TEMPLATES.map((tp, i) => (
              <button key={tp.id} className={`chip ${template === i ? 'chip-active' : ''}`} onClick={() => setTemplate(i)}>{tp.label}</button>
            ))}
          </div>
          <div className="field">
            <label>Headline</label>
            <input value={headline} onChange={e => setHeadline(e.target.value)} />
          </div>
          <div className="field">
            <label>Subtext</label>
            <input value={sub} onChange={e => setSub(e.target.value)} />
          </div>
          <button className="btn btn-secondary" onClick={() => setPlaying(p => !p)}>
            {playing ? <><Pause size={14} /> Pause</> : <><Play size={14} /> Play</>}
          </button>
        </div>

        <div className="motion-stage">
          <div
            className={`motion-card ${r.css} anim-${t.id} ${playing ? 'playing' : ''}`}
            style={{ '--c1': t.color[0], '--c2': t.color[1], width: r.w, height: r.h }}
          >
            <div className="mc-bg" />
            <div className="mc-content">
              <div className={`mc-headline ${playing ? 'anim-text' : ''}`}>{headline}</div>
              <div className={`mc-sub ${playing ? 'anim-sub' : ''}`}>{sub}</div>
            </div>
            {brand?.name && <div className="mc-watermark">{brand.name}</div>}
          </div>
          <p className="preview-note">{r.label} preview · {r.w}×{r.h}px</p>
        </div>
      </div>
    </div>
  )
}
