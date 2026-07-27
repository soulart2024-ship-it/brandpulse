import { useState } from 'react'
import { TrendingUp, Search, ArrowRight, RefreshCw, Zap, Image as ImageIcon, Video } from 'lucide-react'
import { callClaude, extractJSON } from '../lib/api.js'
import './Page.css'
import './TrendFinder.css'

const PLATFORMS = ['Instagram','TikTok','LinkedIn','YouTube','Facebook','Pinterest','X (Twitter)']

const SOURCE_MAP = {
  'TikTok': 'TikTok Creative Center (ads.tiktok.com/business/creativecenter) — trending hashtags, sounds, keyword insights',
  'Pinterest': 'Pinterest Predicts annual trend forecast and Pinterest trending keywords',
  'Instagram': 'current marketing/industry commentary on Instagram content performance (official Meta trend API requires business verification we have not set up)',
  'Facebook': 'current marketing/industry commentary on Facebook content performance',
  'YouTube': 'current commentary on YouTube Shorts and video content trends',
  'LinkedIn': 'current commentary on LinkedIn content performance',
  'X (Twitter)': 'current commentary on X content trends',
}

export default function TrendFinder({ brand, onNavigate }) {
  const [platform, setPlatform] = useState('Instagram')
  const [topic, setTopic] = useState('')
  const [loading, setLoading] = useState(false)
  const [trends, setTrends] = useState([])
  const [error, setError] = useState('')

  const findTrends = async () => {
    setLoading(true); setTrends([]); setError('')
    try {
      const brandCtx = brand?.name ? `Brand: ${brand.name}. Industry: ${brand.industry || 'health & wellness'}.` : ''
      const topicCtx = topic || brand?.industry || 'health and wellness'
      const sourceGuide = SOURCE_MAP[platform] || 'current marketing/industry commentary'

      const result = await callClaude({
        system: `You are a social media trend analyst. Search for current trending content formats and visual styles. Prioritise checking ${sourceGuide} where relevant. Return JSON only, no markdown: { "trends": [{ "title": "trend name", "hook": "example opening hook or caption angle", "format": "content format description", "why": "why this is trending now", "example": "specific post idea for this brand", "source": "which real source this is based on", "suitedFor": "image|video|both", "colors": ["#hex1","#hex2","#hex3"], "typography": "bold|minimal|editorial|playful", "templateFamily": "Minimal|Bold/Editorial|Gradient|Photo-led|Text-led", "motionNotes": "if suited for video: pacing, camera movement, transitions - otherwise empty string" }] } — exactly 5 trends.`,
        messages: [{ role: 'user', content: `Find the top 5 trending content formats and visual styles on ${platform} right now for ${topicCtx}. ${brandCtx} Focus on what is actually getting high engagement this week, and recommend colours/typography/template style that matches each trend's visual mood.` }],
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        max_tokens: 2200
      })

      const parsed = extractJSON(result)
      if (parsed.trends?.length > 0) {
        setTrends(parsed.trends)
      } else {
        setError('No trends found — try a different topic or platform.')
      }
    } catch(e) {
      setError('Could not fetch trends. Please try again.')
      console.error(e)
    }
    setLoading(false)
  }

  const useTrend = (trend, mode) => {
    if (onNavigate) onNavigate(mode === 'video' ? 'video-hub' : 'post-studio', { trend: { ...trend, platform } })
  }

  return (
    <div className="page">
      <div className="page-header">
        <TrendingUp size={24} className="page-icon-violet"/>
        <div><h2>Trend Finder</h2><p>Find what's genuinely trending, then build a post or video styled to match.</p></div>
      </div>

      <div className="card form-card">
        <h3>Search Trends</h3>
        <div className="chip-grid" style={{marginBottom:12}}>
          {PLATFORMS.map(p=><button key={p} className={`chip ${platform===p?'chip-active':''}`} onClick={()=>setPlatform(p)}>{p}</button>)}
        </div>
        <p className="form-hint" style={{marginTop:-4}}>Source: {SOURCE_MAP[platform]}</p>
        <div className="scan-row">
          <input value={topic} onChange={e=>setTopic(e.target.value)}
            placeholder={`e.g. ${brand?.industry||'Health and wellness supplements'}`}
            onKeyDown={e=>e.key==='Enter'&&findTrends()}/>
          <button className="btn btn-primary" onClick={findTrends} disabled={loading}>
            {loading?<><span className="spinner"/> Finding…</>:<><Search size={14}/> Find Trends</>}
          </button>
        </div>
        {error&&<p style={{fontSize:12,color:'var(--danger)',marginTop:8}}>{error}</p>}
      </div>

      {loading&&(
        <div className="card" style={{display:'flex',alignItems:'center',gap:12,padding:24}}>
          <span className="spinner"/>
          <span style={{fontSize:13,color:'var(--text-mid)'}}>Searching {platform} sources for trending content in your industry…</span>
        </div>
      )}

      {trends.length>0&&(
        <div style={{display:'flex',flexDirection:'column',gap:12}}>
          {trends.map((trend,i)=>(
            <div key={i} className="card trend-card">
              <div className="trend-header">
                <div className="trend-rank">#{i+1}</div>
                <div className="trend-platform-badge">{platform}</div>
                <h3 className="trend-title">{trend.title}</h3>
              </div>

              {trend.hook&&(
                <div className="trend-hook">
                  <span className="trend-hook-label">HOOK</span>
                  <span className="trend-hook-text">"{trend.hook}"</span>
                </div>
              )}

              {trend.format&&<p className="trend-format"><strong>Format:</strong> {trend.format}</p>}
              {trend.why&&<p className="trend-why"><Zap size={12}/> {trend.why}</p>}
              {trend.source&&<p className="trend-source">Source: {trend.source}</p>}

              {trend.colors?.length>0&&(
                <div className="trend-visual-style">
                  <span style={{fontSize:11,color:'var(--text-lo)',fontWeight:600}}>Visual style:</span>
                  <div className="trend-color-swatches">
                    {trend.colors.map((c,ci)=><div key={ci} className="trend-swatch" style={{background:c}}/>)}
                  </div>
                  <span className="tag tag-violet" style={{fontSize:10}}>{trend.typography}</span>
                  <span className="tag tag-electric" style={{fontSize:10}}>{trend.templateFamily}</span>
                </div>
              )}

              {trend.example&&(
                <div className="trend-example">
                  <p style={{fontSize:11,color:'var(--text-lo)',marginBottom:4,fontWeight:600}}>POST IDEA FOR {brand?.name?.toUpperCase()||'YOUR BRAND'}</p>
                  <p style={{fontSize:12,color:'var(--text-hi)',lineHeight:1.5}}>{trend.example}</p>
                </div>
              )}

              <div style={{display:'flex',gap:8,marginTop:4}}>
                {(trend.suitedFor==='image'||trend.suitedFor==='both'||!trend.suitedFor)&&(
                  <button className="btn btn-primary" style={{flex:1,justifyContent:'center'}} onClick={()=>useTrend(trend,'image')}>
                    <ImageIcon size={14}/> Create Image Post <ArrowRight size={13}/>
                  </button>
                )}
                {(trend.suitedFor==='video'||trend.suitedFor==='both')&&(
                  <button className="btn btn-secondary" style={{flex:1,justifyContent:'center'}} onClick={()=>useTrend(trend,'video')}>
                    <Video size={14}/> Create Video <ArrowRight size={13}/>
                  </button>
                )}
              </div>
            </div>
          ))}

          <button className="btn btn-secondary" style={{alignSelf:'flex-start'}} onClick={findTrends}>
            <RefreshCw size={14}/> Find More Trends
          </button>
        </div>
      )}
    </div>
  )
}
