import { useState } from 'react'
import { Brain, Globe, Sparkles, Check } from 'lucide-react'
import { callClaude } from '../lib/api.js'
import './Page.css'

const PLATFORMS = ['Instagram','TikTok','Facebook','LinkedIn','YouTube','Pinterest','X (Twitter)']
const TONES = ['Professional','Friendly','Bold','Inspirational','Playful','Educational','Luxurious']

export default function BrandBrain({ brand, onSave }) {
  const [form, setForm] = useState(brand ?? {name:'',industry:'',description:'',website:'',tone:'',platforms:[],keywords:''})
  const [scanning, setScanning] = useState(false)
  const [saved, setSaved] = useState(false)
  const [scanResult, setScanResult] = useState('')

  const set = (k,v) => setForm(f=>({...f,[k]:v}))
  const togglePlatform = (p) => set('platforms', form.platforms.includes(p) ? form.platforms.filter(x=>x!==p) : [...form.platforms,p])

  const scanWebsite = async () => {
    if (!form.website) return
    setScanning(true)
    try {
      const result = await callClaude({
        system: 'You are a brand analyst. Return JSON only: { "industry": "...", "description": "...", "tone": "...", "keywords": "..." }',
        messages: [{role:'user',content:`Analyse this brand website: ${form.website}`}],
        max_tokens: 512
      })
      const parsed = JSON.parse(result.replace(/```json|```/g,'').trim())
      setForm(f=>({...f,...parsed}))
      setScanResult('Brand scan complete!')
    } catch { setScanResult('Could not auto-scan — please fill in manually.') }
    setScanning(false)
  }

  const save = () => { onSave(form); setSaved(true); setTimeout(()=>setSaved(false),2000) }

  return (
    <div className="page">
      <div className="page-header">
        <Brain size={24} className="page-icon-violet" />
        <div><h2>Brand Brain</h2><p>Your brand identity and voice — the AI learns everything here.</p></div>
      </div>
      <div className="form-grid">
        <div className="form-col">
          <div className="card form-card">
            <h3>Brand Identity</h3>
            <div className="field"><label>Brand Name</label><input value={form.name} onChange={e=>set('name',e.target.value)} placeholder="e.g. SoulArt Ltd" /></div>
            <div className="field"><label>Industry</label><input value={form.industry} onChange={e=>set('industry',e.target.value)} placeholder="e.g. Wellness & Healing" /></div>
            <div className="field"><label>Brand Description</label><textarea rows={3} value={form.description} onChange={e=>set('description',e.target.value)} placeholder="What you do and who you serve..." /></div>
            <div className="field"><label>Key Keywords</label><input value={form.keywords} onChange={e=>set('keywords',e.target.value)} placeholder="e.g. healing, kinesiology, frequency" /></div>
          </div>
          <div className="card form-card">
            <h3>Website Auto-Scan</h3>
            <p className="form-hint">Enter your URL and let AI extract your brand profile.</p>
            <div className="scan-row">
              <input value={form.website} onChange={e=>set('website',e.target.value)} placeholder="https://yoursite.com" />
              <button className="btn btn-primary" onClick={scanWebsite} disabled={scanning||!form.website}>
                {scanning?<span className="spinner"/>:<><Sparkles size={14}/> Scan</>}
              </button>
            </div>
            {scanResult && <p className="scan-result">{scanResult}</p>}
          </div>
        </div>
        <div className="form-col">
          <div className="card form-card">
            <h3>Brand Voice</h3>
            <label>Tone</label>
            <div className="chip-grid">{TONES.map(t=><button key={t} className={`chip ${form.tone===t?'chip-active':''}`} onClick={()=>set('tone',t)}>{t}</button>)}</div>
          </div>
          <div className="card form-card">
            <h3>Target Platforms</h3>
            <div className="chip-grid">{PLATFORMS.map(p=><button key={p} className={`chip ${form.platforms.includes(p)?'chip-active':''}`} onClick={()=>togglePlatform(p)}>{p}</button>)}</div>
          </div>
          <button className="btn btn-primary save-btn" onClick={save}>
            {saved?<><Check size={16}/> Saved!</>:'Save Brand Brain'}
          </button>
        </div>
      </div>
    </div>
  )
}
