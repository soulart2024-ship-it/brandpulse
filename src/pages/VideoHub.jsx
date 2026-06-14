import { Video, ExternalLink, Zap } from 'lucide-react'
import './Page.css'

const TOOLS = [
  {name:'Runway ML',desc:'Industry-leading AI video generation from text or images.',url:'https://runwayml.com',tag:'Text → Video',color:'electric',credits:'Pay-per-credit'},
  {name:'Pika Labs',desc:'Fast, stylised AI video. Great for animated brand content.',url:'https://pika.art',tag:'Image → Video',color:'violet',credits:'Free tier available'},
  {name:'OpenAI Sora',desc:'Photorealistic video model from detailed text prompts.',url:'https://openai.com/sora',tag:'Text → Video',color:'rose',credits:'ChatGPT Plus/Pro'},
  {name:'Kling AI',desc:'High-quality video with excellent motion consistency.',url:'https://klingai.com',tag:'Text + Image',color:'gold',credits:'Free & paid'},
  {name:'HeyGen',desc:'AI avatar videos with your brand spokesperson.',url:'https://heygen.com',tag:'Avatar Video',color:'electric',credits:'Free trial'},
  {name:'CapCut',desc:'Auto-caption, trending templates, AI effects for Reels & TikTok.',url:'https://capcut.com',tag:'Editing + AI',color:'violet',credits:'Free'},
]

export default function VideoHub() {
  return (
    <div className="page">
      <div className="page-header">
        <Video size={24} className="page-icon-rose" />
        <div><h2>Video Hub</h2><p>The best AI video tools for social content.</p></div>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:16}}>
        {TOOLS.map(t=>(
          <div key={t.name} className="card" style={{display:'flex',flexDirection:'column',gap:10}}>
            <div style={{display:'flex',justifyContent:'space-between'}}>
              <span className={`tag tag-${t.color}`}>{t.tag}</span>
              <span style={{fontSize:11,color:'var(--text-lo)'}}>{t.credits}</span>
            </div>
            <h3 style={{fontSize:18,fontWeight:700,color:'var(--text-hi)'}}>{t.name}</h3>
            <p style={{fontSize:13,color:'var(--text-mid)',flex:1}}>{t.desc}</p>
            <a href={t.url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary" style={{justifyContent:'center',fontSize:13}}>
              Open {t.name} <ExternalLink size={13}/>
            </a>
          </div>
        ))}
      </div>
    </div>
  )
}
