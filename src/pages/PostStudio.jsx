import { useState, useRef, useEffect, useCallback } from 'react'
import { Palette, Sparkles, Download, Send, Check, ChevronRight, ChevronLeft,
         Image, Edit2, Type, Upload, TrendingUp, X, Search, Package, Wand2, RefreshCw, Link, Eye, Star, PenLine } from 'lucide-react'
import { callClaude, extractJSON } from '../lib/api.js'
import './Page.css'
import './PostStudio.css'

const PLATFORMS = ['Instagram','TikTok','LinkedIn','Facebook','X (Twitter)','Pinterest']
const FORMATS = [
  { id:'square',    label:'1:1 Square',  pw:320, ph:320 },
  { id:'story',     label:'9:16 Story',  pw:180, ph:320 },
  { id:'landscape', label:'16:9 Banner', pw:320, ph:180 },
]
const STEPS = ['Template','Asset','Scene','Studio']
const FAMILIES = ['All','Minimal','Bold/Editorial','Gradient','Photo-led','Text-led','Device']
const LOGO_POSITIONS = [
  { id:'top-left',     label:'↖' },
  { id:'top-center',   label:'↑' },
  { id:'top-right',    label:'↗' },
  { id:'bottom-left',  label:'↙' },
  { id:'bottom-right', label:'↘' },
]
const LOGO_SIZES = [
  { id:'small',  label:'S', scale:0.12 },
  { id:'medium', label:'M', scale:0.20 },
  { id:'large',  label:'L', scale:0.28 },
]
const DEFAULT_TEXT_SIZES = { headline: 1, subtext: 1, cta: 1 }

