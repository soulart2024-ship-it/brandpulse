import { useState } from 'react'
import { Zap, Lock } from 'lucide-react'
import './Login.css'

export default function Login({ onLogin }) {
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [shake, setShake] = useState(false)

  const submit = (e) => {
    e.preventDefault()
    if (onLogin(code)) return
    // If onLogin doesn't return true, it means wrong code
    setError('Incorrect passcode')
    setShake(true)
    setCode('')
    setTimeout(() => setShake(false), 600)
  }

  // Patch: onLogin just sets state, so check length
  const handleSubmit = (e) => {
    e.preventDefault()
    const ok = code.length >= 4
    if (ok) { onLogin(code); return }
    setError('Enter your passcode')
    setShake(true)
    setTimeout(() => setShake(false), 600)
  }

  return (
    <div className="login-bg">
      <div className="login-orb login-orb-1" />
      <div className="login-orb login-orb-2" />
      <div className={`login-card animate-slide-up ${shake ? 'shake' : ''}`}>
        <div className="login-logo">
          <Zap size={28} />
        </div>
        <h1>BrandPulse</h1>
        <p className="login-sub">AI-powered social media manager</p>
        <form onSubmit={handleSubmit} className="login-form">
          <div className="login-field">
            <Lock size={16} />
            <input
              type="password"
              placeholder="Enter passcode"
              value={code}
              onChange={e => { setCode(e.target.value); setError('') }}
              autoFocus
              maxLength={20}
            />
          </div>
          {error && <p className="login-error">{error}</p>}
          <button type="submit" className="btn btn-primary login-btn">
            Enter BrandPulse
          </button>
        </form>
      </div>
    </div>
  )
}
