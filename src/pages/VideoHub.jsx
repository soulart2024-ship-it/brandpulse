import { useState, useRef } from 'react'
import { Video, ExternalLink, Upload, X, Wand2, Download, Check } from 'lucide-react'
import './Page.css'

const TOOLS = [
  {name:'Runway ML',desc:'Industry-leading AI video generation from text or images.',url:'https://runwayml.com',tag:'Text → Video',color:'electric',credits:'Pay-per-credit'},
  {name:'Pika Labs',desc:'Fast, stylised AI video. Great for animated brand content.',url:'https://pika.art',tag:'Image → Video',color:'violet',credits:'Free tier available'},
  {name:'OpenAI Sora',desc:'Photorealistic video model from detailed text prompts.',url:'https://openai.com/sora',tag:'Text → Video',color:'rose',credits:'ChatGPT Plus/Pro'},
  {name:'HeyGen',desc:'AI avatar videos with your brand spokesperson.',url:'https://heygen.com',tag:'Avatar Video',color:'electric',credits:'Free trial'},
  {name:'CapCut',desc:'Auto-caption, trending templates, AI effects for Reels & TikTok.',url:'https://capcut.com',tag:'Editing + AI',color:'violet',credits:'Free'},
]

async function toBase64(url) {
  const res = await fetch(url)
  const blob = await res.blob()
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

async function compressImage(dataUrl, maxDim = 1280, quality = 0.85) {
  return new Promise((resolve) => {
    const img = new window.Image()
    img.onload = () => {
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      const ctx = canvas.getContext('2d')
      ctx.fillStyle = '#FFFFFF'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      resolve(canvas.toDataURL('image/jpeg', quality))
    }
    img.onerror = () => resolve(dataUrl)
    img.src = dataUrl
  })
}

export default function VideoHub({ assets }) {
  const [photoId, setPhotoId] = useState(null)
  const [photoUrl, setPhotoUrl] = useState('')
  const [motionPrompt, setMotionPrompt] = useState('')
  const [duration, setDuration] = useState('5')
  const [generating, setGenerating] = useState(false)
  const [videoUrl, setVideoUrl] = useState(null)
  const [error, setError] = useState('')
  const fileRef = useRef()

  const photo = assets?.find(a => a.id === photoId)

  const handleUpload = (files) => {
    const f = files[0]
    if (!f) return
    const reader = new FileReader()
    reader.onload = e => {
      setPhotoUrl(e.target.result)
      setPhotoId(null)
    }
    reader.readAsDataURL(f)
  }

  const generateVideo = async () => {
    const imageSource = photoUrl || photo?.url
    if (!imageSource) { setError('Upload a photo or pick one from your library first.'); return }
    setGenerating(true); setError(''); setVideoUrl(null)
    try {
      const body = {
        prompt: motionPrompt || 'subtle natural motion, cinematic, professional commercial video',
        duration
      }
      if (imageSource.startsWith('data:')) {
        body.imageBase64 = await compressImage(imageSource)
      } else {
        const raw = await toBase64(imageSource)
        body.imageBase64 = await compressImage(raw)
      }

      const res = await fetch('/api/generate-video', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
      })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error || 'Video generation failed')
      setVideoUrl(data.url)
    } catch(e) {
      setError(e.message || 'Could not generate video — check your FAL_KEY in Vercel.')
    }
    setGenerating(false)
  }

  return (
    <div className="page">
      <div className="page-header">
        <Video size={24} className="page-icon-rose" />
        <div><h2>Video Hub</h2><p>Animate a photo into a short video with Kling AI, or use an external tool below.</p></div>
      </div>

      <div className="card form-card">
        <h3><Wand2 size={15} style={{color:'var(--gold)'}}/> Animate a photo — powered by Kling</h3>
        <p className="form-hint">Upload a photo or pick one from your Asset Library, describe the motion you want, and Kling turns it into a short video clip. Costs a small amount per generation via your Fal.ai credit.</p>

        <div className="scan-row">
          <input value={photoUrl.startsWith('data:') ? '' : photoUrl} onChange={e=>{setPhotoUrl(e.target.value); setPhotoId(null)}}
            placeholder="Paste an image URL, or upload/select below"/>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <div style={{flex:1,height:1,background:'var(--border)'}}/><span style={{fontSize:11,color:'var(--text-lo)'}}>or upload</span><div style={{flex:1,height:1,background:'var(--border)'}}/>
        </div>
        <button className="btn btn-secondary" onClick={()=>fileRef.current.click()} style={{alignSelf:'flex-start'}}><Upload size={14}/> Upload Photo</button>
        <input ref={fileRef} type="file" accept="image/*" style={{display:'none'}} onChange={e=>handleUpload(e.target.files)}/>

        {assets?.length > 0 && (
          <div>
            <p style={{fontSize:11,color:'var(--text-lo)',marginBottom:6}}>Or pick from your Asset Library</p>
            <div className="asset-picker-grid">
              {assets.map(a=>(
                <div key={a.id} className={`asset-picker-item ${photoId===a.id?'selected':''}`} onClick={()=>{setPhotoId(a.id);setPhotoUrl('')}}>
                  <img src={a.url} alt={a.name} className="picker-thumb"/>
                  {photoId===a.id && <div className="picker-check"><Check size={14}/></div>}
                </div>
              ))}
            </div>
          </div>
        )}

        {(photoUrl || photo) && (
          <div className="url-preview animate-slide-up">
            <img src={photoUrl || photo?.url} alt="Selected" className="url-preview-img"/>
            <p style={{fontSize:11,color:'var(--success)'}}>✓ Photo ready to animate</p>
          </div>
        )}

        <div className="field">
          <label>Describe the motion (optional)</label>
          <textarea rows={2} value={motionPrompt} onChange={e=>setMotionPrompt(e.target.value)}
            placeholder="e.g. gentle steam rising from the cup, soft camera drift, warm morning light"/>
        </div>

        <div className="field">
          <label>Duration</label>
          <div className="chip-grid">
            {['5','10'].map(d=><button key={d} className={`chip ${duration===d?'chip-active':''}`} onClick={()=>setDuration(d)}>{d} seconds</button>)}
          </div>
        </div>

        <button className="btn btn-primary" onClick={generateVideo} disabled={generating || (!photoUrl && !photo)}>
          {generating ? <><span className="spinner"/> Generating video — this can take a minute…</> : <><Wand2 size={14}/> Generate Video</>}
        </button>
        {error && <p className="scan-error">{error}</p>}

        {videoUrl && (
          <div className="scene-result animate-slide-up">
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
              <Check size={14} style={{color:'var(--success)'}}/><strong style={{fontSize:13}}>✓ Video ready</strong>
            </div>
            <video src={videoUrl} controls autoPlay loop muted className="scene-preview-img" style={{maxHeight:400}}/>
            <a href={videoUrl} download target="_blank" rel="noopener noreferrer" className="btn btn-secondary" style={{marginTop:10,justifyContent:'center'}}>
              <Download size={14}/> Download Video
            </a>
          </div>
        )}
      </div>

      <div className="card form-card">
        <h3>Other video tools</h3>
        <p className="form-hint">For more advanced editing, avatars, or captioning — these external tools are worth having on hand.</p>
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
