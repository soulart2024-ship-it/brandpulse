import { useState, useRef } from 'react'
import { Brain, Globe, Save, Upload, X, Palette } from 'lucide-react'
import { callClaude, extractJSON } from '../lib/api.js'
import './Page.css'

const TONES = ['Professional','Friendly','Bold','Playful','Luxurious','Minimal','Wellness','Educational']
const INDUSTRIES = ['Health & Wellness','Beauty & Skincare','Food & Drink','Fitness','Fashion','Technology','Retail','Professional Services','Other']

export default function BrandBrain({ brand, onBrandUpdate, onNavigate }) {
  const [scraping, setScraping] = useState(false)
  const [saved, setSaved] = useState(false)
  const [websiteUrl, setWebsiteUrl] = useState(brand?.website ?? '')
  const logoRef = useRef()

  const handleScrape = async () => {
    if (!websiteUrl) return
    setScraping(true)
    try {
      const result = await callClaude({
        system: 'Visit this website and extract brand information. Return JSON only: {"name":"brand name","industry":"industry type","description":"2-3 sentence brand description","tone":"one of: Professional/Friendly/Bold/Playful/Luxurious/Minimal/Wellness/Educational","colors":["#hex1","#hex2"],"tagline":"brand tagline if visible"}',
        messages: [{ role:'user', content:`Extract brand information from this website: ${websiteUrl}` }],
        tools: [{ type:'web_search_20250305', name:'web_search' }],
        max_tokens: 600
      })
      const parsed = extractJSON(result)
      onBrandUpdate({ ...parsed, website: websiteUrl })
      setWebsiteUrl(websiteUrl)
    } catch(e) { console.error(e) }
    setScraping(false)
  }

  const handleLogoUpload = (file) => {
    if (!file) return
    // Convert to base64 so it persists in localStorage
    const reader = new FileReader()
    reader.onload = (e) => onBrandUpdate({ logo: e.target.result })
    reader.readAsDataURL(file)
  }

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="page">
      <div className="page-header">
        <Brain size={24} className="page-icon-violet" />
        <div><h2>Brand Brain</h2><p>Your brand identity — feeds into every post automatically.</p></div>
      </div>

      {/* Website scraper */}
      <div className="card form-card">
        <h3><Globe size={15}/> Auto-fill from website</h3>
        <p className="form-hint">Paste your website URL and we'll extract brand name, industry, tone and description automatically.</p>
        <div className="scan-row">
          <input value={websiteUrl} onChange={e=>setWebsiteUrl(e.target.value)}
            placeholder="https://heatherandroseh.co.uk"
            onKeyDown={e=>e.key==='Enter'&&handleScrape()}/>
          <button className="btn btn-primary" onClick={handleScrape} disabled={scraping||!websiteUrl}>
            {scraping?<span className="spinner"/>:<><Globe size={14}/> Read Site</>}
          </button>
        </div>
      </div>

      {/* Brand details */}
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
            placeholder="Describe your brand in 2-3 sentences — what you do, who you serve, what makes you different."/>
        </div>
        <div className="field">
          <label>Tagline</label>
          <input value={brand?.tagline??''} onChange={e=>onBrandUpdate({tagline:e.target.value})} placeholder="Your brand tagline"/>
        </div>
      </div>

      {/* Logo */}
      <div className="card form-card">
        <h3><Palette size={15}/> Brand Logo</h3>
        <p className="form-hint">Upload your logo once — it appears in the Post Studio logo overlay automatically.</p>
        <div style={{display:'flex',alignItems:'center',gap:16,flexWrap:'wrap'}}>
          {brand?.logo && (
            <div style={{position:'relative'}}>
              <img src={brand.logo} alt="Logo" style={{height:64,objectFit:'contain',borderRadius:8,border:'1px solid var(--border)',background:'rgba(255,255,255,0.05)',padding:8}}/>
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
        {brand?.logo && <p style={{fontSize:11,color:'var(--success)',marginTop:4}}>✓ Logo saved — auto-appears in Post Studio</p>}
      </div>

      {/* Brand colors */}
      {brand?.colors?.length > 0 && (
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
        <button className="btn btn-primary" onClick={handleSave} style={{padding:'10px 24px'}}>
          {saved?'✓ Saved!':'Save Brand'}
        </button>
      </div>
    </div>
  )
}
