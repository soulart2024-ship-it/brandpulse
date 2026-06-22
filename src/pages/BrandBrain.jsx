import { useState } from 'react'
import { Brain, Globe, Sparkles, Check, AlertTriangle } from 'lucide-react'
import { callClaude } from '../lib/api.js'
import './Page.css'

const PLATFORMS = ['Instagram','TikTok','Facebook','LinkedIn','YouTube','Pinterest','X (Twitter)']
const TONES = ['Professional','Friendly','Bold','Inspirational','Playful','Educational','Luxurious']

export default function BrandBrain({ brand, onSave }) {
  const [form, setForm] = useState(brand ?? {name:'',industry:'',description:'',website:'',tone:'',platforms:[],keywords:''})
  const [scanning, setScanning] = useState(false)
  const [saved, setSaved] = useState(false)
  const [scanResult, setScanResult] = useState('')
  const [scanError, setScanError] = useState(false)

  const set = (k,v) => setForm(f=>({...f,[k]:v}))
  const togglePlatform = (p) => set('platforms', form.platforms.includes(p) ? form.platforms.filter(x=>x!==p) : [...form.platforms,p])

  const scanWebsite = async () => {
    if (!form.website) return
    setScanning(true)
    setScanResult('')
    setScanError(false)
    try {
      // Step 1 — actually fetch the real webpage content
      const scrapeRes = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: form.website })
      })
      const scrapeData = await scrapeRes.json()

      if (!scrapeRes.ok || scrapeData.error) {
        throw new Error(scrapeData.error || 'Could not fetch site')
      }

      if (!scrapeData.text || scrapeData.text.length < 40) {
        setScanResult('Could not read enough content from this site — please fill in manually.')
        setScanError(true)
        setScanning(false)
        return
      }

      // Step 2 — pass the REAL scraped content to Claude for extraction
      const result = await callClaude({
        system: 'You are a brand analyst. You will be given REAL text scraped directly from a business website. Extract accurate brand information based ONLY on what is actually stated in this content — never guess or invent. Return JSON only with these exact keys: { "industry": "the actual industry based on the content", "description": "2 sentences describing what this business actually does and who it serves, based on the real content provided", "tone": "one of: Professional, Friendly, Bold, Inspirational, Playful, Educational, Luxurious", "keywords": "5-8 comma separated keywords that actually appear in or relate to this content" }',
        messages: [{
          role: 'user',
          content: `Page title: ${scrapeData.title || 'none'}\nMeta description: ${scrapeData.description || 'none'}\n\nReal page content:\n${scrapeData.text}\n\nExtract accurate brand information based on this real content.`
        }],
        max_tokens: 512
      })
      const clean = result.replace(/```json|```/g,'').trim()
      const parsed = JSON.parse(clean)
      setForm(f=>({...f,...parsed}))
      setScanResult('Brand scan complete — pulled from your real website content. Please review!')
    } catch (err) {
      setScanResult('Could not auto-scan this site — please fill in manually.')
      setScanError(true)
    }
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
            <h3 style={{display:'flex',alignItems:'center',gap:8}}><Globe size={16} /> Website Auto-Scan</h3>
            <p className="form-hint">Enter your URL — BrandPulse will actually read your real page content.</p>
            <div className="scan-row">
              <input value={form.website} onChange={e=>set('website',e.target.value)} placeholder="https://yoursite.com" />
              <button className="btn btn-primary" onClick={scanWebsite} disabled={scanning||!form.website}>
                {scanning?<span className="spinner"/>:<><Sparkles size={14}/> Scan</>}
              </button>
            </div>
            {scanResult && (
              <p className={scanError ? 'scan-error' : 'scan-result'}>
                {scanError && <AlertTriangle size={12} style={{display:'inline',marginRight:4}} />}
                {scanResult}
              </p>
            )}
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
