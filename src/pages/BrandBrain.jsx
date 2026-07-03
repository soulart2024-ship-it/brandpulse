import { useState, useRef } from 'react'
import { Brain, Globe, Save, Upload, X, Palette, Check } from 'lucide-react'
import { callClaude, extractJSON } from '../lib/api.js'
import './Page.css'

const TONES = ['Professional','Friendly','Bold','Playful','Luxurious','Minimal','Wellness','Educational']
const INDUSTRIES = ['Health & Wellness','Beauty & Skincare','Food & Drink','Fitness','Fashion','Technology','Retail','Professional Services','Other']

function resizeLogo(file) {
  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const scale = Math.min(1, 200 / Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/png'))
    }
    img.onerror = () => {
      const reader = new FileReader()
      reader.onload = e => resolve(e.target.result)
      reader.readAsDataURL(file)
    }
    img.src = url
  })
}

export default function BrandBrain({ brand, onBrandUpdate }) {
  const [scraping, setScraping] = useState(false)
  const [scrapeError, setScrapeError] = useState('')
  const [saved, setSaved] = useState(false)
  const [websiteUrl, setWebsiteUrl] = useState(brand?.website ?? '')
  const logoRef = useRef()

  const handleScrape = async () => {
    if (!websiteUrl) return
    setScraping(true); setScrapeError('')
    try {
      const scrapeRes = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: websiteUrl })
      })
      const scrapeData = await scrapeRes.json()
      const pageContent = scrapeData.text || ''

      const result = await callClaude({
        system: 'Extract brand information and return JSON only, no markdown: {"name":"brand name","industry":"exact match one of: Health & Wellness, Beauty & Skincare, Food & Drink, Fitness, Fashion, Technology, Retail, Professional Services, Other","description":"2-3 sentence brand description","tone":"exact match one of: Professional, Friendly, Bold, Playful, Luxurious, Minimal, Wellness, Educational","colors":["#hex1","#hex2","#hex3"],"tagline":"brand tagline if visible"}',
        messages: [{ role: 'user', content: `Website: ${websiteUrl}\n\nPage content:\n${pageContent}` }],
        max_tokens: 700
      })

      const parsed = extractJSON(result)
      if (parsed?.name) {
        onBrandUpdate({ ...parsed, website: websiteUrl })
      } else {
        setScrapeError('Could not extract brand info — fill in manually below.')
      }
    } catch(e) {
      setScrapeError('Could not read site — fill in manually below.')
    }
    setScraping(false)
  }

  const handleLogoUpload = async (file) => {
    if (!file) return
    const resized = await resizeLogo(file)
    onBrandUpdate({ logo: resized })
  }

  return (
    <div className="page">
      <div className="page-header">
        <Brain size={24} className="page-icon-violet" />
        <div><h2>Brand Brain</h2><p>Your brand identity — feeds into every post automatically.</p></div>
      </div>

      <div className="card form-card">
        <h3 style={{display:'flex',alignItems:'center',gap:8}}><Globe size={15}/> Auto-fill from website</h3>
        <p className="form-hint">Paste your website URL — BrandPulse reads the real page and extracts your brand details automatically.</p>
        <div className="scan-row">
          <input value={websiteUrl} onChange={e=>setWebsiteUrl(e.target.value)}
            placeholder="https://heatherandroseh.co.uk"
            onKeyDown={e=>e.key==='Enter'&&handleScrape()}/>
          <button className="btn btn-primary" onClick={handleScrape} disabled={scraping||!websiteUrl}>
            {scraping?<><span className="spinner"/> Reading…</>:<><Globe size={14}/> Read Site</>}
          </button>
        </div>
        {scrapeError&&<p style={{fontSize:12,color:'var(--danger)',marginTop:6}}>{scrapeError}</p>}
      </div>

      <div className="card form-card">
        <h3>Brand Details</h3>
        <div className="field">
          <label>Brand Name</label>
          <input value={brand?.name??''} onChange={e=>onBrandUpdate({name:e.target.value})} placeholder="e.g. Heather & Rose Health"/>
        </div>
        <div className="field">
          <label>Industry</label>
          <div className="chip-grid">
            {INDUSTRIES.map(i=><button key={i} className={`chip ${brand?.industry===i?'chip-active':''}`} onClick={()=>onBrandUpdate({industry:i})}>{i}</button>)}
          </div>
        </div>
        <div className="field">
          <label>Brand Tone</label>
          <div className="chip-grid">
            {TONES.map(t=><button key={t} className={`chip ${brand?.tone===t?'chip-active':''}`} onClick={()=>onBrandUpdate({tone:t})}>{t}</button>)}
          </div>
        </div>
        <div className="field">
          <label>Brand Description</label>
          <textarea rows={3} value={brand?.description??''} onChange={e=>onBrandUpdate({description:e.target.value})}
            placeholder="Describe your brand in 2-3 sentences."/>
        </div>
        <div className="field">
          <label>Tagline</label>
          <input value={brand?.tagline??''} onChange={e=>onBrandUpdate({tagline:e.target.value})} placeholder="Your brand tagline"/>
        </div>
      </div>

      <div className="card form-card">
        <h3 style={{display:'flex',alignItems:'center',gap:8}}><Palette size={15}/> Brand Logo</h3>
        <p className="form-hint">Upload once — auto-appears in Post Studio logo overlay. PNG with transparent background works best.</p>
        <div style={{display:'flex',alignItems:'center',gap:16,flexWrap:'wrap'}}>
          {brand?.logo&&(
            <div style={{position:'relative'}}>
              <div style={{width:80,height:80,borderRadius:8,border:'1px solid var(--border)',background:'repeating-conic-gradient(#2a2040 0% 25%,#1a1030 0% 50%) 0 0/16px 16px',display:'flex',alignItems:'center',justifyContent:'center',padding:6}}>
                <img src={brand.logo} alt="Logo" style={{maxWidth:'100%',maxHeight:'100%',objectFit:'contain'}} onError={e=>e.target.style.display='none'}/>
              </div>
              <button onClick={()=>onBrandUpdate({logo:null})} style={{position:'absolute',top:-8,right:-8,background:'var(--danger)',border:'none',borderRadius:'50%',width:20,height:20,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'white'}}>
                <X size={10}/>
              </button>
            </div>
          )}
          <button className="btn btn-secondary" onClick={()=>logoRef.current.click()}>
            <Upload size={14}/> {brand?.logo?'Change Logo':'Upload Logo'}
          </button>
          <input ref={logoRef} type="file" accept="image/*" style={{display:'none'}} onChange={e=>handleLogoUpload(e.target.files[0])}/>
        </div>
        {brand?.logo&&<p style={{fontSize:11,color:'var(--success)',marginTop:6}}>✓ Logo saved — auto-appears in Post Studio</p>}
      </div>

      {brand?.colors?.length>0&&(
        <div className="card form-card">
          <h3>Brand Colours</h3>
          <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
            {brand.colors.map((c,i)=>(
              <div key={i} style={{display:'flex',alignItems:'center',gap:6}}>
                <div style={{width:32,height:32,borderRadius:6,background:c,border:'1px solid var(--border)'}}/>
                <span style={{fontSize:11,color:'var(--text-lo)',fontFamily:'monospace'}}>{c}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{display:'flex',justifyContent:'flex-end'}}>
        <button className="btn btn-primary" onClick={()=>{setSaved(true);setTimeout(()=>setSaved(false),2000)}} style={{padding:'10px 24px'}}>
          {saved?<><Check size={14}/> Saved!</>:<><Save size={14}/> Save Brand</>}
        </button>
      </div>
    </div>
  )
}
