import { Brain, Image, TrendingUp, PenTool, Palette, Film, ArrowRight, Zap } from 'lucide-react'
import './Dashboard.css'

const MODULES = [
  { id: 'brand',   label: 'Brand Brain',      icon: Brain,      color: 'violet',   desc: 'Set up your brand identity & voice' },
  { id: 'assets',  label: 'Asset Library',    icon: Image,      color: 'electric', desc: 'Upload authentic brand media' },
  { id: 'trends',  label: 'Trend Finder',     icon: TrendingUp, color: 'rose',     desc: 'Discover what\'s trending per platform' },
  { id: 'content', label: 'Content Generator',icon: PenTool,    color: 'gold',     desc: 'Captions, hashtags, scripts & CTAs' },
  { id: 'images',  label: 'AI Image Studio',  icon: Palette,    color: 'violet',   desc: 'Branded graphics with logo watermark' },
  { id: 'motion',  label: 'Motion Cards',     icon: Film,       color: 'electric', desc: 'Animated social previews 9:16 & 1:1' },
]

export default function Dashboard({ onNavigate, brand }) {
  return (
    <div className="dashboard">
      <header className="dash-header animate-slide-up">
        <div className="dash-greeting">
          <span className="dash-eyebrow">Your Command Centre</span>
          <h1>
            {brand ? `Welcome back, ${brand.name}` : 'Welcome to BrandPulse'}
            <span className="dash-zap"><Zap size={22} /></span>
          </h1>
          <p>{brand ? `${brand.industry} · ${brand.platforms?.join(', ')}` : 'Start by setting up your Brand Brain to unlock AI-powered content.'}</p>
        </div>
        {!brand && (
          <button className="btn btn-primary" onClick={() => onNavigate('brand')}>
            Set up Brand Brain <ArrowRight size={16} />
          </button>
        )}
      </header>

      {brand && (
        <div className="dash-stats animate-slide-up">
          {[
            { label: 'Brand set up', value: '✓', sub: brand.name },
            { label: 'Platforms', value: brand.platforms?.length ?? 0, sub: 'connected' },
            { label: 'Tone', value: brand.tone ?? '—', sub: 'brand voice' },
          ].map(s => (
            <div key={s.label} className="stat-card card">
              <div className="stat-value">{s.value}</div>
              <div className="stat-label">{s.label}</div>
              <div className="stat-sub">{s.sub}</div>
            </div>
          ))}
        </div>
      )}

      <section className="dash-grid animate-slide-up">
        {MODULES.map(({ id, label, icon: Icon, color, desc }) => (
          <button key={id} className={`module-card card color-${color}`} onClick={() => onNavigate(id)}>
            <div className={`module-icon icon-${color}`}>
              <Icon size={22} />
            </div>
            <div className="module-info">
              <h3>{label}</h3>
              <p>{desc}</p>
            </div>
            <ArrowRight size={16} className="module-arrow" />
          </button>
        ))}
      </section>
    </div>
  )
}
