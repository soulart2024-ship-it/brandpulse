import { useState } from 'react'
import { TrendingUp, Search, Sparkles } from 'lucide-react'
import { callClaude } from '../lib/api.js'
import './Page.css'

const PLATFORMS = ['Instagram', 'TikTok', 'LinkedIn', 'YouTube', 'Facebook', 'Pinterest', 'X (Twitter)']

export default function TrendFinder({ brand }) {
  const [platform, setPlatform] = useState('Instagram')
  const [niche, setNiche] = useState(brand?.industry ?? '')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState(null)

  const findTrends = async () => {
    setLoading(true)
    setResults(null)
    try {
      const text = await callClaude({
        system: `You are a social media trend analyst. Give practical, specific trending content ideas for ${platform} in the niche provided. Format as JSON: { "trends": [{ "title": "...", "description": "...", "format": "Reel/Carousel/etc", "hook": "...", "hashtags": ["..."] }] } — 5 trends, JSON only.`,
        messages: [{ role: 'user', content: `Find current trending content ideas for ${platform} in the ${niche || 'general wellness'} niche. Brand tone: ${brand?.tone ?? 'professional'}.` }],
        max_tokens: 1200
      })
      const clean = text.replace(/```json|```/g, '').trim()
      const parsed = JSON.parse(clean)
      setResults(parsed.trends)
    } catch {
      setResults([{ title: 'Try again', description: 'Could not fetch trends right now — check your API key is set in Vercel.', format: '—', hook: '—', hashtags: [] }])
    }
    setLoading(false)
  }

  return (
    <div className="page">
      <div className="page-header">
        <TrendingUp size={24} className="page-icon-rose" />
        <div>
          <h2>Trend Finder</h2>
          <p>Discover what's performing right now on each platform — tailored to your niche.</p>
        </div>
      </div>

      <div className="card form-card">
        <h3>Search Trends</h3>
        <div className="chip-grid" style={{marginBottom:12}}>
          {PLATFORMS.map(p => (
            <button key={p} className={`chip ${platform === p ? 'chip-active' : ''}`} onClick={() => setPlatform(p)}>{p}</button>
          ))}
        </div>
        <div className="scan-row">
          <input value={niche} onChange={e => setNiche(e.target.value)} placeholder="Your niche e.g. wellness, kinesiology, fashion..." />
          <button className="btn btn-primary" onClick={findTrends} disabled={loading}>
            {loading ? <span className="spinner" /> : <><Search size={14} /> Find Trends</>}
          </button>
        </div>
      </div>

      {loading && (
        <div className="card" style={{textAlign:'center', padding:40}}>
          <Sparkles size={28} style={{color:'var(--violet-mid)', margin:'0 auto 12px'}} />
          <p style={{color:'var(--text-mid)'}}>Analysing {platform} trends for {niche || 'your niche'}…</p>
        </div>
      )}

      {results && (
        <div className="trends-list">
          {results.map((t, i) => (
            <div key={i} className="card trend-card animate-slide-up" style={{animationDelay:`${i*60}ms`}}>
              <div className="trend-header">
                <span className="tag tag-rose">#{i + 1}</span>
                <span className="tag tag-electric">{t.format}</span>
              </div>
              <h3 className="trend-title">{t.title}</h3>
              <p className="trend-desc">{t.description}</p>
              <div className="trend-hook">
                <span className="trend-label">Hook</span>
                <span>{t.hook}</span>
              </div>
              {t.hashtags?.length > 0 && (
                <div className="trend-tags">
                  {t.hashtags.map(h => <span key={h} className="tag tag-violet">{h.startsWith('#') ? h : '#'+h}</span>)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
