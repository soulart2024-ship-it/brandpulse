# BrandPulse — AI Social Media Manager

Built with Vite + React. Deploys to Vercel in under 5 minutes.

## Features
- Secure passcode login
- Brand Brain (brand profile + website auto-scan)
- Asset Library with logo watermarking
- Trend Finder (AI-powered per platform)
- Content Generator (captions, scripts, hashtags, CTAs)
- AI Image Studio with gradient backgrounds
- Motion Cards (animated 9:16 and 1:1 previews)
- Storyboard Builder
- Video Generation Hub
- Content Calendar with AI weekly scheduling
- **PWA** — installable on iOS & Android (no app store needed)

---

## Deploying to Vercel

### 1. Push to GitHub
```bash
cd brandpulse
git init
git add .
git commit -m "BrandPulse initial build"
git remote add origin https://github.com/YOUR_USERNAME/brandpulse.git
git push -u origin main
```

### 2. Import to Vercel
1. Go to [vercel.com](https://vercel.com) → New Project
2. Import your GitHub repo
3. Framework preset: **Vite**
4. Root directory: leave as `/`
5. Build command: `npm run build`
6. Output directory: `dist`

### 3. Add Environment Variable (API Key — SECURE)
In Vercel → Your Project → Settings → Environment Variables:

```
Name:  ANTHROPIC_API_KEY
Value: sk-ant-...your key here...
```

⚠️ This keeps your API key server-side only. It is NEVER sent to the browser.

### 4. Deploy
Hit Deploy. Done. Vercel gives you a live URL instantly.

### 5. Change the passcode
In `src/App.jsx` line 8:
```js
const PASSCODE = '1234' // Change this!
```

---

## Running locally
```bash
npm install
# Create .env.local with:
# ANTHROPIC_API_KEY=sk-ant-...
npm run dev
```

For local dev, the `/api/claude` proxy won't work without a serverless runtime.
You can test by temporarily hardcoding the key in `api/claude.js` locally only — never commit it.

---

## PWA Installation
Once deployed, visit your Vercel URL on mobile:
- **iOS Safari**: tap Share → "Add to Home Screen"
- **Android Chrome**: tap the install prompt or menu → "Install app"
