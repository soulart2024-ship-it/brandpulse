import { useState } from 'react'
import { BookOpen, Plus, Trash2, Sparkles } from 'lucide-react'
import { callClaude } from '../lib/api.js'
import './Page.css'
import './Storyboard.css'

const EMPTY_FRAME = (id) => ({ id, scene: '', visual: '', copy: '', duration: '3s' })

export default function Storyboard({ brand }) {
  const [frames, setFrames] = useState([EMPTY_FRAME(1), EMPTY_FRAME(2), EMPTY_FRAME(3)])
  const [title, setTitle] = useState('')
  const [loading, setLoading] = useState(false)

  const addFrame = () => setFrames(f => [...f, EMPTY_FRAME(Date.now())])
  const removeFrame = (id) => setFrames(f => f.filter(fr => fr.id !== id))
  const update = (id, key, val) => setFrames(f => f.map(fr => fr.id === id ? { ...fr, [key]: val } : fr))

  const aiGenerate = async () => {
    if (!title) return
    setLoading(true)
    try {
      const result = await callClaude({
        system: 'You are a social video director. Return JSON only: { "frames": [{ "scene": "...", "visual": "...", "copy": "...", "duration": "3s" }] } — 4 frames for a 15-second social video.',
        messages: [{ role: 'user', content: `Create a storyboard for: "${title}". Brand: ${brand?.name ?? 'generic brand'}. Tone: ${brand?.tone ?? 'engaging'}.` }],
        max_tokens: 800
      })
      const clean = result.replace(/```json|```/g, '').trim()
      const parsed = JSON.parse(clean)
      setFrames(parsed.frames.map((f, i) => ({ ...f, id: i + 1 })))
    } catch { /* silent */ }
    setLoading(false)
  }

  return (
    <div className="page">
      <div className="page-header">
        <BookOpen size={24} className="page-icon-gold" />
        <div>
          <h2>Storyboard Builder</h2>
          <p>Plan your video content frame by frame — or let AI generate the whole board.</p>
        </div>
      </div>

      <div className="card form-card">
        <h3>Video Concept</h3>
        <div className="scan-row">
          <input value={title} onChange={e => setTitle(e.target.value)}
            placeholder="e.g. Launching Harmonic Blink — 15s Reel" />
          <button className="btn btn-primary" onClick={aiGenerate} disabled={loading || !title}>
            {loading ? <span className="spinner" /> : <><Sparkles size={14} /> AI Generate</>}
          </button>
        </div>
      </div>

      <div className="storyboard-grid">
        {frames.map((fr, i) => (
          <div key={fr.id} className="card frame-card">
            <div className="frame-header">
              <span className="frame-num">Frame {i + 1}</span>
              <div style={{display:'flex', gap:6, alignItems:'center'}}>
                <select className="dur-select" value={fr.duration} onChange={e => update(fr.id, 'duration', e.target.value)}>
                  {['2s','3s','4s','5s','6s','8s'].map(d => <option key={d}>{d}</option>)}
                </select>
                {frames.length > 1 && (
                  <button className="btn-ghost" onClick={() => removeFrame(fr.id)} style={{padding:'4px 6px'}}>
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            </div>
            <div className="frame-visual">{fr.visual || 'Visual description'}</div>
            <div className="field">
              <label>Scene / Action</label>
              <input value={fr.scene} onChange={e => update(fr.id, 'scene', e.target.value)} placeholder="What's happening on screen..." />
            </div>
            <div className="field">
              <label>Visual</label>
              <input value={fr.visual} onChange={e => update(fr.id, 'visual', e.target.value)} placeholder="Shot type, setting, mood..." />
            </div>
            <div className="field">
              <label>On-screen Copy / VO</label>
              <textarea rows={2} value={fr.copy} onChange={e => update(fr.id, 'copy', e.target.value)} placeholder="Text overlay or voiceover..." />
            </div>
          </div>
        ))}

        <button className="frame-add-btn" onClick={addFrame}>
          <Plus size={20} />
          <span>Add Frame</span>
        </button>
      </div>
    </div>
  )
}
