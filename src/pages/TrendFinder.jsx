import { useState } from 'react'
import { TrendingUp, Search, ArrowRight, RefreshCw, Zap } from 'lucide-react'
import { callClaude, extractJSON } from '../lib/api.js'
import './Page.css'
import './TrendFinder.css'

const PLATFORMS = ['Instagram','TikTok','LinkedIn','YouTube','Facebook','Pinterest','X (Twitter)']

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

      const result = await callClaude({
        system: 'You are a social media trend analyst. Search for current trending content formats and hooks. Return JSON only, no markdown: { "trends": [{ "title": "trend name", "hook": "example opening hook for this trend", "format": "content format description", "why": "why this is trending now", "example": "example post idea for this brand" }] } — exactly 5 trends.',
        messages: [{ role: 'user', content: `Find the top 5 trending content formats and hooks on ${platform} right now for ${topicCtx}. ${brandCtx} Focus on what is actually getting high engagement and views this week. Include specific hook examples.` }],
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        max_tokens: 1500
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

  const useTrend = (trend) => {
    if (onNavigate) onNavigate('post-studio', { trend: { ...trend, platform } })
  }

  return (
    <div className="page">
      <div className="page-header">
        <TrendingUp size={24} className="page-icon-violet"/>
        <div><h2>Trend Finder</h2><p>Find what's trending — then click "Use This Trend" to create your post in Post Studio.</p></div>
      </div>

      <div className="card form-card">
        <h3>Search Trends</h3>
        <div className="chip-grid" style={{marginBottom:12}}>
          {PLATFORMS.map(p=><button key={p} className={`chip ${platform===p?'chip-active':''}`} onClick={()=>setPlatform(p)}>{p}</button>)}
        </div>
        <div className="scan-row">
          <input value={topic} onChange={e=>setTopic(e.target.value)}
            placeholder={`e.g. ${brand?.industry||'Health Food and Natural Supplements Retail'}`}
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
          <span style={{fontSize:13,color:'var(--text-mid)'}}>Searching {platform} for trending content in your industry…</span>
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
              {trend.example&&(
                <div className="trend-example">
                  <p style={{fontSize:11,color:'var(--text-lo)',marginBottom:4,fontWeight:600}}>POST IDEA FOR {brand?.name?.toUpperCase()||'YOUR BRAND'}</p>
                  <p style={{fontSize:12,color:'var(--text-hi)',lineHeight:1.5}}>{trend.example}</p>
                </div>
              )}

              <button className="btn btn-primary" style={{alignSelf:'flex-start',marginTop:4}} onClick={()=>useTrend(trend)}>
                Use This Trend in Post Studio <ArrowRight size={14}/>
              </button>
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
