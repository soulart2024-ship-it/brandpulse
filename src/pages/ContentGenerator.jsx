import { useState } from 'react'
import { PenTool, Copy, Check, Sparkles } from 'lucide-react'
import { callClaude } from '../lib/api.js'
import './Page.css'
import './ContentGenerator.css'

const TYPES = ['Instagram Caption', 'TikTok Script', 'LinkedIn Post', 'YouTube Description', 'Facebook Post', 'Story Script', 'Hashtag Pack', 'CTA Copy']

export default function ContentGenerator({ brand }) {
  const [type, setType] = useState('Instagram Caption')
  const [topic, setTopic] = useState('')
  const [goal, setGoal] = useState('Engagement')
  const [loading, setLoading] = useState(false)
  const [output, setOutput] = useState('')
  const [copied, setCopied] = useState(false)

  const generate = async () => {
    if (!topic) return
    setLoading(true)
    setOutput('')
    try {
      const brandCtx = brand
        ? `Brand: ${brand.name}. Industry: ${brand.industry}. Tone: ${brand.tone}. Description: ${brand.description}. Keywords: ${brand.keywords}.`
        : 'No brand profile set — generate great generic content.'
      const result = await callClaude({
        system: `You are a social media copywriter. Write compelling ${type} content. Always match the brand tone. Use line breaks for readability. Do not use markdown.`,
        messages: [{ role: 'user', content: `${brandCtx}\n\nContent type: ${type}\nTopic: ${topic}\nGoal: ${goal}\n\nWrite the content now.` }],
        max_tokens: 800
      })
      setOutput(result)
    } catch (e) {
      setOutput(`Error: ${e.message}`)
    }
    setLoading(false)
  }

  const copy = () => {
    navigator.clipboard.writeText(output)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="page">
      <div className="page-header">
        <PenTool size={24} className="page-icon-gold" />
        <div>
          <h2>Content Generator</h2>
          <p>AI-written captions, scripts, hashtags and CTAs — all in your brand voice.</p>
        </div>
      </div>

      <div className="form-grid">
        <div className="form-col">
          <div className="card form-card">
            <h3>Content Type</h3>
            <div className="chip-grid">
              {TYPES.map(t => (
                <button key={t} className={`chip ${type === t ? 'chip-active' : ''}`} onClick={() => setType(t)}>{t}</button>
              ))}
            </div>
          </div>
          <div className="card form-card">
            <h3>What's it about?</h3>
            <div className="field">
              <label>Topic / Subject</label>
              <textarea rows={3} value={topic} onChange={e => setTopic(e.target.value)}
                placeholder="e.g. Announcing our new Harmonic Blink app launch..." />
            </div>
            <div className="field">
              <label>Goal</label>
              <select value={goal} onChange={e => setGoal(e.target.value)}>
                {['Engagement', 'Sales', 'Awareness', 'Education', 'Community', 'Traffic'].map(g =>
                  <option key={g}>{g}</option>)}
              </select>
            </div>
            <button className="btn btn-primary" onClick={generate} disabled={loading || !topic}>
              {loading ? <span className="spinner" /> : <><Sparkles size={14} /> Generate</>}
            </button>
          </div>
        </div>

        <div className="form-col">
          <div className="card form-card" style={{flex:1}}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12}}>
              <h3>Output</h3>
              {output && (
                <button className="btn btn-secondary copy-btn" onClick={copy}>
                  {copied ? <><Check size={14} /> Copied!</> : <><Copy size={14} /> Copy</>}
                </button>
              )}
            </div>
            <div className="output-box">
              {loading && <p className="output-placeholder">Writing your {type}…</p>}
              {!loading && output && output}
              {!loading && !output && <p className="output-placeholder">Your generated content will appear here.</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
