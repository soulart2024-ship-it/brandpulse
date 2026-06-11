import { Video, ExternalLink, Zap } from 'lucide-react'
import './Page.css'
import './VideoHub.css'

const TOOLS = [
  {
    name: 'Runway ML',
    desc: 'Industry-leading AI video generation from text or images. Gen-3 Alpha produces cinema-quality clips.',
    url: 'https://runwayml.com',
    tag: 'Text → Video',
    color: 'electric',
    credits: 'Pay-per-credit',
  },
  {
    name: 'Pika Labs',
    desc: 'Fast, stylised AI video. Great for animated brand content and motion graphics from still images.',
    url: 'https://pika.art',
    tag: 'Image → Video',
    color: 'violet',
    credits: 'Free tier available',
  },
  {
    name: 'OpenAI Sora',
    desc: 'OpenAI\'s photorealistic video model. Long-form coherent scenes from detailed text prompts.',
    url: 'https://openai.com/sora',
    tag: 'Text → Video',
    color: 'rose',
    credits: 'ChatGPT Plus/Pro',
  },
  {
    name: 'Kling AI',
    desc: 'High-quality video generation with excellent motion consistency. Strong for product showcases.',
    url: 'https://klingai.com',
    tag: 'Text + Image',
    color: 'gold',
    credits: 'Free & paid',
  },
  {
    name: 'HeyGen',
    desc: 'AI avatar videos with your brand spokesperson. Perfect for talking-head social content at scale.',
    url: 'https://heygen.com',
    tag: 'Avatar Video',
    color: 'electric',
    credits: 'Free trial',
  },
  {
    name: 'CapCut',
    desc: 'Auto-caption, trending templates, and AI effects for Reels & TikTok. Free and fast.',
    url: 'https://capcut.com',
    tag: 'Editing + AI',
    color: 'violet',
    credits: 'Free',
  },
]

export default function VideoHub() {
  return (
    <div className="page">
      <div className="page-header">
        <Video size={24} className="page-icon-rose" />
        <div>
          <h2>Video Generation Hub</h2>
          <p>The best AI video tools for social content — launch each platform directly.</p>
        </div>
      </div>

      <div className="card" style={{background:'rgba(124,58,237,0.08)', border:'1px solid rgba(124,58,237,0.25)', marginBottom:4}}>
        <div style={{display:'flex', gap:10, alignItems:'center'}}>
          <Zap size={16} style={{color:'var(--violet-mid)'}} />
          <p style={{fontSize:13, color:'var(--text-mid)'}}>
            <strong style={{color:'var(--violet-glow)'}}>Workflow tip:</strong> Use Storyboard Builder to plan your shots → export your script from Content Generator → paste into your video tool of choice.
          </p>
        </div>
      </div>

      <div className="video-grid">
        {TOOLS.map(t => (
          <div key={t.name} className={`card video-card color-${t.color}`}>
            <div className="vc-header">
              <span className={`tag tag-${t.color}`}>{t.tag}</span>
              <span className="vc-credits">{t.credits}</span>
            </div>
            <h3 className="vc-name">{t.name}</h3>
            <p className="vc-desc">{t.desc}</p>
            <a href={t.url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary vc-link">
              Open {t.name} <ExternalLink size={13} />
            </a>
          </div>
        ))}
      </div>
    </div>
  )
}
