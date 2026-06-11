import { useState, useRef } from 'react'
import { Image, Upload, X, Star } from 'lucide-react'
import './Page.css'
import './AssetLibrary.css'

export default function AssetLibrary() {
  const [assets, setAssets] = useState([])
  const [logo, setLogo] = useState(null)
  const ref = useRef()
  const logoRef = useRef()

  const addFiles = (files) => {
    const newAssets = Array.from(files).map(f => ({
      id: Date.now() + Math.random(),
      name: f.name,
      url: URL.createObjectURL(f),
      type: f.type,
      size: (f.size / 1024).toFixed(0) + ' KB'
    }))
    setAssets(a => [...a, ...newAssets])
  }

  const onDrop = (e) => {
    e.preventDefault()
    addFiles(e.dataTransfer.files)
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
          <p>Upload your authentic brand media — photos, graphics, and your logo for watermarking.</p>
        </div>
      </div>

      <div className="form-grid">
        <div className="form-col">
          <div className="card form-card">
            <h3 style={{display:'flex',alignItems:'center',gap:8}}><Star size={14} color="var(--gold)" /> Brand Logo</h3>
            <p className="form-hint">Your logo will be watermarked onto all generated content.</p>
            <div className="logo-upload" onClick={() => logoRef.current.click()}>
              {logo
                ? <img src={logo.url} alt="Logo" className="logo-preview" />
                : <div className="logo-placeholder"><Upload size={20} /><span>Upload logo</span></div>
              }
            </div>
            <input ref={logoRef} type="file" accept="image/*" style={{display:'none'}} onChange={setLogoFile} />
            {logo && <p className="scan-result">✓ {logo.name}</p>}
          </div>
        </div>

        <div className="form-col">
          <div className="card form-card">
            <h3>Brand Media</h3>
            <div
              className="drop-zone"
              onDrop={onDrop}
              onDragOver={e => e.preventDefault()}
              onClick={() => ref.current.click()}
            >
              <Upload size={24} />
              <p>Drag & drop photos or click to browse</p>
              <span className="form-hint">PNG, JPG, MP4 — authentic brand assets only</span>
            </div>
            <input ref={ref} type="file" multiple accept="image/*,video/*" style={{display:'none'}}
              onChange={e => addFiles(e.target.files)} />
          </div>
        </div>
      </div>

      {assets.length > 0 && (
        <div className="card">
          <h3 style={{marginBottom:16, fontSize:14, fontFamily:'Space Grotesk', fontWeight:700}}>
            Your Assets ({assets.length})
          </h3>
          <div className="asset-grid">
            {assets.map(a => (
              <div key={a.id} className="asset-item">
                {a.type.startsWith('image') && <img src={a.url} alt={a.name} className="asset-thumb" />}
                {a.type.startsWith('video') && <video src={a.url} className="asset-thumb" />}
                <div className="asset-name">{a.name}</div>
                <div className="asset-size">{a.size}</div>
                <button className="asset-remove" onClick={() => setAssets(arr => arr.filter(x => x.id !== a.id))}>
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {assets.length === 0 && (
        <div className="empty-state card">
          <Image size={36} className="empty-icon" />
          <p>No assets yet — upload your brand photos and graphics above.</p>
        </div>
      )}
    </div>
  )
}
