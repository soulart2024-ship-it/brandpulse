import { useState } from 'react'
import { TrendingUp, Search, ArrowRight, RefreshCw, Zap, Image as ImageIcon, Video, Globe, CalendarDays, Download, ChevronDown, ChevronUp, Radar } from 'lucide-react'
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

const PURPOSES = [
  { id:'Inform',   desc:'Share facts, how it works, what it does' },
  { id:'Educate',  desc:'Teach a skill, bust a myth, explain why' },
  { id:'Entertain',desc:'Relatable, fun, trend-led, scroll-stopping' },
  { id:'Inspire',  desc:'Story, transformation, aspiration' },
]

export default function TrendFinder({ brand, onNavigate }) {
  const [platform, setPlatform] = useState('Instagram')
  const [topic, setTopic] = useState('')
  const [purpose, setPurpose] = useState(null)
  const [loading, setLoading] = useState(false)
  const [trends, setTrends] = useState([])
  const [error, setError] = useState('')

  // Regional market intelligence
  const [loadingMarket, setLoadingMarket] = useState(false)
  const [marketData, setMarketData] = useState(null)
  const [marketError, setMarketError] = useState('')

  // What's Changed - platform algorithm/behaviour pulse
  const [loadingPulse, setLoadingPulse] = useState(false)
  const [pulseData, setPulseData] = useState(null)
  const [pulseError, setPulseError] = useState('')

  // 30-day calendar
  const [loadingCalendar, setLoadingCalendar] = useState(false)
  const [calendar, setCalendar] = useState(null)
  const [calendarError, setCalendarError] = useState('')
  const [expandedWeek, setExpandedWeek] = useState(0)

  const findTrends = async () => {
    setLoading(true); setTrends([]); setError('')
    try {
      const brandCtx = brand?.name ? `Brand: ${brand.name}. Industry: ${brand.industry || 'health & wellness'}.` : ''
      const topicCtx = topic || brand?.industry || 'health and wellness'
      const sourceGuide = SOURCE_MAP[platform] || 'current marketing/industry commentary'
      const purposeCtx = purpose ? `Content purpose: ${purpose} - ${PURPOSES.find(p=>p.id===purpose)?.desc}. Every trend suggested must genuinely serve this purpose, not just be promotional.` : ''

      const result = await callClaude({
        system: `You are a social media trend analyst focused on relevant, purpose-driven content over generic promotion. Search for current trending content formats and visual styles. Prioritise checking ${sourceGuide} where relevant. ${purposeCtx} Return JSON only, no markdown: { "trends": [{ "title": "trend name", "hook": "example opening hook or caption angle", "format": "content format description", "why": "why this is trending now", "example": "specific post idea for this brand", "source": "which real source this is based on", "suitedFor": "image|video|both", "colors": ["#hex1","#hex2","#hex3"], "typography": "bold|minimal|editorial|playful", "templateFamily": "Minimal|Bold/Editorial|Gradient|Photo-led|Text-led", "motionNotes": "if suited for video: pacing, camera movement, transitions - otherwise empty string" }] } — exactly 5 trends.`,
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

  const findMarket = async () => {
    setLoadingMarket(true); setMarketData(null); setMarketError('')
    try {
      const brandCtx = brand?.name ? `Brand: ${brand.name}. Industry: ${brand.industry || ''}. Website: ${brand.website || ''}.` : ''
      const topicCtx = topic || brand?.industry || 'health and wellness'

      const result = await callClaude({
        system: 'You are a market research analyst. Search for real published data on regional/geographic search interest and demand for this product category (Google Trends regional breakdowns, industry market reports, regional social media usage patterns). Return JSON only, no markdown: { "regions": [{ "name": "country or region name", "strength": "high|medium|growing", "reasoning": "one sentence why demand is strong here, citing real signals", "platformFocus": "which platform dominates in this region for this content type" }], "summary": "one paragraph overview of where the best opportunity is and why" } — exactly 3-4 regions, ranked by opportunity.',
        messages: [{ role: 'user', content: `${brandCtx} Topic/industry: ${topicCtx}. Research and identify which regions/countries show the strongest real search and social demand for this product category. Use actual published regional trend data, not guesses.` }],
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        max_tokens: 1200
      })

      const parsed = extractJSON(result)
      setMarketData(parsed)
    } catch(e) {
      setMarketError('Could not research regional market data. Please try again.')
    }
    setLoadingMarket(false)
  }

  const findPulse = async () => {
    setLoadingPulse(true); setPulseData(null); setPulseError('')
    try {
      const result = await callClaude({
        system: 'You are a social media platform analyst tracking algorithm and policy changes. Search for the most recent confirmed changes to how each major platform ranks, indexes, or recommends content - not old established best-practice, specifically RECENT shifts. Return JSON only, no markdown: { "changes": [{ "platform": "platform name", "change": "what specifically changed", "impact": "what creators/brands should do differently now", "date": "roughly when this changed if known" }] } — exactly 4-5 real, current changes across different platforms.',
        messages: [{ role: 'user', content: `Search for the most recent confirmed algorithm, ranking, or content-policy changes on Instagram, TikTok, LinkedIn, Pinterest and Facebook. Focus specifically on what has CHANGED recently, not general evergreen advice - things a brand needs to know to adjust their strategy right now.` }],
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        max_tokens: 1400
      })
      const parsed = extractJSON(result)
      setPulseData(parsed)
    } catch(e) {
      setPulseError('Could not fetch platform updates. Please try again.')
    }
    setLoadingPulse(false)
  }

  const generateCalendar = async () => {
    setLoadingCalendar(true); setCalendar(null); setCalendarError('')
    try {
      const brandCtx = brand?.name ? `Brand: ${brand.name}. Industry: ${brand.industry || ''}. Tone: ${brand.tone || ''}.` : ''
      const topicCtx = topic || brand?.industry || 'health and wellness'
      const marketCtx = marketData?.regions?.length ? `Focus regions: ${marketData.regions.map(r=>r.name).join(', ')}.` : ''
      const purposeCtx = purpose ? `Every post must serve this content purpose: ${purpose} - ${PURPOSES.find(p=>p.id===purpose)?.desc}.` : 'Rotate across Inform, Educate, Entertain and Inspire purposes across the month - never purely promotional.'

      const result = await callClaude({
        system: `You are a social media content strategist focused on relevant, value-driven content over generic advertising. Create a 30-day organic content calendar organised into 4 themed weeks. ${purposeCtx} Return JSON only, no markdown: { "weeks": [{ "theme": "week theme name", "days": [{ "day": 1, "platform": "Instagram|TikTok|Facebook|Pinterest", "format": "content format e.g. Reel, Carousel, Story", "purpose": "Inform|Educate|Entertain|Inspire", "focus": "product or topic focus", "hook": "opening hook/script seed", "cta": "call to action" }] }] } — exactly 4 weeks, each with 7 days (28 total, spread realistically - use 5-6 posting days per week with rest days implied), covering a coherent month of organic growth content.`,
        messages: [{ role: 'user', content: `${brandCtx} Topic: ${topicCtx}. ${marketCtx} Platform priority: ${platform}. Build a realistic, varied 30-day organic content calendar for this brand, prioritising real value to the audience over promotion.` }],
        max_tokens: 3000
      })

      const parsed = extractJSON(result)
      setCalendar(parsed)
      setExpandedWeek(0)
    } catch(e) {
      setCalendarError('Could not generate the calendar. Please try again.')
    }
    setLoadingCalendar(false)
  }

  const downloadCalendar = () => {
    if (!calendar?.weeks) return
    let md = `# 30-Day Content Calendar — ${brand?.name || 'Brand'}\n\n`
    calendar.weeks.forEach((week, wi) => {
      md += `## Week ${wi+1}: ${week.theme}\n\n`
      week.days.forEach(d => {
        md += `**Day ${d.day} — ${d.platform} (${d.format})**${d.purpose ? ` — *${d.purpose}*` : ''}\n`
        md += `- Focus: ${d.focus}\n`
        md += `- Hook: "${d.hook}"\n`
        md += `- CTA: ${d.cta}\n\n`
      })
    })
    const blob = new Blob([md], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${(brand?.name||'brand').replace(/\s+/g,'-').toLowerCase()}-30-day-calendar.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  const useTrend = (trend, mode) => {
    if (onNavigate) onNavigate(mode === 'video' ? 'video-hub' : 'post-studio', { trend: { ...trend, platform, purpose } })
  }

  return (
    <div className="page">
      <div className="page-header">
        <TrendingUp size={24} className="page-icon-violet"/>
        <div><h2>Trend Finder</h2><p>Find what's genuinely trending, where the demand is, and plan a month of content.</p></div>
      </div>

      <div className="card form-card">
        <h3>Content Purpose <span style={{color:'var(--text-lo)',fontWeight:400,fontSize:12}}>(optional — shapes everything below)</span></h3>
        <p className="form-hint">Inform, Educate, Entertain, Inspire — real value over pure promotion.</p>
        <div className="chip-grid">
          {PURPOSES.map(p=>(
            <button key={p.id} className={`chip ${purpose===p.id?'chip-active':''}`} onClick={()=>setPurpose(purpose===p.id?null:p.id)} title={p.desc}>
              {p.id}
            </button>
          ))}
        </div>
        {purpose&&<p className="form-hint" style={{marginTop:6}}>{PURPOSES.find(p=>p.id===purpose)?.desc}</p>}
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

      {/* What's Changed - platform algorithm pulse */}
      <div className="card form-card">
        <h3 style={{display:'flex',alignItems:'center',gap:8}}><Radar size={15} style={{color:'var(--rose)'}}/> What's Changed</h3>
        <p className="form-hint">Recent algorithm and ranking shifts across platforms — so your strategy stays current, not stuck on last year's rules.</p>
        <button className="btn btn-secondary" onClick={findPulse} disabled={loadingPulse} style={{alignSelf:'flex-start'}}>
          {loadingPulse?<><span className="spinner"/> Checking platforms…</>:<><Radar size={14}/> Check What's Changed</>}
        </button>
        {pulseError&&<p className="scan-error">{pulseError}</p>}
        {pulseData?.changes&&(
          <div className="animate-slide-up" style={{marginTop:10,display:'flex',flexDirection:'column',gap:8}}>
            {pulseData.changes.map((c,i)=>(
              <div key={i} className="pulse-card">
                <div style={{display:'flex',alignItems:'center',gap:8,justifyContent:'space-between'}}>
                  <span className="tag tag-rose" style={{fontSize:10}}>{c.platform}</span>
                  {c.date&&<span style={{fontSize:10,color:'var(--text-lo)'}}>{c.date}</span>}
                </div>
                <p style={{fontSize:12,color:'var(--text-hi)',marginTop:6,fontWeight:600}}>{c.change}</p>
                <p style={{fontSize:12,color:'var(--text-mid)',marginTop:4}}>{c.impact}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Regional Market Intelligence */}
      <div className="card form-card">
        <h3 style={{display:'flex',alignItems:'center',gap:8}}><Globe size={15} style={{color:'var(--electric)'}}/> Where's the Demand?</h3>
        <p className="form-hint">Research real regional search and social demand for this topic, so your platform and content choices are grounded in actual data.</p>
        <button className="btn btn-secondary" onClick={findMarket} disabled={loadingMarket} style={{alignSelf:'flex-start'}}>
          {loadingMarket?<><span className="spinner"/> Researching regions…</>:<><Globe size={14}/> Find My Market</>}
        </button>
        {marketError&&<p className="scan-error">{marketError}</p>}
        {marketData&&(
          <div className="animate-slide-up" style={{marginTop:10,display:'flex',flexDirection:'column',gap:10}}>
            {marketData.summary&&<p style={{fontSize:12,color:'var(--text-mid)',lineHeight:1.6}}>{marketData.summary}</p>}
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {marketData.regions?.map((r,i)=>(
                <div key={i} className="market-region-card">
                  <div style={{display:'flex',alignItems:'center',gap:8,justifyContent:'space-between'}}>
                    <strong style={{fontSize:13,fontFamily:'Space Grotesk'}}>{r.name}</strong>
                    <span className={`tag ${r.strength==='high'?'tag-gold':r.strength==='growing'?'tag-electric':'tag-violet'}`} style={{fontSize:10}}>{r.strength}</span>
                  </div>
                  <p style={{fontSize:12,color:'var(--text-mid)',marginTop:4}}>{r.reasoning}</p>
                  {r.platformFocus&&<p style={{fontSize:11,color:'var(--electric)',marginTop:4}}>Best platform: {r.platformFocus}</p>}
                </div>
              ))}
            </div>
          </div>
        )}
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

      {/* 30-Day Calendar */}
      <div className="card form-card">
        <h3 style={{display:'flex',alignItems:'center',gap:8}}><CalendarDays size={15} style={{color:'var(--gold)'}}/> 30-Day Content Calendar</h3>
        <p className="form-hint">A full month of organic growth content, organised into 4 themed weeks — grounded in your regional market data if you've run "Find My Market" above, and rotating through Inform/Educate/Entertain/Inspire.</p>
        <button className="btn btn-primary" onClick={generateCalendar} disabled={loadingCalendar} style={{alignSelf:'flex-start'}}>
          {loadingCalendar?<><span className="spinner"/> Building your calendar…</>:<><CalendarDays size={14}/> Generate 30-Day Calendar</>}
        </button>
        {calendarError&&<p className="scan-error">{calendarError}</p>}

        {calendar?.weeks&&(
          <div className="animate-slide-up" style={{marginTop:12,display:'flex',flexDirection:'column',gap:10}}>
            <div style={{display:'flex',justifyContent:'flex-end'}}>
              <button className="btn btn-secondary" onClick={downloadCalendar} style={{fontSize:12}}>
                <Download size={13}/> Download as Markdown
              </button>
            </div>
            {calendar.weeks.map((week,wi)=>(
              <div key={wi} className="card" style={{padding:0,overflow:'hidden'}}>
                <button onClick={()=>setExpandedWeek(expandedWeek===wi?-1:wi)}
                  style={{width:'100%',display:'flex',justifyContent:'space-between',alignItems:'center',padding:'14px 16px',background:'none',border:'none',cursor:'pointer'}}>
                  <span style={{fontSize:13,fontWeight:700,color:'var(--text-hi)',fontFamily:'Space Grotesk'}}>Week {wi+1}: {week.theme}</span>
                  {expandedWeek===wi?<ChevronUp size={16}/>:<ChevronDown size={16}/>}
                </button>
                {expandedWeek===wi&&(
                  <div style={{padding:'0 16px 16px',display:'flex',flexDirection:'column',gap:8}}>
                    {week.days?.map((d,di)=>(
                      <div key={di} className="calendar-day-row">
                        <span className="tag tag-violet" style={{fontSize:10,flexShrink:0}}>Day {d.day}</span>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{display:'flex',gap:6,alignItems:'center',flexWrap:'wrap',marginBottom:3}}>
                            <strong style={{fontSize:12,color:'var(--text-hi)'}}>{d.platform}</strong>
                            <span style={{fontSize:10,color:'var(--text-lo)'}}>· {d.format}</span>
                            {d.purpose&&<span className="tag tag-gold" style={{fontSize:9}}>{d.purpose}</span>}
                          </div>
                          <p style={{fontSize:11,color:'var(--text-mid)'}}>{d.focus}</p>
                          <p style={{fontSize:11,color:'var(--electric)',fontStyle:'italic',marginTop:2}}>"{d.hook}"</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
