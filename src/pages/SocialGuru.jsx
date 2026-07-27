import { useState } from 'react'
import { MessagesSquare, Search, Link, X, Copy, Check, Sparkles, RefreshCw } from 'lucide-react'
import { callClaude, extractJSON } from '../lib/api.js'
import './Page.css'
import './SocialGuru.css'

const PLATFORMS = [
  { id:'Instagram',   note:'Keyword-rich caption in the first 125 characters. 5-8 relevant hashtags at the end of the caption (not first comment).' },
  { id:'TikTok',      note:'Punchy, keyword-forward caption. 4-6 hashtags mixing broad + niche/trending.' },
  { id:'LinkedIn',    note:'Natural, professional language - keywords woven into sentences, not tags. 3-5 hashtags max.' },
  { id:'Facebook',    note:'Conversational, keyword-rich caption. 2-4 hashtags, used sparingly.' },
  { id:'Pinterest',   note:'Dense, keyword-rich description for search. 2-3 hashtags at the very end.' },
  { id:'X (Twitter)', note:'Short, keyword-clear text. 1-2 hashtags max - hashtags are largely deprioritised here.' },
  { id:'YouTube',     note:'Keyword-rich title + description style caption for Shorts. 3-5 hashtags.' },
]

export default function SocialGuru({ brand, selectedTrend }) {
  const [platform, setPlatform] = useState('Instagram')
  const [productUrl, setProductUrl] = useState('')
  const [productQuery, setProductQuery] = useState('')
  const [productInfo, setProductInfo] = useState(null)
  const [scraping, setScraping] = useState(false)
  const [searching, setSearching] = useState(false)
  const [productError, setProductError] = useState('')
  const [topic, setTopic] = useState('')

  const [generating, setGenerating] = useState(false)
  const [captions, setCaptions] = useState([])
  const [error, setError] = useState('')
  const [copiedIdx, setCopiedIdx] = useState(null)

  const platformNote = PLATFORMS.find(p => p.id === platform)?.note

  const scrapeProduct = async () => {
    if (!productUrl) return
    setScraping(true); setProductInfo(null); setProductError('')
    try {
      const res = await fetch('/api/scrape-product', {
        method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({url:productUrl})
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setProductInfo(data.product)
    } catch(e) { setProductError(e.message || 'Could not read this URL.') }
    setScraping(false)
  }

  const searchProduct = async () => {
    if (!productQuery) return
    setSearching(true); setProductInfo(null); setProductError('')
    try {
      const result = await callClaude({
        system:'Search for the product and return JSON only: {"name":"...","brand":"...","tagline":"...","description":"...","benefits":["...","...","..."],"idealFor":"...","callToAction":"..."}',
        messages:[{role:'user',content:`Search for and summarise: ${productQuery}`}],
        tools:[{type:'web_search_20250305',name:'web_search'}], max_tokens:800
      })
      setProductInfo(extractJSON(result))
    } catch { setProductError('Could not find that product.') }
    setSearching(false)
  }

  const generateCaptions = async () => {
    setGenerating(true); setCaptions([]); setError('')
    try {
      const brandCtx = brand?.name ? `Brand: ${brand.name}. Industry: ${brand.industry||''}. Tone: ${brand.tone||''}.` : ''
      const productCtx = productInfo
        ? `Product: ${productInfo.name}. Tagline: ${productInfo.tagline}. Description: ${productInfo.description}. Benefits: ${productInfo.benefits?.join('; ')}. Ideal for: ${productInfo.idealFor}. CTA: ${productInfo.callToAction}.`
        : (topic ? `Topic: ${topic}.` : '')
      const trendCtx = selectedTrend ? `Optimise for the trend "${selectedTrend.title}" - hook angle: "${selectedTrend.hook}". Why it works: ${selectedTrend.why}.` : ''

      const result = await callClaude({
        system: `You are a social media SEO copywriter specialising in 2026 "Social SEO" best practices, where platforms prioritise keyword-rich natural language captions over hashtag volume. Platform guidance for ${platform}: ${platformNote} Write captions that read naturally and conversationally while working real, relevant keywords into the sentence structure - never keyword-stuff. Return JSON only, no markdown: {"captions":[{"caption":"the full ready-to-post caption text with natural keyword placement and emojis where appropriate","hashtags":["tag1","tag2"],"seoNote":"one sentence on the specific keyword/SEO strategy used in this variation"}]} — exactly 4 distinct variations with different angles (e.g. benefit-led, story-led, question-led, urgency-led).`,
        messages: [{ role:'user', content: `${brandCtx} ${productCtx} ${trendCtx} Platform: ${platform}. Write 4 SEO-optimised caption variations ready to copy and paste directly.` }],
        max_tokens: 1600
      })
      const parsed = extractJSON(result)
      setCaptions(parsed.captions?.slice(0,4) ?? [])
    } catch(e) { setError('Could not generate captions — please try again.') }
    setGenerating(false)
  }

  const copyCaption = (idx, caption, hashtags) => {
    const full = `${caption}\n\n${(hashtags||[]).map(h=>h.startsWith('#')?h:'#'+h).join(' ')}`
    navigator.clipboard.writeText(full)
    setCopiedIdx(idx)
    setTimeout(() => setCopiedIdx(null), 2000)
  }

  return (
    <div className="page">
      <div className="page-header">
        <MessagesSquare size={24} className="page-icon-electric" />
        <div><h2>Social Guru</h2><p>SEO-optimised, platform-specific captions — ready to copy and paste anywhere.</p></div>
      </div>

      {selectedTrend && (
        <div className="card" style={{padding:'10px 16px'}}>
          <span className="tag tag-gold">Optimising for: {selectedTrend.title}</span>
        </div>
      )}

      <div className="card form-card">
        <h3>Platform</h3>
        <div className="chip-grid">
          {PLATFORMS.map(p=><button key={p.id} className={`chip ${platform===p.id?'chip-active':''}`} onClick={()=>setPlatform(p.id)}>{p.id}</button>)}
        </div>
        <p className="form-hint" style={{marginTop:8}}>{platformNote}</p>
      </div>

      <div className="card form-card">
        <h3 style={{display:'flex',alignItems:'center',gap:8}}><Link size={15}/> Product page URL (optional)</h3>
        <div className="scan-row">
          <input value={productUrl} onChange={e=>setProductUrl(e.target.value)} placeholder="Paste product page URL" onKeyDown={e=>e.key==='Enter'&&scrapeProduct()}/>
          <button className="btn btn-primary" onClick={scrapeProduct} disabled={scraping||!productUrl}>
            {scraping?<span className="spinner"/>:<><Sparkles size={14}/> Read Page</>}
          </button>
        </div>
        <div className="scan-row" style={{marginTop:8}}>
          <input value={productQuery} onChange={e=>setProductQuery(e.target.value)} placeholder="Or search by product name" onKeyDown={e=>e.key==='Enter'&&searchProduct()}/>
          <button className="btn btn-secondary" onClick={searchProduct} disabled={searching||!productQuery}>
            {searching?<span className="spinner"/>:<><Search size={14}/> Search</>}
          </button>
        </div>
        {productError&&<p className="scan-error">{productError}</p>}
        {productInfo&&(
          <div className="product-result-card card animate-slide-up" style={{margin:0}}>
            <div className="product-result-header">
              <div><strong className="product-result-name">{productInfo.name}</strong>{productInfo.brand&&<span className="product-result-brand"> by {productInfo.brand}</span>}</div>
              <button onClick={()=>setProductInfo(null)} className="product-result-clear"><X size={14}/></button>
            </div>
            {productInfo.tagline&&<p className="product-tagline">"{productInfo.tagline}"</p>}
          </div>
        )}
        {!productInfo&&(
          <div className="field" style={{marginTop:8}}>
            <label>Or just describe the topic</label>
            <textarea rows={2} value={topic} onChange={e=>setTopic(e.target.value)} placeholder="e.g. New wellness routine tips for busy professionals"/>
          </div>
        )}
      </div>

      <div className="step-nav">
        <span/>
        <button className="btn btn-primary generate-btn" onClick={generateCaptions} disabled={generating||(!productInfo&&!topic)}>
          {generating?<><span className="spinner"/> Writing captions…</>:<><Sparkles size={16}/> Generate Captions</>}
        </button>
      </div>

      {error&&<p className="scan-error">{error}</p>}

      {captions.length>0&&(
        <div style={{display:'flex',flexDirection:'column',gap:12}}>
          {captions.map((c,i)=>(
            <div key={i} className="card guru-caption-card">
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:10}}>
                <p className="guru-caption-text">{c.caption}</p>
                <button className="btn btn-secondary" style={{flexShrink:0,fontSize:12}} onClick={()=>copyCaption(i,c.caption,c.hashtags)}>
                  {copiedIdx===i?<><Check size={13}/> Copied</>:<><Copy size={13}/> Copy</>}
                </button>
              </div>
              <div className="post-hashtags">{c.hashtags?.map(h=><span key={h} className="tag tag-violet">{h.startsWith('#')?h:'#'+h}</span>)}</div>
              {c.seoNote&&<p className="guru-seo-note">{c.seoNote}</p>}
            </div>
          ))}
          <button className="btn btn-secondary" style={{alignSelf:'flex-start'}} onClick={generateCaptions}>
            <RefreshCw size={14}/> Generate More Variations
          </button>
        </div>
      )}
    </div>
  )
}
