// api/generate-image.js — Fal.ai image generation
// mode: 'edit'   → Flux Kontext: keeps product exactly, changes scene
// mode: 'create' → Flux Schnell: text-to-image background
// FAL_KEY must be set in Vercel Environment Variables

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const falKey = process.env.FAL_KEY
  if (!falKey) return res.status(500).json({ error: 'FAL_KEY not configured in Vercel' })

  try {
    const { prompt, imageBase64, imageUrl, imageType = 'image/jpeg', productName, mode = 'create' } = req.body
    if (!prompt) return res.status(400).json({ error: 'Prompt required' })

    if (mode === 'edit') {
      // Get image as base64 data URL — Flux Kontext accepts this directly
      let imageDataUrl = imageBase64

      if (!imageDataUrl && imageUrl) {
        // Fetch from URL and convert to base64
        const imgRes = await fetch(imageUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BrandPulseBot/1.0)' }
        })
        if (!imgRes.ok) return res.status(502).json({ error: `Could not fetch image (${imgRes.status})` })
        const buffer = await imgRes.arrayBuffer()
        const base64 = Buffer.from(buffer).toString('base64')
        const mime = imgRes.headers.get('content-type')?.split(';')[0] || 'image/jpeg'
        imageDataUrl = `data:${mime};base64,${base64}`
      }

      if (!imageDataUrl) return res.status(400).json({ error: 'No image provided for edit mode' })

      const kontextPrompt = `Keep the ${productName || 'product'} from the reference image EXACTLY as shown. Preserve every label, color, shape and packaging detail perfectly. Do not modify the product at all. Place it naturally in this setting: ${prompt}. Professional commercial photography, high quality, social media ready.`

      // Try Flux Kontext first — specifically built for subject-preserving editing
      const kontextRes = await fetch('https://fal.run/fal-ai/flux-pro/kontext', {
        method: 'POST',
        headers: {
          'Authorization': `Key ${falKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prompt: kontextPrompt,
          image_url: imageDataUrl,
          num_images: 1,
          enable_safety_checker: true
        })
      })

      if (kontextRes.ok) {
        const data = await kontextRes.json()
        const url = data.images?.[0]?.url
        if (url) return res.status(200).json({ url, mode, model: 'flux-kontext' })
      }

      // Fallback: Flux Dev image-to-image
      const fallbackRes = await fetch('https://fal.run/fal-ai/flux/dev/image-to-image', {
        method: 'POST',
        headers: { 'Authorization': `Key ${falKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_url: imageDataUrl,
          prompt: kontextPrompt,
          strength: 0.68,
          num_inference_steps: 28,
          guidance_scale: 3.5,
          num_images: 1,
          enable_safety_checker: true
        })
      })

      if (!fallbackRes.ok) {
        const err = await fallbackRes.text()
        return res.status(500).json({ error: `Image editing failed: ${err}` })
      }

      const fbData = await fallbackRes.json()
      const fbUrl = fbData.images?.[0]?.url
      if (!fbUrl) return res.status(500).json({ error: 'No image returned' })
      return res.status(200).json({ url: fbUrl, mode, model: 'flux-dev-i2i' })

    } else {
      // Text-to-image background scene
      const bgRes = await fetch('https://fal.run/fal-ai/flux/schnell', {
        method: 'POST',
        headers: { 'Authorization': `Key ${falKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `Professional lifestyle photography: ${prompt}. High quality, social media ready, clean composition, beautiful lighting, no text.`,
          image_size: 'square_hd',
          num_inference_steps: 4,
          num_images: 1,
          enable_safety_checker: true
        })
      })

      if (!bgRes.ok) {
        const err = await bgRes.text()
        return res.status(bgRes.status).json({ error: `Background generation failed: ${err}` })
      }

      const bgData = await bgRes.json()
      const bgUrl = bgData.images?.[0]?.url
      if (!bgUrl) return res.status(500).json({ error: 'No image returned' })
      return res.status(200).json({ url: bgUrl, mode, model: 'flux-schnell' })
    }

  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
