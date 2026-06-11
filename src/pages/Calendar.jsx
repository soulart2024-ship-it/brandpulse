import { useState } from 'react'
import { Calendar as CalIcon, Plus, X, Sparkles } from 'lucide-react'
import { callClaude } from '../lib/api.js'
import './Page.css'
import './Calendar.css'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const COLORS = ['violet', 'electric', 'rose', 'gold']

function getWeekDates() {
  const today = new Date()
  const day = today.getDay()
  const diff = today.getDate() - day + (day === 0 ? -6 : 1)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today.setDate(diff + i))
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
  })
}

export default function Calendar({ brand }) {
  const [posts, setPosts] = useState({})
  const [adding, setAdding] = useState(null) // day index
  const [draft, setDraft] = useState({ platform: 'Instagram', text: '', color: 0 })
  const [aiLoading, setAiLoading] = useState(false)
  const dates = getWeekDates()

  const save = () => {
    if (!draft.text) return
    setPosts(p => ({ ...p, [adding]: [...(p[adding] ?? []), { ...draft, id: Date.now() }] }))
    setAdding(null)
    setDraft({ platform: 'Instagram', text: '', color: 0 })
  }

  const remove = (day, id) => setPosts(p => ({ ...p, [day]: p[day].filter(x => x.id !== id) }))

  const aiSchedule = async () => {
    setAiLoading(true)
    try {
      const result = await callClaude({
        system: 'You are a social media strategist. Return JSON only: { "schedule": [{ "day": 0-6, "platform": "...", "text": "..." }] } — 5 posts across the week (Mon-Sun).',
        messages: [{ role: 'user', content: `Create a 5-post weekly schedule for ${brand?.name ?? 'a brand'}. Industry: ${brand?.industry ?? 'wellness'}. Tone: ${brand?.tone ?? 'inspiring'}.` }],
        max_tokens: 800
      })
      const clean = result.replace(/```json|```/g, '').trim()
      const parsed = JSON.parse(clean)
      const newPosts = {}
      parsed.schedule.forEach((s, i) => {
        const day = s.day ?? i
        newPosts[day] = [...(newPosts[day] ?? []), { ...s, id: Date.now() + i, color: i % 4 }]
      })
      setPosts(p => {
        const merged = { ...p }
        Object.keys(newPosts).forEach(k => { merged[k] = [...(merged[k] ?? []), ...newPosts[k]] })
        return merged
      })
    } catch { /* silent */ }
    setAiLoading(false)
  }

  return (
    <div className="page">
      <div className="page-header">
        <CalIcon size={24} className="page-icon-electric" />
        <div>
          <h2>Content Calendar</h2>
          <p>Plan and schedule your weekly social media posts.</p>
        </div>
      </div>

      <div className="cal-toolbar card form-card">
        <div style={{display:'flex', gap:10, alignItems:'center'}}>
          <button className="btn btn-primary" onClick={aiSchedule} disabled={aiLoading}>
            {aiLoading ? <span className="spinner" /> : <><Sparkles size={14} /> AI Fill Week</>}
          </button>
          <span className="form-hint" style={{marginTop:0}}>Let AI generate a full week of posts for your brand</span>
        </div>
      </div>

      <div className="cal-grid">
        {DAYS.map((day, i) => (
          <div key={day} className="cal-day card">
            <div className="cal-day-header">
              <span className="cal-day-name">{day}</span>
              <span className="cal-day-date">{dates[i]}</span>
            </div>
            <div className="cal-posts">
              {(posts[i] ?? []).map(post => (
                <div key={post.id} className={`cal-post color-${COLORS[post.color ?? 0]}`}>
                  <span className="post-platform">{post.platform}</span>
                  <p className="post-text">{post.text}</p>
                  <button className="post-remove" onClick={() => remove(i, post.id)}><X size={10} /></button>
                </div>
              ))}
            </div>
            <button className="cal-add" onClick={() => setAdding(i)}>
              <Plus size={12} /> Add
            </button>
          </div>
        ))}
      </div>

      {adding !== null && (
        <div className="modal-overlay" onClick={() => setAdding(null)}>
          <div className="modal card" onClick={e => e.stopPropagation()}>
            <h3>Add post — {DAYS[adding]} {dates[adding]}</h3>
            <div className="field">
              <label>Platform</label>
              <select value={draft.platform} onChange={e => setDraft(d => ({...d, platform: e.target.value}))}>
                {['Instagram','TikTok','LinkedIn','Facebook','YouTube','Pinterest','X (Twitter)'].map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Post copy</label>
              <textarea rows={4} value={draft.text} onChange={e => setDraft(d => ({...d, text: e.target.value}))}
                placeholder="Your post content..." autoFocus />
            </div>
            <div style={{display:'flex', gap:10, justifyContent:'flex-end'}}>
              <button className="btn btn-secondary" onClick={() => setAdding(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={save}>Save Post</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
