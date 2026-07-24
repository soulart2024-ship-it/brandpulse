import { useState, useRef } from 'react'
import { Video, ExternalLink, Upload, X, Wand2, Download, Check, Send } from 'lucide-react'
import { callClaude, extractJSON } from '../lib/api.js'
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

  // Captioning (client-side burn-in)
  const [captionText, setCaptionText] = useState('')
  const [rendering, setRendering] = useState(false)
  const [renderProgress, setRenderProgress] = useState(0)
  const [captionedUrl, setCaptionedUrl] = useState(null)

  // Buffer
  const [bufferChannels, setBufferChannels] = useState([])
  const [loadingChannels, setLoadingChannels] = useState(false)
  const [bufferChannelId, setBufferChannelId] = useState('')
  const [postText, setPostText] = useState('')
  const [scheduleDate, setScheduleDate] = useState('')
  const [scheduling, setScheduling] = useState(false)
  const [scheduleError, setScheduleError] = useState('')
  const [scheduleSuccess, setScheduleSuccess] = useState(false)
  const [generatingCaption, setGeneratingCaption] = useState(false)

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
    setGenerating(true); setError(''); setVideoUrl(null); setCaptionedUrl(null)
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

  const burnCaption = async () => {
    if (!videoUrl || !captionText) return
    setRendering(true); setRenderProgress(0); setCaptionedUrl(null)
    try {
      const vid = document.createElement('video')
      vid.crossOrigin = 'anonymous'
      vid.src = videoUrl
      vid.muted = false

      await new Promise((resolve, reject) => {
        vid.onloadedmetadata = resolve
        vid.onerror = () => reject(new Error('Could not load video for captioning'))
      })

      const canvas = document.createElement('canvas')
      canvas.width = vid.videoWidth
      canvas.height = vid.videoHeight
      const ctx = canvas.getContext('2d')

      const canvasStream = canvas.captureStream(30)
      let audioTracks = []
      try {
        const vidStream = vid.captureStream ? vid.captureStream() : null
        if (vidStream) audioTracks = vidStream.getAudioTracks()
      } catch(e) { /* no audio available */ }

      const combined = new MediaStream([...canvasStream.getVideoTracks(), ...audioTracks])
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
        ? 'video/webm;codecs=vp9,opus' : 'video/webm'
      const recorder = new MediaRecorder(combined, { mimeType })
      const chunks = []
      recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data) }
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' })
        setCaptionedUrl(URL.createObjectURL(blob))
        setRendering(false)
      }

      const strip = canvas.height * 0.22
      const drawFrame = () => {
        if (vid.paused || vid.ended) { recorder.stop(); return }
        ctx.drawImage(vid, 0, 0, canvas.width, canvas.height)
        const stripY = canvas.height - strip
        const grad = ctx.createLinearGradient(0, stripY - 30, 0, canvas.height)
        grad.addColorStop(0, 'rgba(0,0,0,0)'); grad.addColorStop(1, 'rgba(0,0,0,0.85)')
        ctx.fillStyle = grad
        ctx.fillRect(0, stripY - 30, canvas.width, strip + 30)
        ctx.fillStyle = '#FFFFFF'
        ctx.textAlign = 'center'
        let fontSize = Math.max(14, canvas.height * 0.045)
        ctx.font = `700 ${fontSize}px "Space Grotesk",sans-serif`
        while (ctx.measureText(captionText).width > canvas.width * 0.88 && fontSize > 10) {
          fontSize -= 1
          ctx.font = `700 ${fontSize}px "Space Grotesk",sans-serif`
        }
        ctx.fillText(captionText, canvas.width / 2, canvas.height - strip / 2 + fontSize / 3)
        setRenderProgress(Math.min(100, Math.round((vid.currentTime / vid.duration) * 100)))
        requestAnimationFrame(drawFrame)
      }

      vid.currentTime = 0
      recorder.start()
      await vid.play()
      requestAnimationFrame(drawFrame)
    } catch(e) {
      setError(e.message || 'Could not add captions to this video.')
      setRendering(false)
    }
  }

  const generateCaption = async () => {
    setGeneratingCaption(true)
    try {
      const result = await callClaude({
        system: 'Social media copywriter. Return JSON only: {"caption":"engaging caption with emojis for a short video post","hashtags":["tag1","tag2","tag3","tag4","tag5"]}',
        messages: [{ role:'user', content: `Write a caption for a short video post. Video motion description: ${motionPrompt || 'lifestyle product video'}.` }],
        max_tokens: 400
      })
      const parsed = extractJSON(result)
      const hashtags = (parsed.hashtags||[]).map(h=>h.startsWith('#')?h:'#'+h).join(' ')
      setPostText(`${parsed.caption}\n\n${hashtags}`)
    } catch(e) { setScheduleError('Could not generate caption — write one manually below.') }
    setGeneratingCaption(false)
  }

  const fetchBufferChannels = async () => {
    setLoadingChannels(true); setScheduleError('')
    try {
      const res = await fetch('/api/buffer')
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setBufferChannels(data.channels || [])
      if (data.channels?.[0]) setBufferChannelId(data.channels[0].id)
    } catch(e) { setScheduleError(e.message || 'Could not load Buffer channels.') }
    setLoadingChannels(false)
  }

  const sendVideoToBuffer = async () => {
    if (!videoUrl || !bufferChannelId) { setScheduleError('Pick a channel first.'); return }
    setScheduling(true); setScheduleError(''); setScheduleSuccess(false)
    try {
      const body = {
        text: postText || captionText || 'New video post',
        channelId: bufferChannelId,
        imageUrl: videoUrl,
        mediaType: 'video',
        mode: scheduleDate ? 'customScheduled' : 'addToQueue',
        ...(scheduleDate && { dueAt: new Date(scheduleDate).toISOString() })
      }
      const res = await fetch('/api/buffer', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
      })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error || 'Failed to schedule video')
      setScheduleSuccess(true)
      setTimeout(() => setScheduleSuccess(false), 4000)
    } catch(e) { setScheduleError(e.message || 'Failed to send video to Buffer.') }
    setScheduling(false)
  }

  return (
    <div className="page">
      <div className="page-header">
        <Video size={24} className="page-icon-rose" />
        <div><h2>Video Hub</h2><p>Animate a photo into a short video with Kling AI, or use an external tool below.</p></div>
      </div>

      <div className="card form-card">
        <h3><Wand2 size={15} style={{color:'var(--gold)'}}/> Animate a photo — powered by Kling</h3>
        <p className="form-hint">Upload a photo or pick one from your Asset Library, describe the motion you want, and Kling turns it into a short video clip.</p>

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

            {/* Buffer scheduling — uses the direct Kling video URL (real public link) */}
            <div className="logo-panel" style={{marginTop:14}}>
              <div className="logo-panel-header">
                <div style={{display:'flex',alignItems:'center',gap:8}}><Send size={15} style={{color:'var(--electric)'}}/><strong style={{fontSize:13,fontFamily:'Space Grotesk'}}>Send to Buffer</strong></div>
                {bufferChannels.length===0 && (
                  <button className="btn btn-secondary" style={{fontSize:12,padding:'6px 12px'}} onClick={fetchBufferChannels} disabled={loadingChannels}>
                    {loadingChannels?<span className="spinner"/>:'Connect Channels'}
                  </button>
                )}
              </div>
              {bufferChannels.length>0 && (
                <div className="logo-controls animate-slide-up">
                  <div className="field">
                    <label>Post to channel</label>
                    <div className="chip-grid">
                      {bufferChannels.map(ch=>(
                        <button key={ch.id} className={`chip ${bufferChannelId===ch.id?'chip-active':''}`} onClick={()=>setBufferChannelId(ch.id)}>
                          {ch.name} <span style={{opacity:0.6,fontSize:10}}>({ch.service})</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="field">
                    <label>Post text</label>
                    <div style={{display:'flex',gap:8,alignItems:'flex-start'}}>
                      <textarea rows={3} value={postText} onChange={e=>setPostText(e.target.value)} placeholder="Caption for this video post..." style={{flex:1}}/>
                      <button className="btn btn-secondary" style={{fontSize:11,padding:'6px 10px',flexShrink:0}} onClick={generateCaption} disabled={generatingCaption}>
                        {generatingCaption?<span className="spinner"/>:'AI Write'}
                      </button>
                    </div>
                  </div>
                  <div className="field">
                    <label>Schedule for (leave blank to add to next queue slot)</label>
                    <input type="datetime-local" value={scheduleDate} onChange={e=>setScheduleDate(e.target.value)}/>
                  </div>
                  <button className="btn btn-primary" onClick={sendVideoToBuffer} disabled={scheduling || !bufferChannelId}>
                    {scheduling?<span className="spinner"/>:scheduleSuccess?<><Check size={14}/> Sent!</>:<><Send size={14}/> Schedule Video</>}
                  </button>
                </div>
              )}
              {scheduleError && <p className="scan-error">{scheduleError}</p>}
            </div>

            {/* Caption burn-in — local only, download as separate file */}
            <div className="field" style={{marginTop:14}}>
              <label>Add a burned-in caption to the video (optional, for download only)</label>
              <input value={captionText} onChange={e=>setCaptionText(e.target.value)} placeholder="e.g. New season, new you"/>
            </div>
            <button className="btn btn-primary" onClick={burnCaption} disabled={rendering || !captionText}>
              {rendering ? <><span className="spinner"/> Rendering captions… {renderProgress}%</> : <>Add Caption to Video</>}
            </button>

            {captionedUrl && (
              <div className="scene-result animate-slide-up" style={{marginTop:10}}>
                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
                  <Check size={14} style={{color:'var(--success)'}}/><strong style={{fontSize:13}}>✓ Captioned video ready</strong>
                </div>
                <video src={captionedUrl} controls autoPlay loop muted className="scene-preview-img" style={{maxHeight:400}}/>
                <a href={captionedUrl} download="brandpulse-captioned.webm" className="btn btn-secondary" style={{marginTop:10,justifyContent:'center'}}>
                  <Download size={14}/> Download Captioned Video
                </a>
                <p className="form-hint" style={{marginTop:6}}>Note: captioned video is local-only and can't be sent to Buffer yet — use the "Send to Buffer" panel above for the original uncaptioned video.</p>
              </div>
            )}
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
