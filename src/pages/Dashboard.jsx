import { Brain, Image, TrendingUp, Palette, Video, Calendar, ArrowRight, Zap, ChevronRight } from 'lucide-react'
import './Dashboard.css'

const FLOW = [
  { step: 1, id: 'brand',   label: 'Brand Brain',   desc: 'Set up your brand identity & voice', icon: Brain,      color: 'violet' },
  { step: 2, id: 'assets',  label: 'Asset Library', desc: 'Upload your brand photos & logo',     icon: Image,      color: 'electric' },
  { step: 3, id: 'trends',  label: 'Trend Finder',  desc: 'Find what\'s trending on each platform', icon: TrendingUp, color: 'rose' },
  { step: 4, id: 'studio',  label: 'Post Studio',   desc: 'Create finished posts with your assets', icon: Palette,    color: 'gold' },
]

const MORE = [
  { id: 'video',    label: 'Video Hub',  desc: 'AI video tools', icon: Video,    color: 'electric' },
  { id: 'calendar', label: 'Calendar',   desc: 'Plan your week', icon: Calendar, color: 'violet' },
]

export default function Dashboard({ onNavigate, brand }) {
  return (
    <div className="dashboard">
      <header className="dash-header animate-slide-up">
        <div className="dash-greeting">
          <span className="dash-eyebrow">Your Creative Command Centre</span>
          <h1>
            {brand ? `${brand.name}` : 'Welcome to BrandPulse'}
            <span className="dash-zap"><Zap size={22} /></span>
          </h1>
          <p>{brand
            ? `${brand.industry} · ${brand.tone} tone · ${brand.platforms?.join(', ')}`
            : 'Follow the 4-step flow below to create and publish branded social posts.'}</p>
        </div>
        {!brand && (
          <button className="btn btn-primary" onClick={() => onNavigate('brand')}>
            Get Started <ArrowRight size={16} />
          </button>
        )}
      </header>

      <section className="flow-section animate-slide-up">
        <h2 className="section-title">Your Creative Flow</h2>
        <div className="flow-grid">
          {FLOW.map(({ step, id, label, desc, icon: Icon, color }, i) => (
            <div key={id} className="flow-item">
              <button className={`flow-card card color-${color}`} onClick={() => onNavigate(id)}>
                <div className="flow-step-num">{step}</div>
                <div className={`flow-icon icon-${color}`}>
                  <Icon size={22} />
                </div>
                <div className="flow-info">
                  <h3>{label}</h3>
                  <p>{desc}</p>
                </div>
                <ArrowRight size={16} className="flow-arrow" />
              </button>
              {i < FLOW.length - 1 && <div className="flow-connector"><ChevronRight size={16} /></div>}
            </div>
          ))}
        </div>
      </section>

      <section className="more-section animate-slide-up">
        <h2 className="section-title">More Tools</h2>
        <div className="more-grid">
          {MORE.map(({ id, label, desc, icon: Icon, color }) => (
            <button key={id} className={`module-card card color-${color}`} onClick={() => onNavigate(id)}>
              <div className={`module-icon icon-${color}`}><Icon size={20} /></div>
              <div className="module-info"><h3>{label}</h3><p>{desc}</p></div>
              <ArrowRight size={16} className="module-arrow" />
            </button>
          ))}
        </div>
      </section>

      {brand && (
        <div className="quick-start card animate-slide-up">
          <Zap size={18} style={{color:'var(--gold)'}} />
          <div>
            <h4>Quick create</h4>
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
