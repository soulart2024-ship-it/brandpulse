import { useState } from 'react'
import { Calendar as CalIcon, Plus, X, Sparkles } from 'lucide-react'
import { callClaude } from '../lib/api.js'
import './Page.css'

const DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']
const COLORS = ['violet','electric','rose','gold']

export default function Calendar({ brand }) {
  const [posts, setPosts] = useState({})
  const [adding, setAdding] = useState(null)
  const [draft, setDraft] = useState({platform:'Instagram',text:'',color:0})
  const [aiLoading, setAiLoading] = useState(false)

  const save = () => {
    if (!draft.text) return
    setPosts(p=>({...p,[adding]:[...(p[adding]??[]),{...draft,id:Date.now()}]}))
    setAdding(null)
    setDraft({platform:'Instagram',text:'',color:0})
  }

  const remove = (day,id) => setPosts(p=>({...p,[day]:p[day].filter(x=>x.id!==id)}))

  const aiSchedule = async () => {
    setAiLoading(true)
    try {
      const result = await callClaude({
        system:'Return JSON only: {"schedule":[{"day":0,"platform":"...","text":"..."}]} — 5 posts Mon-Sun.',
        messages:[{role:'user',content:`Weekly schedule for ${brand?.name??'a brand'}. Industry: ${brand?.industry??'wellness'}. Tone: ${brand?.tone??'inspiring'}.`}],
        max_tokens:800
      })
      const parsed = JSON.parse(result.replace(/```json|```/g,'').trim())
      const newPosts = {}
      parsed.schedule.forEach((s,i)=>{
        newPosts[s.day??i]=[...(newPosts[s.day??i]??[]),{...s,id:Date.now()+i,color:i%4}]
      })
      setPosts(p=>{const m={...p};Object.keys(newPosts).forEach(k=>{m[k]=[...(m[k]??[]),...newPosts[k]]});return m})
    } catch{}
    setAiLoading(false)
  }

  return (
    <div className="page">
      <div className="page-header">
        <CalIcon size={24} className="page-icon-electric"/>
        <div><h2>Content Calendar</h2><p>Plan your weekly social media posts.</p></div>
      </div>
      <div className="card" style={{padding:'14px 20px'}}>
        <button className="btn btn-primary" onClick={aiSchedule} disabled={aiLoading}>
          {aiLoading?<><span className="spinner"/> Generating…</>:<><Sparkles size={14}/> AI Fill Week</>}
        </button>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:10}}>
        {DAYS.map((day,i)=>(
          <div key={day} className="card" style={{padding:12,display:'flex',flexDirection:'column',gap:8,minHeight:160}}>
            <div style={{fontSize:11,fontWeight:700,color:'var(--text-mid)',fontFamily:'Space Grotesk',textTransform:'uppercase'}}>{day}</div>
            <div style={{flex:1,display:'flex',flexDirection:'column',gap:6}}>
              {(posts[i]??[]).map(post=>(
                <div key={post.id} style={{borderRadius:8,padding:'6px 8px',position:'relative',background:`rgba(${post.color===0?'124,58,237':post.color===1?'6,182,212':post.color===2?'244,114,182':'251,191,36'},0.15)`,border:`1px solid rgba(${post.color===0?'124,58,237':post.color===1?'6,182,212':post.color===2?'244,114,182':'251,191,36'},0.3)`}}>
                  <div style={{fontSize:9,fontWeight:700,color:'var(--text-mid)',textTransform:'uppercase',marginBottom:2}}>{post.platform}</div>
                  <p style={{fontSize:11,color:'var(--text-hi)',lineHeight:1.4,display:'-webkit-box',WebkitLineClamp:3,WebkitBoxOrient:'vertical',overflow:'hidden'}}>{post.text}</p>
                  <button onClick={()=>remove(i,post.id)} style={{position:'absolute',top:4,right:4,background:'none',border:'none',color:'var(--text-lo)',cursor:'pointer',opacity:0}} className="cal-remove"><X size={10}/></button>
                </div>
              ))}
            </div>
            <button onClick={()=>setAdding(i)} style={{display:'flex',alignItems:'center',gap:4,background:'none',border:'1px dashed var(--border)',borderRadius:8,color:'var(--text-lo)',fontSize:11,cursor:'pointer',padding:'4px 8px',justifyContent:'center',fontFamily:'Space Grotesk',fontWeight:600,transition:'all 0.15s'}}>
              <Plus size={11}/> Add
            </button>
          </div>
        ))}
      </div>
      {adding!==null&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:200,backdropFilter:'blur(4px)'}} onClick={()=>setAdding(null)}>
          <div className="card" style={{width:'min(480px,calc(100vw - 40px))',display:'flex',flexDirection:'column',gap:16,padding:28}} onClick={e=>e.stopPropagation()}>
            <h3 style={{fontSize:16,fontWeight:700}}>Add post — {DAYS[adding]}</h3>
            <div className="field"><label>Platform</label>
              <select value={draft.platform} onChange={e=>setDraft(d=>({...d,platform:e.target.value}))}>
                {['Instagram','TikTok','LinkedIn','Facebook','YouTube','X (Twitter)'].map(p=><option key={p}>{p}</option>)}
              </select>
            </div>
            <div className="field"><label>Post copy</label>
              <textarea rows={4} value={draft.text} onChange={e=>setDraft(d=>({...d,text:e.target.value}))} placeholder="Your post content..." autoFocus/>
            </div>
            <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
              <button className="btn btn-secondary" onClick={()=>setAdding(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={save}>Save Post</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
