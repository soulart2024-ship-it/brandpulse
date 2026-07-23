import { ArrowRight, Sparkles } from 'lucide-react'
import './Dashboard.css'

const FLOW = [
  { step: 1, id: 'brand',  label: 'Brand Brain',   desc: 'Set up your brand identity & voice',     color: 'violet' },
  { step: 2, id: 'assets', label: 'Asset Library',  desc: 'Upload your brand photos & logo',        color: 'electric' },
  { step: 3, id: 'trends', label: 'Trend Finder',   desc: "Find what's trending on each platform",  color: 'rose' },
  { step: 4, id: 'studio', label: 'Post Studio',    desc: 'Create finished posts with your assets', color: 'gold' },
]

const MORE = [
  { id: 'video',    label: 'Video Hub', desc: 'AI video tools', color: 'electric' },
  { id: 'calendar', label: 'Calendar',  desc: 'Plan your week',  color: 'violet' },
]

export default function Dashboard({ onNavigate, brand }) {
  return (
    <div className="dashboard">
      <header className="dash-header animate-slide-up">
        <div className="dash-brandmark">
          {brand?.logo ? (
            <img src={brand.logo} alt={brand.name} className="dash-logo-img" />
          ) : (
            <div className="dash-logo-fallback"><Sparkles size={20} /></div>
          )}
        </div>
        <div className="dash-greeting">
          <span className="dash-eyebrow">Creative Command Centre</span>
          <h1>{brand ? brand.name : 'Welcome to BrandPulse'}</h1>
          <p>{brand
            ? [brand.industry, brand.tone].filter(Boolean).join(' · ')
            : 'Follow the flow below to create and publish branded social posts.'}</p>
        </div>
        {!brand?.name && (
          <button className="btn btn-primary" onClick={() => onNavigate('brand')}>
            Get Started <ArrowRight size={16} />
          </button>
        )}
      </header>

      <section className="flow-section animate-slide-up">
        <h2 className="section-title">Creative Flow</h2>
        <div className="flow-grid">
          {FLOW.map(({ step, id, label, desc, color }) => (
            <button key={id} className={`glass-card flow-card accent-${color}`} onClick={() => onNavigate(id)}>
              <span className="flow-step-num">{step}</span>
              <div className="flow-info">
                <h3>{label}</h3>
                <p>{desc}</p>
              </div>
              <ArrowRight size={14} className="card-arrow" />
            </button>
          ))}
        </div>
      </section>

      <section className="more-section animate-slide-up">
        <h2 className="section-title">More Tools</h2>
        <div className="more-grid">
          {MORE.map(({ id, label, desc, color }) => (
            <button key={id} className={`glass-card more-card accent-${color}`} onClick={() => onNavigate(id)}>
              <div className="flow-info"><h3>{label}</h3><p>{desc}</p></div>
              <ArrowRight size={14} className="card-arrow" />
            </button>
          ))}
        </div>
      </section>

      {brand?.name && (
        <div className="quick-start glass-card accent-gold animate-slide-up">
          <div className="flow-info">
            <h3>Quick create</h3>
            <p>Jump straight to Post Studio to create a post for {brand.name}</p>
          </div>
          <button className="btn btn-primary" onClick={() => onNavigate('studio')}>
            Open Post Studio <ArrowRight size={14} />
          </button>
        </div>
      )}
    </div>
  )
}
