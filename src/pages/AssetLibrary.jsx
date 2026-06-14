import { useState, useRef } from 'react'
import { Image, Upload, X, Star, Tag, Check } from 'lucide-react'
import { callClaude } from '../lib/api.js'
import './Page.css'
import './AssetLibrary.css'

const AUTO_TAGS = ['Product', 'Team', 'Lifestyle', 'Outdoor', 'Interior', 'Food', 'Event', 'Quote', 'Before/After', 'Behind the scenes']

export default function AssetLibrary({ assets, onAssetsChange, brand }) {
  const [logo, setLogo] = useState(null)
  const [tagging, setTagging] = useState(null)
  const ref = useRef()
  const logoRef = useRef()

  const addFiles = async (files) => {
    const newAssets = Array.from(files).map(f => ({
      id: Date.now() + Math.random(),
      name: f.name,
      url: URL.createObjectURL(f),
      type: f.type,
      size: (f.size / 1024).toFixed(0) + ' KB',
      tags: [],
      caption: '',
      selected: false
    }))
    onAssetsChange(prev => [...prev, ...newAssets])

    // Auto-tag each image
    for (const asset of newAssets) {
      if (!asset.type.startsWith('image')) continue
      setTagging(asset.id)
      try {
        const result = await callClaude({
          system: 'You are a social media asset analyst. Given a filename, suggest 2-3 content tags from this list: Product, Team, Lifestyle, Outdoor, Interior, Food, Event, Quote, Before/After, Behind the scenes. Return JSON only: { "tags": ["tag1", "tag2"], "caption": "one sentence describing likely use" }',
          messages: [{ role: 'user', content: `Filename: ${asset.name}. Brand: ${brand?.name ?? 'general'}. Industry: ${brand?.industry ?? 'general'}.` }],
          max_tokens: 200
        })
        const clean = result.replace(/```json|```/g, '').trim()
        const parsed = JSON.parse(clean)
        onAssetsChange(prev => prev.map(a => a.id === asset.id
          ? { ...a, tags: parsed.tags ?? [], caption: parsed.caption ?? '' }
          : a))
      } catch { /* silent */ }
      setTagging(null)
    }
  }

  const removeAsset = (id) => onAssetsChange(prev => prev.filter(a => a.id !== id))

  const toggleTag = (assetId, tag) => {
    onAssetsChange(prev => prev.map(a => a.id === assetId
      ? { ...a, tags: a.tags.includes(tag) ? a.tags.filter(t => t !== tag) : [...a.tags, tag] }
      : a))
  }

  const setLogoFile = (e) => {
    const f = e.target.files[0]
    if (f) setLogo({ name: f.name, url: URL.createObjectURL(f) })
  }

  return (
    <div className="page">
      <div className="page-header">
        <Image size={24} className="page-icon-electric" />
        <div>
          <h2>Asset Library</h2>
          <p>Upload your brand photos and graphics. AI will tag them automatically for use in Post Studio.</p>
        </div>
      </div>

      <div className="form-grid">
        <div className="form-col">
          <div className="card form-card">
            <h3 style={{display:'flex',alignItems:'center',gap:8}}><Star size={14} color="var(--gold)" /> Brand Logo</h3>
            <p className="form-hint">Used as watermark on all created posts.</p>
            <div className="logo-upload" onClick={() => logoRef.current.click()}>
              {logo
                ? <img src={logo.url} alt="Logo" className="logo-preview" />
                : <div className="logo-placeholder"><Upload size={20} /><span>Upload logo (PNG with transparent background)</span></div>}
            </div>
            <input ref={logoRef} type="file" accept="image/*" style={{display:'none'}} onChange={setLogoFile} />
            {logo && <p className="scan-result">✓ {logo.name}</p>}
          </div>
        </div>

        <div className="form-col">
          <div className="card form-card">
            <h3>Upload Brand Photos</h3>
            <div className="drop-zone"
              onDrop={e => { e.preventDefault(); addFiles(e.dataTransfer.files) }}
              onDragOver={e => e.preventDefault()}
              onClick={() => ref.current.click()}>
              <Upload size={24} />
              <p>Drag & drop photos or click to browse</p>
              <span className="form-hint">JPG, PNG — your authentic brand images</span>
            </div>
            <input ref={ref} type="file" multiple accept="image/*,video/*" style={{display:'none'}}
              onChange={e => addFiles(e.target.files)} />
          </div>
        </div>
      </div>

      {assets.length > 0 && (
        <div className="card">
          <h3 style={{marginBottom:16, fontSize:14, fontFamily:'Space Grotesk', fontWeight:700}}>
            Your Assets ({assets.length}) — Click tags to edit
          </h3>
          <div className="asset-grid-full">
            {assets.map(a => (
              <div key={a.id} className="asset-card-full">
                <div className="asset-img-wrap">
                  <img src={a.url} alt={a.name} className="asset-img-full" />
                  {tagging === a.id && <div className="asset-tagging">Tagging…</div>}
                  <button className="asset-remove-full" onClick={() => removeAsset(a.id)}><X size={12} /></button>
                </div>
                <div className="asset-info-full">
                  <p className="asset-name-full">{a.name}</p>
                  {a.caption && <p className="asset-caption">{a.caption}</p>}
                  <div className="asset-tags">
                    {AUTO_TAGS.map(tag => (
                      <button key={tag}
                        className={`asset-tag ${a.tags.includes(tag) ? 'tag-active' : ''}`}
                        onClick={() => toggleTag(a.id, tag)}>
                        {a.tags.includes(tag) && <Check size={10} />} {tag}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {assets.length === 0 && (
        <div className="empty-state card">
          <Image size={36} className="empty-icon" />
          <p>No assets yet — upload your brand photos above.</p>
          <p style={{fontSize:12, color:'var(--text-lo)'}}>Once uploaded, you can use them in Post Studio to create finished posts.</p>
        </div>
      )}
    </div>
  )
}
