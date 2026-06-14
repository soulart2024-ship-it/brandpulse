import { useState } from 'react'
import { Zap, Lock } from 'lucide-react'

export default function Login({ onLogin }) {
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [shake, setShake] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (code.length >= 4) { onLogin(code); return }
    setError('Enter your passcode')
    setShake(true)
    setTimeout(() => setShake(false), 600)
  }

  return (
    <div style={{minHeight:'100dvh',display:'flex',alignItems:'center',justifyContent:'center',background:'var(--bg-deep)',position:'relative',overflow:'hidden'}}>
      <div style={{position:'absolute',width:400,height:400,background:'rgba(124,58,237,0.25)',borderRadius:'50%',filter:'blur(80px)',top:-100,left:-100}} />
      <div style={{position:'absolute',width:300,height:300,background:'rgba(6,182,212,0.15)',borderRadius:'50%',filter:'blur(80px)',bottom:-80,right:-80}} />
      <div className={`card animate-slide-up ${shake ? 'shake' : ''}`} style={{width:'min(400px,calc(100vw - 40px))',textAlign:'center',padding:'48px 40px',position:'relative',zIndex:1,boxShadow:'0 0 60px rgba(124,58,237,0.2)'}}>
        <div style={{width:56,height:56,borderRadius:16,background:'linear-gradient(135deg,var(--violet),var(--violet-mid))',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 20px',boxShadow:'0 0 24px rgba(124,58,237,0.5)',color:'white'}}>
          <Zap size={28} />
        </div>
        <h1 style={{fontSize:28,fontWeight:700,marginBottom:6}}>BrandPulse</h1>
        <p style={{fontSize:14,color:'var(--text-mid)',marginBottom:32}}>AI-powered social media manager</p>
        <form onSubmit={handleSubmit} style={{display:'flex',flexDirection:'column',gap:14}}>
          <div style={{display:'flex',alignItems:'center',gap:10,background:'var(--bg-lift)',border:'1px solid var(--border)',borderRadius:'var(--radius)',padding:'0 14px'}}>
            <Lock size={16} style={{color:'var(--text-mid)'}} />
            <input type="password" placeholder="Enter passcode" value={code}
              onChange={e=>{setCode(e.target.value);setError('')}} autoFocus maxLength={20}
              style={{background:'transparent',border:'none',padding:'12px 0'}} />
          </div>
          {error && <p style={{fontSize:13,color:'var(--danger)'}}>{error}</p>}
          <button type="submit" className="btn btn-primary" style={{width:'100%',justifyContent:'center',padding:13}}>
            Enter BrandPulse
          </button>
        </form>
      </div>
      <style>{`.shake{animation:shake 0.5s ease}@keyframes shake{0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-8px)}40%,80%{transform:translateX(8px)}}`}</style>
    </div>
  )
}