async function toBase64(url) {
  const res = await fetch(url)
  const blob = await res.blob()
  return new Promise((resolve,reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

function fitLine(ctx, text, cx, y, maxW, maxPx, weight, align='center') {
  if (!text) return
  ctx.textAlign = align
  let sz = maxPx
  ctx.font = `${weight} ${sz}px "Space Grotesk",sans-serif`
  while (ctx.measureText(text).width > maxW && sz > 7) { sz--; ctx.font = `${weight} ${sz}px "Space Grotesk",sans-serif` }
  ctx.fillText(text, cx, y)
}

function fitSubtext(ctx, text, cx, y, maxW, lineH, size, align='center') {
  if (!text) return
  ctx.textAlign = align; ctx.font = `400 ${size}px Inter,sans-serif`
  const words = text.split(' '); let line='', cy=y, lines=0
  for (let i=0;i<words.length;i++) {
    const test = line+words[i]+' '
    if (ctx.measureText(test).width>maxW && i>0) {
      ctx.fillText(line.trim(),cx,cy); line=words[i]+' '; cy+=lineH; lines++
      if (lines>=1) {
        let last=(line+words.slice(i+1).join(' ')).trim()
        while(ctx.measureText(last+'…').width>maxW && last.length>2) last=last.slice(0,-1)
        ctx.fillText(last+(words.length>i+1?'…':''),cx,cy); return
      }
    } else line=test
  }
  ctx.fillText(line.trim(),cx,cy)
}

function drawLogo(ctx, w, h, logoImg, position, scale) {
  if (!logoImg) return
  const logoW = Math.max(16, w*scale)
  const logoH = (logoImg.height/logoImg.width)*logoW
  const pad = Math.max(8, w*0.032)
  let x, y
  switch(position) {
    case 'top-left':     x=pad;         y=pad; break
    case 'top-center':   x=(w-logoW)/2; y=pad; break
    case 'top-right':    x=w-logoW-pad; y=pad; break
    case 'bottom-left':  x=pad;         y=h-logoH-pad; break
    case 'bottom-right': x=w-logoW-pad; y=h-logoH-pad; break
    default:             x=w-logoW-pad; y=pad
  }
  ctx.drawImage(logoImg, x, y, logoW, logoH)
}

function withAlpha(hex, alpha) {
  const h = (hex||'#FFFFFF').replace('#','')
  const full = h.length===3 ? h.split('').map(c=>c+c).join('') : h
  const r = parseInt(full.substring(0,2),16), g = parseInt(full.substring(2,4),16), b = parseInt(full.substring(4,6),16)
  return `rgba(${r},${g},${b},${alpha})`
}

function renderBottomStrip(ctx,w,h,img,post,brand,accent,logoImg,logoPos,logoScale,sizes,cfg,textColor='#FFFFFF'){
  const ratio=cfg.splitRatio??0.62
  const imgH=Math.floor(h*ratio), stripY=imgH, stripH=h-imgH
  const alignL = cfg.align==='left'
  const pad = alignL?18:Math.max(12,w*0.07)
  const tw = w-(alignL?pad+12:pad*2)
  const tx = alignL?pad:w/2

  if(cfg.overallGradient){
    const bgGrad=ctx.createLinearGradient(0,0,w,h)
    bgGrad.addColorStop(0,'#0F0A1E');bgGrad.addColorStop(0.5,accent+'44');bgGrad.addColorStop(1,'#0F0A1E')
    ctx.fillStyle=bgGrad;ctx.fillRect(0,0,w,h)
  } else {
    ctx.fillStyle= cfg.bg==='navy'?'#1a0f3a':'#0F0A1E'
    ctx.fillRect(0,0,w,h)
  }

  if(img){
    ctx.save();ctx.beginPath();ctx.rect(0,0,w,imgH);ctx.clip()
    const s=Math.max(w/img.width,imgH/img.height)
    ctx.drawImage(img,(w-img.width*s)/2,(imgH-img.height*s)/2,img.width*s,img.height*s)
    ctx.restore()
  }

  if(cfg.bg==='solid'||cfg.bg==='navy'){
    const fadeColor = cfg.bg==='solid'?accent:'#1a0f3a'
    const fade=ctx.createLinearGradient(0,imgH-20,0,imgH+1)
    fade.addColorStop(0,'rgba(0,0,0,0)'); fade.addColorStop(1,fadeColor)
    ctx.fillStyle=fade; ctx.fillRect(0,imgH-20,w,22)
    ctx.fillStyle=fadeColor; ctx.fillRect(0,stripY,w,stripH)
  } else if(cfg.bg==='gradient'){
    const g=ctx.createLinearGradient(0,stripY-10,0,h)
    g.addColorStop(0,'rgba(10,5,24,0)'); g.addColorStop(0.2,'rgba(10,5,24,0.96)'); g.addColorStop(1,'#0a0518')
    ctx.fillStyle=g; ctx.fillRect(0,stripY-10,w,stripH+10)
  } else if(cfg.bg==='glass'){
    ctx.fillStyle=withAlpha(textColor,0.08); ctx.fillRect(0,stripY,w,stripH)
  }

  if(cfg.accentShape==='bar'){ ctx.fillStyle=accent; ctx.fillRect(0,stripY+2,3,stripH-4) }
  else if(cfg.accentShape==='topline'){ ctx.fillStyle=accent; ctx.fillRect(0,stripY,w,3) }
  else if(cfg.accentShape==='dot'){ ctx.beginPath(); ctx.arc(w/2,stripY+10,3,0,Math.PI*2); ctx.fillStyle=accent; ctx.fill() }

  let cy
  if(cfg.kicker){
    ctx.fillStyle= (cfg.bg==='solid')?withAlpha(textColor,0.55):accent
    ctx.textAlign=alignL?'left':'center'
    ctx.font=`700 ${Math.max(7,stripH*0.12)}px "Space Grotesk",sans-serif`
    ctx.fillText((brand?.industry??'').toUpperCase().slice(0,18), tx, stripY+stripH*0.18)
    cy = stripY+stripH*0.42
  } else {
    cy = stripY+stripH*0.40
  }

  ctx.fillStyle=textColor
  fitLine(ctx,post.headline??'',tx,cy,tw,Math.max(12,stripH*0.24)*(sizes?.headline??1),'800',alignL?'left':'center')
  ctx.fillStyle=withAlpha(textColor,0.78)
  fitSubtext(ctx,post.subtext??'',tx,cy+stripH*0.20,tw,stripH*0.14*(sizes?.subtext??1),Math.max(8,stripH*0.12)*(sizes?.subtext??1),alignL?'left':'center')

  if(cfg.cta==='pill'){
    const ctaW=Math.min(tw*0.6,140), ctaH=Math.max(18,stripH*0.16)
    const ctaX= alignL?pad:(w-ctaW)/2, ctaY=h-ctaH-10
    ctx.fillStyle= cfg.bg==='solid'?withAlpha(textColor,0.2):accent
    ctx.beginPath();ctx.roundRect(ctaX,ctaY,ctaW,ctaH,ctaH/2);ctx.fill()
    ctx.fillStyle=textColor
    fitLine(ctx,post.cta??'Learn More',ctaX+ctaW/2,ctaY+ctaH*0.66,ctaW-12,Math.max(7,ctaH*0.46)*(sizes?.cta??1),'700')
  } else if(cfg.cta==='text'){
    ctx.fillStyle=accent; ctx.textAlign=alignL?'left':'center'
    ctx.font=`700 ${Math.max(8,stripH*0.13)*(sizes?.cta??1)}px "Space Grotesk",sans-serif`
    const ctaText = alignL ? '→ '+(post.cta??'Learn More') : (post.cta??'Learn More').toUpperCase()
    ctx.fillText(ctaText, tx, h-14)
  }

  drawLogo(ctx,w,h,logoImg,logoPos,logoScale)
}

function renderSidePanel(ctx,w,h,img,post,brand,accent,logoImg,logoPos,logoScale,sizes,cfg,textColor='#FFFFFF'){
  const panelRatio=cfg.panelRatio??0.46
  const side=cfg.side??'right'
  const imgW = w*(1-panelRatio)
  ctx.fillStyle='#0F0A1E'; ctx.fillRect(0,0,w,h)
  const imgX = side==='right'?0:w-imgW
  if(img){
    ctx.save();ctx.beginPath();ctx.rect(imgX,0,imgW,h);ctx.clip()
    const s=Math.max(imgW/img.width,h/img.height)
    ctx.drawImage(img, imgX+(imgW-img.width*s)/2, (h-img.height*s)/2, img.width*s, img.height*s)
    ctx.restore()
  }
  const panelX = side==='right'?imgW:0
  const panelW = w-imgW
  ctx.fillStyle=accent; ctx.fillRect(panelX,0,panelW,h)
  if(cfg.bg==='diagonal'){
    ctx.beginPath()
    if(side==='right'){
      ctx.moveTo(panelX-18,0); ctx.lineTo(panelX+6,0); ctx.lineTo(panelX-12,h); ctx.lineTo(panelX-36,h)
    } else {
      ctx.moveTo(panelX+panelW-6,0); ctx.lineTo(panelX+panelW+18,0); ctx.lineTo(panelX+panelW+36,h); ctx.lineTo(panelX+panelW+12,h)
    }
    ctx.fillStyle=accent; ctx.fill()
  }
  const tx = panelX + panelW*0.12
  const tw = panelW*0.76
  ctx.fillStyle=withAlpha(textColor,0.55); ctx.textAlign='left'
  ctx.font=`600 ${Math.max(7,h*0.031)}px "Space Grotesk",sans-serif`
  ctx.fillText((brand?.industry??'').toUpperCase().slice(0,12), tx, h*0.16)
  ctx.fillStyle=textColor
  fitLine(ctx,post.headline??'',tx,h*0.30,tw,Math.max(11,h*0.066)*(sizes?.headline??1),'800','left')
  ctx.fillStyle=withAlpha(textColor,0.78)
  fitSubtext(ctx,post.subtext??'',tx,h*0.42,tw,h*0.048*(sizes?.subtext??1),Math.max(8,h*0.036)*(sizes?.subtext??1),'left')
  if(cfg.cta!=='none'){
    const ctaY=h*0.72, ctaH=h*0.09, ctaW=Math.min(tw,130)
    ctx.fillStyle=withAlpha(textColor,0.2); ctx.beginPath(); ctx.roundRect(tx,ctaY,ctaW,ctaH,4); ctx.fill()
    ctx.fillStyle=textColor
    fitLine(ctx,post.cta??'Learn More',tx+ctaW/2,ctaY+ctaH*0.65,ctaW-10,Math.max(7,h*0.033)*(sizes?.cta??1),'700')
  }
  drawLogo(ctx,w,h,logoImg,logoPos,logoScale)
}

function renderFullOverlay(ctx,w,h,img,post,brand,accent,logoImg,logoPos,logoScale,sizes,cfg,textColor='#FFFFFF'){
  ctx.fillStyle='#111'; ctx.fillRect(0,0,w,h)
  if(img){ const s=Math.max(w/img.width,h/img.height); ctx.drawImage(img,(w-img.width*s)/2,(h-img.height*s)/2,img.width*s,img.height*s) }

  if(cfg.scrim==='bottom'){
    const g=ctx.createLinearGradient(0,h*0.3,0,h); g.addColorStop(0,'rgba(0,0,0,0)'); g.addColorStop(0.5,'rgba(0,0,0,0.7)'); g.addColorStop(1,'rgba(0,0,0,0.92)')
    ctx.fillStyle=g; ctx.fillRect(0,h*0.3,w,h*0.7)
  } else if(cfg.scrim==='full'){
    ctx.fillStyle='rgba(0,0,0,0.55)'; ctx.fillRect(0,0,w,h)
  } else if(cfg.scrim==='vignette'){
    const v=ctx.createRadialGradient(w/2,h/2,h*0.2,w/2,h/2,h*0.85)
    v.addColorStop(0,'rgba(0,0,0,0)'); v.addColorStop(1,'rgba(0,0,0,0.7)')
    ctx.fillStyle=v; ctx.fillRect(0,0,w,h)
    const g2=ctx.createLinearGradient(0,h*0.55,0,h); g2.addColorStop(0,'rgba(0,0,0,0)'); g2.addColorStop(1,'rgba(0,0,0,0.85)')
    ctx.fillStyle=g2; ctx.fillRect(0,h*0.55,w,h*0.45)
  }

  const alignL = cfg.align==='left'
  const pad = alignL?16:w*0.07
  const tw = w-(alignL?pad+12:pad*2)
  const tx = alignL?pad:w/2
  const hY = cfg.textPos==='center'?h*0.44:h*0.48
  const sY = cfg.textPos==='center'?h*0.535:h*0.585
  const cY = cfg.textPos==='center'?h*0.635:h*0.70

  ctx.fillStyle=textColor
  fitLine(ctx,post.headline??'',tx,hY,tw,Math.max(13,h*0.07)*(sizes?.headline??1),'800',alignL?'left':'center')
  ctx.fillStyle=withAlpha(textColor,0.78)
  fitSubtext(ctx,post.subtext??'',tx,sY,tw,h*0.045*(sizes?.subtext??1),Math.max(9,h*0.038)*(sizes?.subtext??1),alignL?'left':'center')

  if(cfg.cta!=='none'){
    ctx.fillStyle=accent; ctx.font=`700 ${Math.max(8,h*0.036)*(sizes?.cta??1)}px "Space Grotesk",sans-serif`
    ctx.textAlign=alignL?'left':'center'
    ctx.fillText((post.cta??'Learn More').toUpperCase(), tx, cY)
  }

  ctx.fillStyle=withAlpha(textColor,0.85); ctx.textAlign='left'
  ctx.font=`600 ${Math.max(7,h*0.03)}px "Space Grotesk",sans-serif`
  ctx.fillText((brand?.industry??'').toUpperCase().slice(0,16), 12, 20)

  drawLogo(ctx,w,h,logoImg,logoPos,logoScale)
}

function renderFramedBorder(ctx,w,h,img,post,brand,accent,logoImg,logoPos,logoScale,sizes,cfg,textColor='#FFFFFF'){
  ctx.fillStyle=accent; ctx.fillRect(0,0,w,h)
  const bw = cfg.borderWidth??10
  const innerX=bw, innerY=bw, innerW=w-bw*2, innerH=h-bw*2
  ctx.fillStyle='#0F0A1E'; ctx.fillRect(innerX,innerY,innerW,innerH)
  const imgRatio = cfg.imgRatio??0.62
  const imgH = innerH*imgRatio
  if(img){
    ctx.save(); ctx.beginPath(); ctx.rect(innerX,innerY,innerW,imgH); ctx.clip()
    const s=Math.max(innerW/img.width, imgH/img.height)
    ctx.drawImage(img, innerX+(innerW-img.width*s)/2, innerY+(imgH-img.height*s)/2, img.width*s, img.height*s)
    ctx.restore()
  }
  const stripY = innerY+imgH, stripH = innerH-imgH
  ctx.fillStyle='#0F0A1E'; ctx.fillRect(innerX,stripY,innerW,stripH)
  const tw=innerW-28
  ctx.fillStyle=accent; ctx.textAlign='center'
  ctx.font=`600 ${Math.max(7,stripH*0.12)}px "Space Grotesk",sans-serif`
  ctx.fillText((brand?.industry??'').toUpperCase().slice(0,18), innerX+innerW/2, stripY+stripH*0.22)
  ctx.fillStyle=textColor
  fitLine(ctx,post.headline??'',innerX+innerW/2,stripY+stripH*0.48,tw,Math.max(11,stripH*0.22)*(sizes?.headline??1),'800')
  ctx.fillStyle=withAlpha(textColor,0.72)
  fitSubtext(ctx,post.subtext??'',innerX+innerW/2,stripY+stripH*0.68,tw,stripH*0.13*(sizes?.subtext??1),Math.max(8,stripH*0.11)*(sizes?.subtext??1))
  drawLogo(ctx,w,h,logoImg,logoPos,logoScale)
}

function renderPhoneMockup(ctx,w,h,img,post,brand,accent,logoImg,logoPos,logoScale,sizes,cfg,textColor='#FFFFFF'){
  const bg=ctx.createLinearGradient(0,0,w,h)
  bg.addColorStop(0,'#0F0A1E'); bg.addColorStop(1,accent+'33')
  ctx.fillStyle=bg; ctx.fillRect(0,0,w,h)

  let phoneH = h*0.60
  let phoneW = phoneH/2.05
  if(phoneW > w*0.48){ phoneW = w*0.48; phoneH = phoneW*2.05 }
  const phoneX = (w-phoneW)/2
  const phoneY = h*0.05
  const bezel = Math.max(4, phoneW*0.05)
  const radius = phoneW*0.16

  ctx.fillStyle='#111'
  ctx.beginPath()
  ctx.roundRect(phoneX,phoneY,phoneW,phoneH,radius)
  ctx.fill()

  const scrX=phoneX+bezel, scrY=phoneY+bezel, scrW=phoneW-bezel*2, scrH=phoneH-bezel*2
  ctx.save()
  ctx.beginPath()
  ctx.roundRect(scrX,scrY,scrW,scrH,radius*0.7)
  ctx.clip()
  if(img){
    const s=Math.max(scrW/img.width, scrH/img.height)
    ctx.drawImage(img, scrX+(scrW-img.width*s)/2, scrY+(scrH-img.height*s)/2, img.width*s, img.height*s)
  } else {
    ctx.fillStyle=accent; ctx.fillRect(scrX,scrY,scrW,scrH)
  }
  ctx.restore()

  const notchW=phoneW*0.32, notchH=phoneW*0.07
  ctx.fillStyle='#111'
  ctx.beginPath()
  ctx.roundRect(phoneX+(phoneW-notchW)/2, scrY+2, notchW, notchH, notchH/2)
  ctx.fill()

  const textY = phoneY+phoneH+h*0.03
  const textH = h - textY - h*0.02
  const tw = w*0.82
  ctx.fillStyle=textColor; ctx.textAlign='center'
  fitLine(ctx,post.headline??'',w/2,textY+textH*0.32,tw,Math.max(11,textH*0.32)*(sizes?.headline??1),'800')
  ctx.fillStyle=withAlpha(textColor,0.75)
  fitSubtext(ctx,post.subtext??'',w/2,textY+textH*0.58,tw,textH*0.2*(sizes?.subtext??1),Math.max(8,textH*0.17)*(sizes?.subtext??1))
  if(cfg.cta!=='none'){
    ctx.fillStyle=accent; ctx.font=`700 ${Math.max(8,textH*0.19)*(sizes?.cta??1)}px "Space Grotesk",sans-serif`
    ctx.fillText((post.cta??'Learn More').toUpperCase(), w/2, textY+textH*0.86)
  }
  drawLogo(ctx,w,h,logoImg,logoPos,logoScale)
}

const RENDERERS = { bottomStrip: renderBottomStrip, sidePanel: renderSidePanel, fullOverlay: renderFullOverlay, framedBorder: renderFramedBorder, phoneMockup: renderPhoneMockup }

function makeDraw(layout, style) {
  return (ctx,w,h,img,post,brand,accent,logoImg,logoPos,logoScale,sizes,textColor) => RENDERERS[layout](ctx,w,h,img,post,brand,accent,logoImg,logoPos,logoScale,sizes,style,textColor)
}

const TEMPLATES_RAW = [
  { id:'bright', label:'Bright Strip', family:'Minimal', accent:'#7C3AED', layout:'bottomStrip', style:{splitRatio:0.63,bg:'solid',align:'center',cta:'none',accentShape:'none',kicker:true}, preview:{type:'strip',ratio:0.63} },
  { id:'dark', label:'Dark Strip', family:'Bold/Editorial', accent:'#06B6D4', layout:'bottomStrip', style:{splitRatio:0.60,bg:'gradient',align:'left',cta:'text',accentShape:'bar',kicker:true}, preview:{type:'strip',ratio:0.60} },
  { id:'duo', label:'Duo Strip', family:'Text-led', accent:'#F472B6', layout:'bottomStrip', style:{splitRatio:0.65,bg:'navy',align:'center',cta:'text',accentShape:'topline',kicker:false}, preview:{type:'strip',ratio:0.65} },
  { id:'gradient', label:'Gradient Frame', family:'Gradient', accent:'#10B981', layout:'bottomStrip', style:{splitRatio:0.60,bg:'glass',align:'center',cta:'pill',accentShape:'topline',kicker:false,overallGradient:true}, preview:{type:'strip',ratio:0.60} },
  { id:'soft-pastel', label:'Soft Pastel', family:'Minimal', accent:'#A78BFA', layout:'bottomStrip', style:{splitRatio:0.60,bg:'glass',align:'center',cta:'pill',accentShape:'dot',kicker:true}, preview:{type:'strip',ratio:0.60} },
  { id:'editorial-bold', label:'Editorial Bold', family:'Bold/Editorial', accent:'#EF4444', layout:'bottomStrip', style:{splitRatio:0.55,bg:'navy',align:'left',cta:'pill',accentShape:'bar',kicker:true}, preview:{type:'strip',ratio:0.55} },
  { id:'statement', label:'Statement', family:'Text-led', accent:'#FBBF24', layout:'bottomStrip', style:{splitRatio:0.45,bg:'solid',align:'center',cta:'text',accentShape:'none',kicker:false}, preview:{type:'strip',ratio:0.45} },
  { id:'side-right', label:'Side Panel', family:'Bold/Editorial', accent:'#3B82F6', layout:'sidePanel', style:{panelRatio:0.46,side:'right',bg:'solid',cta:'pill'}, preview:{type:'side',side:'right'} },
  { id:'side-diagonal', label:'Diagonal Panel', family:'Gradient', accent:'#EC4899', layout:'sidePanel', style:{panelRatio:0.48,side:'right',bg:'diagonal',cta:'pill'}, preview:{type:'side',side:'right'} },
  { id:'bold', label:'Bold Overlay', family:'Photo-led', accent:'#F59E0B', layout:'fullOverlay', style:{scrim:'bottom',textPos:'bottom',align:'center',cta:'text'}, preview:{type:'overlay'} },
  { id:'vignette', label:'Vignette Frame', family:'Photo-led', accent:'#8B5CF6', layout:'fullOverlay', style:{scrim:'vignette',textPos:'bottom',align:'left',cta:'text'}, preview:{type:'overlay'} },
  { id:'center-statement', label:'Center Statement', family:'Text-led', accent:'#14B8A6', layout:'fullOverlay', style:{scrim:'full',textPos:'center',align:'center',cta:'text'}, preview:{type:'overlay'} },
  { id:'framed', label:'Framed Card', family:'Minimal', accent:'#F97316', layout:'framedBorder', style:{borderWidth:10,imgRatio:0.62}, preview:{type:'framed'} },
  { id:'app-screen', label:'App Screen', family:'Device', accent:'#6366F1', layout:'phoneMockup', style:{cta:'text'}, preview:{type:'phone'} },
]

const TEMPLATES = TEMPLATES_RAW.map(t => ({ ...t, draw: makeDraw(t.layout, t.style) }))

function TemplateThumb({ tmpl }) {
  const p = tmpl.preview
  if (p.type === 'overlay') {
    return (
      <div className="tmpl-thumb tmpl-thumb-overlay">
        <div className="tmpl-thumb-img" style={{height:'100%'}} />
        <div className="tmpl-thumb-scrim" />
        <div className="tmpl-thumb-line" style={{background:tmpl.accent}} />
      </div>
    )
  }
  if (p.type === 'side') {
    return (
      <div className="tmpl-thumb tmpl-thumb-side" style={{flexDirection: p.side==='right'?'row':'row-reverse'}}>
        <div className="tmpl-thumb-img" style={{width:'55%',height:'100%'}} />
        <div className="tmpl-thumb-panel" style={{width:'45%',height:'100%',background:tmpl.accent}} />
      </div>
    )
  }
  if (p.type === 'framed') {
    return (
      <div className="tmpl-thumb tmpl-thumb-framed" style={{background:tmpl.accent}}>
        <div className="tmpl-thumb-framed-inner">
          <div className="tmpl-thumb-img" style={{height:'62%'}} />
          <div className="tmpl-thumb-strip" style={{height:'38%',background:'#0F0A1E'}} />
        </div>
      </div>
    )
  }
  if (p.type === 'phone') {
    return (
      <div className="tmpl-thumb tmpl-thumb-phone-wrap" style={{background:`linear-gradient(135deg,#2a2040,${tmpl.accent}55)`}}>
        <div className="tmpl-thumb-phone"><div className="tmpl-thumb-phone-notch" /></div>
      </div>
    )
  }
  return (
    <div className="tmpl-thumb">
      <div className="tmpl-thumb-img" style={{height:`${p.ratio*100}%`}} />
      <div className="tmpl-thumb-strip" style={{height:`${(1-p.ratio)*100}%`,background:tmpl.accent}} />
    </div>
  )
}

export default function PostStudio({ brand, assets, onAssetsChange, selectedTrend, onNavigate }) {
  const [step, setStep] = useState(0)
  const [activeFamily, setActiveFamily] = useState('All')
  const [selectedTemplateId, setSelectedTemplateId] = useState(null)

  const [productType, setProductType] = useState('physical')
  const [showProductDetails, setShowProductDetails] = useState(false)
  const [productUrl, setProductUrl] = useState('')
  const [productQuery, setProductQuery] = useState('')
  const [productInfo, setProductInfo] = useState(null)
  const [scrapingProduct, setScrapingProduct] = useState(false)
  const [searchingProduct, setSearchingProduct] = useState(false)
  const [productError, setProductError] = useState('')

  const [photoId, setPhotoId] = useState(null)
  const [photoUrl, setPhotoUrl] = useState('')
  const [platform, setPlatform] = useState(selectedTrend?.platform ?? 'Instagram')
  const [formatIdx, setFormatIdx] = useState(0)

  const [sceneMode, setSceneMode] = useState(null)
  const [scenes, setScenes] = useState([])
  const [loadingScenes, setLoadingScenes] = useState(false)
  const [chosenScene, setChosenScene] = useState(null)
  const [customScene, setCustomScene] = useState('')
  const [generatingAI, setGeneratingAI] = useState(false)
  const [aiImageUrl, setAiImageUrl] = useState(null)
  const [aiError, setAiError] = useState('')
  const [analyzingColors, setAnalyzingColors] = useState(false)
  const [colorAnalysis, setColorAnalysis] = useState(null)

  const [generatingPosts, setGeneratingPosts] = useState(false)
  const [posts, setPosts] = useState([])
  const [chosen, setChosen] = useState(null)
  const [editing, setEditing] = useState(null)
  const [editVal, setEditVal] = useState('')
  const [accentColors, setAccentColors] = useState(TEMPLATES.map(t=>t.accent))
  const [textColor, setTextColor] = useState('#FFFFFF')
  const [colorSource, setColorSource] = useState('ai')
  const [textSizes, setTextSizes] = useState({})
  const getSizes = (idx) => textSizes[idx] || DEFAULT_TEXT_SIZES
  const setSize = (idx, field, val) => setTextSizes(prev => ({ ...prev, [idx]: { ...(prev[idx]||DEFAULT_TEXT_SIZES), [field]: val } }))

  const [logoOverrideUrl, setLogoOverrideUrl] = useState(null)
  const [logoPosition, setLogoPosition] = useState('top-right')
  const [logoSizeId, setLogoSizeId] = useState('small')
  const [showLogo, setShowLogo] = useState(false)
  const logoFileRef = useRef()

  useEffect(() => { if (brand?.logo && !logoOverrideUrl) setShowLogo(true) }, [brand?.logo])

  const logoUrl = logoOverrideUrl || brand?.logo || null
  const logoScale = LOGO_SIZES.find(s=>s.id===logoSizeId)?.scale ?? 0.12

  const canvasRefs = useRef({})
  const imgCache = useRef({})
  const fileRef = useRef()
  const fmt = FORMATS[formatIdx]
  const photo = assets.find(a => a.id === photoId)
  const selectedTemplate = TEMPLATES.find(t => t.id === selectedTemplateId) ?? TEMPLATES[0]

  const loadImage = useCallback((url) => new Promise((resolve) => {
    if (!url) { resolve(null); return }
    if (imgCache.current[url]) { resolve(imgCache.current[url]); return }
    const img = new window.Image()
    if (!url.startsWith('data:') && !url.startsWith('blob:')) img.crossOrigin='anonymous'
    img.onload = () => { imgCache.current[url]=img; resolve(img) }
    img.onerror = () => resolve(null)
    img.src = url
  }), [])

  const handleUpload = (files) => {
    Array.from(files).forEach(f => {
      const reader = new FileReader()
      reader.onload = e => {
        const asset = { id:Date.now()+Math.random(), name:f.name, url:e.target.result, type:f.type, tags:[], caption:'', isAI:false }
        onAssetsChange(prev => [asset, ...prev])
        setPhotoId(asset.id); setPhotoUrl(''); setAiImageUrl(null)
      }
      reader.readAsDataURL(f)
    })
  }

  const handleLogoUpload = (files) => {
    const f = files[0]; if (!f) return
    const reader = new FileReader()
    reader.onload = e => { setLogoOverrideUrl(e.target.result); setShowLogo(true) }
    reader.readAsDataURL(f)
  }

  const analyzeImageColors = async (imageUrl) => {
    setAnalyzingColors(true); setColorAnalysis(null)
    try {
      const result = await callClaude({
        system:'You are a visual design expert. Analyze product photography and suggest accent colors for social media text strip overlays. Return JSON only.',
        messages:[{ role:'user', content:[
          { type:'image', source:{ type:'url', url:imageUrl } },
          { type:'text', text:'Analyze this product lifestyle photo. Recommend 5 accent colors that complement it for social media text strips. Colors must contrast well with white text. Return JSON only: {"accentColors":["#hex1","#hex2","#hex3","#hex4","#hex5"],"imageTone":"warm|cool|neutral|vibrant","reasoning":"one sentence"}' }
        ]}],
        max_tokens:250
      })
      const parsed = extractJSON(result)
      if (parsed.accentColors?.length >= 3) {
        const colors = parsed.accentColors.slice(0,5)
        while(colors.length < 5) colors.push(TEMPLATES[colors.length].accent)
        setAccentColors(colors); setColorAnalysis(parsed)
      }
    } catch(e) { console.log('Color analysis skipped') }
    setAnalyzingColors(false)
  }

  const scrapeProductUrl = async () => {
    if (!productUrl) return
    setScrapingProduct(true); setProductInfo(null); setProductError('')
    try {
      const res = await fetch('/api/scrape-product', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({url:productUrl}) })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setProductInfo(data.product)
    } catch(e) { setProductError(e.message||'Could not read this URL.') }
    setScrapingProduct(false)
  }

  const searchProductByName = async () => {
    if (!productQuery) return
    setSearchingProduct(true); setProductInfo(null); setProductError('')
    try {
      const result = await callClaude({
        system:'Search for the product and return JSON only: {"name":"...","brand":"...","tagline":"...","description":"...","benefits":["...","...","..."],"idealFor":"...","callToAction":"..."}',
        messages:[{role:'user',content:`Search for and summarise: ${productQuery}`}],
        tools:[{type:'web_search_20250305',name:'web_search'}], max_tokens:800
      })
      setProductInfo(extractJSON(result))
    } catch { setProductError('Could not find that product.') }
    setSearchingProduct(false)
  }

  const fetchScenes = async () => {
    setLoadingScenes(true); setScenes([]); setChosenScene(null)
    try {
      const productCtx = productInfo ? `Product: ${productInfo.name}. ${productInfo.description?.slice(0,100)}.` : `Brand: ${brand?.name??''}, Industry: ${brand?.industry??''}`
      const seed = Math.floor(Math.random() * 100000)
      const systemPrompt = productType === 'digital'
        ? 'You are a creative director for digital app/service marketing. Search for current trending visual styles for app and digital service marketing on the specified platform. Propose 3 OUTCOME-FOCUSED lifestyle scene concepts that represent the FEELING or RESULT of using this app/service - NOT literal screenshots or device mockups. Show a person experiencing the benefit in a real-world setting. Return JSON only: { "scenes": [{ "label": "4 word label", "prompt": "Highly detailed lifestyle scene description - a person in a real setting experiencing the outcome/benefit of this app, NO phone screens or UI shown", "mood": "one word", "trendSource": "brief note" }] } - exactly 3 scenes, genuinely different.'
        : 'You are a creative director for social media advertising. Search for current real trending visual styles for this product category. Propose 3 scene concepts inspired by what is ACTUALLY trending right now. Return JSON only: { "scenes": [{ "label": "4 word label", "prompt": "Highly detailed specific scene description for AI image generation", "mood": "one word", "trendSource": "brief note" }] } - exactly 3 scenes, genuinely different.'
      const userPrompt = productType === 'digital'
        ? `Platform: ${platform}. ${productCtx}. Search for trending lifestyle content styles on ${platform} right now. Suggest 3 scenes showing the OUTCOME of using this app. Variation seed: ${seed}.`
        : `Platform: ${platform}. ${productCtx}. Search for trending visual styles on ${platform} right now. Variation seed: ${seed}.`
      const result = await callClaude({
        system: systemPrompt,
        messages: [{ role:'user', content: userPrompt }],
        tools: [{ type:'web_search_20250305', name:'web_search' }],
        max_tokens: 900
      })
      const parsed = extractJSON(result)
      setScenes(parsed.scenes??[])
      if (parsed.scenes?.[0]) { setChosenScene(0); setCustomScene(parsed.scenes[0].prompt) }
    } catch { setScenes([]) }
    setLoadingScenes(false)
  }

  const generateAiImage = async () => {
    const hasPhoto = (photo || photoUrl) && productType === 'physical'
    setGeneratingAI(true); setAiImageUrl(null); setAiError(''); setColorAnalysis(null)
    try {
      const prompt = customScene || scenes[chosenScene]?.prompt || 'professional lifestyle photography, clean natural light'
      let body = { prompt, mode:'create' }
      if (hasPhoto) {
        body.mode='edit'; body.productName=productInfo?.name||photo?.name||'product'
        if (photoUrl) { body.imageUrl=photoUrl }
        else if (photo) { body.imageBase64=photo.url.startsWith('data:')?photo.url:await toBase64(photo.url); body.imageType=photo.type||'image/jpeg' }
      }
      const res = await fetch('/api/generate-image', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body) })
      const data = await res.json()
      if (!res.ok||data.error) throw new Error(data.error||'Image generation failed')
      setAiImageUrl(data.url); imgCache.current={}
      analyzeImageColors(data.url)
    } catch(e) { setAiError(e.message||'Check your FAL_KEY in Vercel.') }
    setGeneratingAI(false)
  }

  const generatePosts = async () => {
    setGeneratingPosts(true); setPosts([])
    try {
      const brandCtx = brand ? `Brand: ${brand.name}. Industry: ${brand.industry}. Tone: ${brand.tone}.` : ''
      const productCtx = productInfo ? `Product: ${productInfo.name}. Tagline: ${productInfo.tagline}. Description: ${productInfo.description}. Benefits: ${productInfo.benefits?.join('; ')}. Ideal for: ${productInfo.idealFor}.` : ''
      const result = await callClaude({
        system:'Social media copywriter. Return JSON only: {"posts":[{"headline":"max 5 words","subtext":"max 10 words","caption":"full caption with emojis","hashtags":["tag1","tag2","tag3","tag4","tag5"],"cta":"2-3 words"}]} — exactly 3 variations with different angles.',
        messages:[{role:'user',content:`${brandCtx} ${productCtx} Platform: ${platform}. Create 3 post copy variations.`}],
        max_tokens:1200
      })
      const parsed = extractJSON(result)
      setPosts(parsed.posts.slice(0,3)); setStep(3)
    } catch(e) { console.error(e) }
    setGeneratingPosts(false)
  }

  const renderCanvas = useCallback(async (idx) => {
    const canvas = canvasRefs.current[idx]
    if (!canvas||!posts[idx]) return
    const ctx = canvas.getContext('2d')
    const {pw,ph} = fmt
    const accent = accentColors[0]
    const imageUrl = aiImageUrl||photo?.url||null
    const img = imageUrl ? await loadImage(imageUrl) : null
    const logoImg = (showLogo&&logoUrl) ? await loadImage(logoUrl) : null
    selectedTemplate.draw(ctx,pw,ph,img,posts[idx],brand,accent,logoImg,logoPosition,logoScale,getSizes(idx),textColor)
  }, [posts,fmt,aiImageUrl,photo,brand,accentColors,showLogo,logoUrl,logoPosition,logoScale,loadImage,textSizes,selectedTemplate,textColor])

  useEffect(() => { if(posts.length) posts.forEach((_,i)=>setTimeout(()=>renderCanvas(i),100+i*80)) }, [posts,renderCanvas])
  useEffect(() => { if(posts.length&&colorAnalysis) posts.forEach((_,i)=>setTimeout(()=>renderCanvas(i),50+i*60)) }, [accentColors])
  useEffect(() => { if(posts.length) posts.forEach((_,i)=>setTimeout(()=>renderCanvas(i),50+i*50)) }, [showLogo,logoUrl,logoPosition,logoScale])
  useEffect(() => { if(posts.length) posts.forEach((_,i)=>setTimeout(()=>renderCanvas(i),40+i*40)) }, [textSizes])
  useEffect(() => { if(posts.length) posts.forEach((_,i)=>setTimeout(()=>renderCanvas(i),35+i*35)) }, [textColor])
  useEffect(() => {
    if (colorSource === 'brand' && brand?.colors?.length > 0) {
      const bc = brand.colors
      setAccentColors(TEMPLATES.map((_, i) => bc[i % bc.length]))
    } else if (colorSource === 'ai' && colorAnalysis?.accentColors) {
      const ac = colorAnalysis.accentColors
      setAccentColors(TEMPLATES.map((_, i) => ac[i % ac.length]))
    }
  }, [colorSource, brand?.colors, colorAnalysis])

  const startEdit = (idx,field,current) => { setEditing({idx,field}); setEditVal(current??'') }
  const saveEdit = () => {
    if(!editing) return
    setPosts(prev => prev.map((p,i) => i===editing.idx ? {...p,[editing.field]:editVal} : p))
    setEditing(null)
  }

  const download = async (idx) => {
    const off=document.createElement('canvas'); off.width=fmt.pw*2; off.height=fmt.ph*2
    const ctx=off.getContext('2d'); ctx.scale(2,2)
    const imageUrl=aiImageUrl||photo?.url||null; const img=imageUrl?await loadImage(imageUrl):null
    const logoImg=(showLogo&&logoUrl)?await loadImage(logoUrl):null
    selectedTemplate.draw(ctx,fmt.pw,fmt.ph,img,posts[idx],brand,accentColors[0],logoImg,logoPosition,logoScale,getSizes(idx),textColor)
    const a=document.createElement('a'); a.download=`brandpulse-${selectedTemplate.id}-${Date.now()}.png`; a.href=off.toDataURL('image/png'); a.click()
  }

  const reset = () => {
    setStep(0); setSelectedTemplateId(null); setActiveFamily('All')
    setPosts([]); setChosen(null); setProductInfo(null); setProductUrl(''); setProductQuery('')
    setAiImageUrl(null); setPhotoUrl(''); setScenes([]); setChosenScene(null); setCustomScene('')
    setColorAnalysis(null); setSceneMode(null)
    setAccentColors(TEMPLATES.map(t=>t.accent))
  }

  const visibleTemplates = activeFamily === 'All' ? TEMPLATES : TEMPLATES.filter(t => t.family === activeFamily)

  return (
    <div className="page">
      <div className="page-header">
        <Palette size={24} className="page-icon-violet"/>
        <div><h2>Post Studio</h2><p>Choose a template, add your asset, set the scene, then finish in Studio.</p></div>
      </div>

      <div className="steps-bar">
        {STEPS.map((s,i)=>(
          <div key={s} className={`step ${i===step?'active':''} ${i<step?'done':''}`}>
            <div className="step-num">{i<step?<Check size={12}/>:i+1}</div><span>{s}</span>
            {i<STEPS.length-1&&<ChevronRight size={14} className="step-arrow"/>}
          </div>
        ))}
      </div>

      {step===0 && (
        <div className="studio-step animate-slide-up">
          <div className="card form-card">
            <h3>Choose a template</h3>
            <p className="form-hint">Pick the layout style for your post — you'll add your photo and scene next.</p>
            <div className="family-tabs">
              {FAMILIES.map(f => (
                <button key={f} className={`chip ${activeFamily===f?'chip-active':''}`} onClick={()=>setActiveFamily(f)}>{f}</button>
              ))}
            </div>
          </div>

          <div className="template-gallery">
            {visibleTemplates.map(t => (
              <div key={t.id} className={`template-card ${selectedTemplateId===t.id?'selected':''}`} onClick={()=>setSelectedTemplateId(t.id)}>
                <TemplateThumb tmpl={t} />
                <div className="template-card-footer">
                  <span className="template-card-label">{t.label}</span>
                  <span className="template-card-family">{t.family}</span>
                </div>
                {selectedTemplateId===t.id && <div className="template-card-check"><Check size={14}/></div>}
              </div>
            ))}
          </div>

          <div className="step-nav">
            <span style={{fontSize:12,color:'var(--text-lo)'}}>{selectedTemplateId?`✓ ${selectedTemplate.label} selected`:'Select a template to continue'}</span>
            <button className="btn btn-primary" onClick={()=>setStep(1)} disabled={!selectedTemplateId}>
              Next — Asset <ChevronRight size={16}/>
            </button>
          </div>
        </div>
      )}

      {step===1 && (
        <div className="studio-step animate-slide-up">
          <div className="card form-card">
            <h3>What are you promoting?</h3>
            <div className="product-type-toggle">
              <button className={`product-type-btn ${productType==='physical'?'active':''}`} onClick={()=>setProductType('physical')}>
                <Package size={18}/><span>Physical Product</span><p>Real photo, AI-enhanced scene</p>
              </button>
              <button className={`product-type-btn ${productType==='digital'?'active':''}`} onClick={()=>setProductType('digital')}>
                <Sparkles size={18}/><span>Digital App / Service</span><p>No photo needed — AI generates lifestyle scenes</p>
              </button>
            </div>
          </div>

          <div className="card form-card">
            <button className="collapsible-header" onClick={()=>setShowProductDetails(v=>!v)}>
              <span><Package size={14}/> Product details <span style={{color:'var(--text-lo)',fontWeight:400}}>(optional — improves captions)</span></span>
              <ChevronRight size={14} style={{transform:showProductDetails?'rotate(90deg)':'none',transition:'transform 0.15s'}}/>
            </button>
            {showProductDetails && (
              <div className="animate-slide-up" style={{display:'flex',flexDirection:'column',gap:14,marginTop:12}}>
                <div className="scan-row">
                  <input value={productUrl} onChange={e=>setProductUrl(e.target.value)} placeholder="Paste product/app page URL" onKeyDown={e=>e.key==='Enter'&&scrapeProductUrl()}/>
                  <button className="btn btn-primary" onClick={scrapeProductUrl} disabled={scrapingProduct||!productUrl}>
                    {scrapingProduct?<span className="spinner"/>:<><Sparkles size={14}/> Read Page</>}
                  </button>
                </div>
                <div className="scan-row">
                  <input value={productQuery} onChange={e=>setProductQuery(e.target.value)} placeholder="Or search by name" onKeyDown={e=>e.key==='Enter'&&searchProductByName()}/>
                  <button className="btn btn-secondary" onClick={searchProductByName} disabled={searchingProduct||!productQuery}>
                    {searchingProduct?<span className="spinner"/>:<><Search size={14}/> Search</>}
                  </button>
                </div>
                {productError&&<p className="scan-error">{productError}</p>}
                {productInfo&&(
                  <div className="product-result-card card" style={{margin:0}}>
                    <div className="product-result-header">
                      <div><strong className="product-result-name">{productInfo.name}</strong>{productInfo.brand&&<span className="product-result-brand"> by {productInfo.brand}</span>}</div>
                      <button onClick={()=>setProductInfo(null)} className="product-result-clear"><X size={14}/></button>
                    </div>
                    {productInfo.tagline&&<p className="product-tagline">"{productInfo.tagline}"</p>}
                    {productInfo.description&&<p className="product-summary">{productInfo.description}</p>}
                  </div>
                )}
              </div>
            )}
          </div>

          {productType==='physical' ? (
            <div className="card form-card">
              <h3><Image size={15}/> Product photo</h3>
              <p className="form-hint">Upload a photo OR paste a direct image URL. Flux Kontext keeps your product exactly as is.</p>
              <div className="scan-row">
                <input value={photoUrl} onChange={e=>{setPhotoUrl(e.target.value);if(e.target.value){setPhotoId(null);setAiImageUrl(null)}}} placeholder="Paste product image URL"/>
                {photoUrl&&<button className="btn-ghost" onClick={()=>setPhotoUrl('')}><X size={14}/></button>}
              </div>
              <div style={{display:'flex',alignItems:'center',gap:10}}><div style={{flex:1,height:1,background:'var(--border)'}}/><span style={{fontSize:11,color:'var(--text-lo)'}}>or upload</span><div style={{flex:1,height:1,background:'var(--border)'}}/></div>
              <button className="btn btn-secondary" onClick={()=>fileRef.current.click()} style={{alignSelf:'flex-start'}}><Upload size={14}/> Upload Photo</button>
              <input ref={fileRef} type="file" accept="image/*" style={{display:'none'}} onChange={e=>handleUpload(e.target.files)}/>
              {assets.filter(a=>!a.isAI).length>0&&(
                <div>
                  <p style={{fontSize:11,color:'var(--text-lo)',marginBottom:6}}>Your saved photos</p>
                  <div className="asset-picker-grid">
                    {assets.filter(a=>!a.isAI).map(a=>(
                      <div key={a.id} className={`asset-picker-item ${photoId===a.id&&!photoUrl?'selected':''}`} onClick={()=>{setPhotoId(a.id);setPhotoUrl('');setAiImageUrl(null)}}>
                        <img src={a.url} alt={a.name} className="picker-thumb"/>
                        {photoId===a.id&&!photoUrl&&<div className="picker-check"><Check size={14}/></div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {photoUrl&&<div className="url-preview animate-slide-up"><img src={photoUrl} alt="Product" className="url-preview-img" onError={e=>e.target.style.display='none'}/><p style={{fontSize:11,color:'var(--success)'}}>✓ Image URL ready</p></div>}
            </div>
          ) : (
            <div className="card form-card">
              <h3><Sparkles size={15} style={{color:'var(--gold)'}}/> Digital product — no photo needed</h3>
              <p className="form-hint">BrandPulse will generate an outcome-focused lifestyle scene representing the feeling or result of using your app/service. No screenshots or device mockups.</p>
            </div>
          )}

          <div className="step-nav">
            <button className="btn btn-secondary" onClick={()=>setStep(0)}><ChevronLeft size={14}/> Back</button>
            <button className="btn btn-primary" onClick={()=>setStep(2)}
              disabled={productType==='physical' && !photo && !photoUrl}>
              Next — Scene <ChevronRight size={16}/>
            </button>
          </div>
        </div>
      )}

      {step===2 && (
        <div className="studio-step animate-slide-up">
          <div className="card form-card">
            <h3><Wand2 size={15} style={{color:'var(--gold)'}}/> How should we set the scene?</h3>
            <div className="scene-mode-toggle">
              <button className={`scene-mode-btn ${sceneMode==='manual'?'active':''}`} onClick={()=>{setSceneMode('manual');setScenes([]);setChosenScene(null)}}>
                <PenLine size={18}/><span>Describe it myself</span><p>Write your own scene prompt</p>
              </button>
              <button className={`scene-mode-btn ${sceneMode==='trend'?'active':''}`} onClick={()=>{setSceneMode('trend');setCustomScene('')}}>
                <TrendingUp size={18}/><span>Show me what's trending</span><p>AI searches real current trends</p>
              </button>
            </div>
          </div>

          {sceneMode && (
            <div className="card form-card animate-slide-up">
              <div className="field"><label>Platform</label>
                <div className="chip-grid">{PLATFORMS.map(p=><button key={p} className={`chip ${platform===p?'chip-active':''}`} onClick={()=>setPlatform(p)}>{p}</button>)}</div>
              </div>
              <div className="field"><label>Format</label>
                <div className="chip-grid">{FORMATS.map((f,i)=><button key={f.id} className={`chip ${formatIdx===i?'chip-active':''}`} onClick={()=>setFormatIdx(i)}>{f.label}</button>)}</div>
              </div>

              {sceneMode==='trend' && (
                <>
                  {scenes.length===0?(
                    <button className="btn btn-secondary" onClick={fetchScenes} disabled={loadingScenes}>
                      {loadingScenes?<><span className="spinner"/> Searching trends…</>:<><TrendingUp size={14}/> Get Scene Ideas</>}
                    </button>
                  ):(
                    <div className="scene-options">
                      {scenes.map((s,i)=>(
                        <button key={i} className={`scene-chip ${chosenScene===i?'scene-active':''}`} onClick={()=>{setChosenScene(i);setCustomScene(s.prompt)}}>
                          <strong>{s.label}</strong><span className={`mood-tag mood-${i}`}>{s.mood}</span>
                        </button>
                      ))}
                      <button className="btn-ghost" style={{fontSize:11}} onClick={fetchScenes}>↻ Different ideas</button>
                    </div>
                  )}
                </>
              )}

              <div className="field">
                <label>{sceneMode==='manual' ? 'Describe the scene' : 'Scene description (edit if needed)'}</label>
                <textarea rows={3} value={customScene} onChange={e=>setCustomScene(e.target.value)}
                  placeholder={sceneMode==='manual' ? 'e.g. Golden hour outdoor setting, warm natural light, minimalist aesthetic' : ''}/>
              </div>

              <button className="btn btn-primary" onClick={generateAiImage} disabled={generatingAI||!customScene}>
                {generatingAI?<><span className="spinner"/> Generating…</>:<><Wand2 size={14}/> {productType==='physical'?'Place Product in Scene':'Generate Scene'}</>}
              </button>
              {aiError&&<p className="scan-error">{aiError}</p>}
              {aiImageUrl&&(
                <div className="scene-result animate-slide-up">
                  <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
                    <Check size={14} style={{color:'var(--success)'}}/><strong style={{fontSize:13}}>✓ Scene generated</strong>
                    <button className="btn-ghost" style={{fontSize:11,marginLeft:'auto'}} onClick={generateAiImage}><RefreshCw size={11}/> Regenerate free</button>
                  </div>
                  <img src={aiImageUrl} alt="AI scene" className="scene-preview-img"/>
                  {analyzingColors&&<div className="color-analysis-status"><Eye size={12}/><span>Claude Vision picking matching colours…</span></div>}
                  {colorAnalysis&&!analyzingColors&&(
                    <div className="color-analysis-result">
                      <Eye size={12} style={{color:'var(--success)'}}/><span>Claude matched colours ({colorAnalysis.imageTone} tone)</span>
                      <div className="color-swatches">{accentColors.slice(0,5).map((c,i)=><div key={i} className="color-swatch" style={{background:c}}/>)}</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="step-nav">
            <button className="btn btn-secondary" onClick={()=>setStep(1)}><ChevronLeft size={14}/> Back</button>
            <button className="btn btn-primary" style={{padding:'12px 24px'}} onClick={generatePosts} disabled={generatingPosts||!aiImageUrl}>
              {generatingPosts?<><span className="spinner"/> Creating posts…</>:<><Sparkles size={16}/> Continue to Studio</>}
            </button>
          </div>
        </div>
      )}

      {step===3&&posts.length>0&&(
        <div className="studio-step animate-slide-up">
          <div className="card form-card">
            <h3>Your Posts — {selectedTemplate.label}</h3>
            <p className="form-hint" style={{marginTop:4}}>{colorAnalysis?`✓ Claude Vision matched colours (${colorAnalysis.imageTone} tone). `:''}Click any field to edit, use sliders to resize text.</p>
          </div>

          <div className="card" style={{display:'flex',gap:12,alignItems:'center',padding:'12px 16px',flexWrap:'wrap'}}>
            <span style={{fontSize:12,color:'var(--text-mid)',fontFamily:'Space Grotesk',fontWeight:600}}>Colour Source:</span>
            <div style={{display:'flex',gap:4}}>
              <button className={`chip ${colorSource==='ai'?'chip-active':''}`} style={{fontSize:11,padding:'5px 12px'}} onClick={()=>setColorSource('ai')} disabled={!colorAnalysis}>AI-Matched</button>
              <button className={`chip ${colorSource==='brand'?'chip-active':''}`} style={{fontSize:11,padding:'5px 12px'}} onClick={()=>setColorSource('brand')} disabled={!brand?.colors?.length}>Brand Colours</button>
            </div>
            <input type="color" value={accentColors[0]} onChange={e=>{const nc=[...accentColors];nc[0]=e.target.value;setAccentColors(nc)}}
              style={{width:28,height:28,border:'none',borderRadius:6,cursor:'pointer',padding:0,marginLeft:'auto'}}/>
            <span style={{fontSize:12,color:'var(--text-mid)',fontFamily:'Space Grotesk',fontWeight:600}}>Text:</span>
            <input type="color" value={textColor} onChange={e=>setTextColor(e.target.value)}
              style={{width:28,height:28,border:'none',borderRadius:6,cursor:'pointer',padding:0}}/>
            <button className="btn-ghost" style={{fontSize:11}} onClick={()=>setTextColor(textColor==='#FFFFFF'?'#111111':'#FFFFFF')}>
              {textColor==='#FFFFFF'?'Switch to dark text':'Switch to light text'}
            </button>
          </div>

          <div className="card logo-panel">
            <div className="logo-panel-header">
              <div style={{display:'flex',alignItems:'center',gap:8}}><Star size={15} style={{color:'var(--gold)'}}/><strong style={{fontSize:13,fontFamily:'Space Grotesk'}}>Logo Overlay {brand?.logo?'— brand logo loaded ✓':''}</strong></div>
              <label className="logo-toggle"><input type="checkbox" checked={showLogo} onChange={e=>setShowLogo(e.target.checked)}/><span className="logo-toggle-slider"/></label>
            </div>
            {showLogo&&(
              <div className="logo-controls animate-slide-up">
                <div style={{display:'flex',gap:10,alignItems:'flex-start',flexWrap:'wrap'}}>
                  <div>
                    <p style={{fontSize:11,color:'var(--text-lo)',marginBottom:4}}>Upload different logo</p>
                    <button className="btn btn-secondary" style={{fontSize:12,padding:'6px 12px'}} onClick={()=>logoFileRef.current.click()}><Upload size={12}/> Upload</button>
                    <input ref={logoFileRef} type="file" accept="image/*" style={{display:'none'}} onChange={e=>handleLogoUpload(e.target.files)}/>
                  </div>
                  {logoUrl&&(
                    <div className="logo-preview-thumb">
                      <img src={logoUrl} alt="Logo"/>
                      <p style={{fontSize:9,color:'var(--success)',marginTop:2}}>✓ Active</p>
                      {logoOverrideUrl&&<button onClick={()=>setLogoOverrideUrl(null)} style={{fontSize:9,color:'var(--text-lo)',background:'none',border:'none',cursor:'pointer'}}>Use brand logo</button>}
                    </div>
                  )}
                </div>
                <div style={{display:'flex',gap:20,flexWrap:'wrap',marginTop:4}}>
                  <div>
                    <p style={{fontSize:11,color:'var(--text-lo)',marginBottom:6}}>Position</p>
                    <div className="logo-position-grid">{LOGO_POSITIONS.map(pos=><button key={pos.id} className={`logo-pos-btn ${logoPosition===pos.id?'active':''}`} onClick={()=>setLogoPosition(pos.id)}>{pos.label}</button>)}</div>
                  </div>
                  <div>
                    <p style={{fontSize:11,color:'var(--text-lo)',marginBottom:6}}>Size</p>
                    <div style={{display:'flex',gap:6}}>{LOGO_SIZES.map(sz=><button key={sz.id} className={`logo-size-btn ${logoSizeId===sz.id?'active':''}`} onClick={()=>setLogoSizeId(sz.id)}>{sz.label}</button>)}</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="posts-grid">
            {posts.map((post,i)=>(
              <div key={i} className={`post-result-card card ${chosen===i?'post-chosen':''}`} onClick={()=>setChosen(i)}>
                <div className="post-template-label">
                  <span className="tag tag-violet">Variation {i+1}</span>
                  {chosen===i&&<span className="tag tag-electric">✓ Favourite</span>}
                </div>
                <div className="canvas-wrap" style={{width:fmt.pw,height:fmt.ph}}>
                  <canvas ref={el=>{canvasRefs.current[i]=el;if(el)setTimeout(()=>renderCanvas(i),100+i*80)}} width={fmt.pw} height={fmt.ph} className="post-canvas"/>
                </div>
                <div className="edit-fields">
                  {['headline','subtext','cta'].map(field=>(
                    <div key={field} className="edit-field">
                      <div className="edit-field-label"><Type size={10}/> {field}</div>
                      {editing?.idx===i&&editing?.field===field?(
                        <div style={{display:'flex',gap:6}}>
                          <input value={editVal} onChange={e=>setEditVal(e.target.value)} onKeyDown={e=>e.key==='Enter'&&saveEdit()} style={{fontSize:12,padding:'4px 8px'}} autoFocus/>
                          <button className="btn btn-primary" style={{padding:'4px 10px',fontSize:11}} onClick={saveEdit}>✓</button>
                        </div>
                      ):(
                        <div className="edit-field-value" onClick={e=>{e.stopPropagation();startEdit(i,field,post[field])}}>{post[field]??'—'} <Edit2 size={10}/></div>
                      )}
                    </div>
                  ))}
                </div>
                <div className="text-size-controls" onClick={e=>e.stopPropagation()}>
                  <div className="size-slider-row"><span className="size-slider-label">Headline size</span><input type="range" min="0.6" max="1.6" step="0.05" value={getSizes(i).headline} onChange={e=>{setSize(i,'headline',parseFloat(e.target.value)); requestAnimationFrame(()=>renderCanvas(i))}}/></div>
                  <div className="size-slider-row"><span className="size-slider-label">Subtext size</span><input type="range" min="0.6" max="1.6" step="0.05" value={getSizes(i).subtext} onChange={e=>{setSize(i,'subtext',parseFloat(e.target.value)); requestAnimationFrame(()=>renderCanvas(i))}}/></div>
                  <div className="size-slider-row"><span className="size-slider-label">CTA size</span><input type="range" min="0.6" max="1.6" step="0.05" value={getSizes(i).cta} onChange={e=>{setSize(i,'cta',parseFloat(e.target.value)); requestAnimationFrame(()=>renderCanvas(i))}}/></div>
                </div>
                <div className="post-copy">
                  <p className="post-caption-preview">{post.caption}</p>
                  <div className="post-hashtags">{post.hashtags?.map(h=><span key={h} className="tag tag-violet">{h.startsWith('#')?h:'#'+h}</span>)}</div>
                </div>
                <div className="post-actions">
                  <button className="btn btn-secondary" onClick={e=>{e.stopPropagation();download(i)}}><Download size={14}/> Download</button>
                  <button className="btn btn-primary" onClick={e=>{e.stopPropagation();window.open('https://buffer.com','_blank')}}><Send size={14}/> Buffer</button>
                </div>
              </div>
            ))}
          </div>
          <div className="step-nav"><button className="btn btn-secondary" onClick={reset}>Start a New Post</button></div>
        </div>
      )}

      {editing&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:300,display:'flex',alignItems:'center',justifyContent:'center'}} onClick={()=>setEditing(null)}>
          <div className="card" style={{width:'min(400px,90vw)',padding:24,display:'flex',flexDirection:'column',gap:14}} onClick={e=>e.stopPropagation()}>
            <h3 style={{fontSize:15}}>Edit {editing.field}</h3>
            <input value={editVal} onChange={e=>setEditVal(e.target.value)} autoFocus style={{fontSize:14}}/>
            <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
              <button className="btn btn-secondary" onClick={()=>setEditing(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={saveEdit}>Save & Update</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
