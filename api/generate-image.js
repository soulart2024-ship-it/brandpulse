// api/generate-image.js — Fal.ai image generation
//
// mode: 'edit'   → Flux Kontext: keeps your product EXACTLY, changes the scene around it
//                  Flux Kontext is specifically built for subject-preserving editing
// mode: 'create' → Flux Schnell: text-to-image background scene
//
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
      // ── Step 1: Upload image to Fal.ai storage to get a public URL ──────────
      let imageBuffer = null
      let mimeType = imageType

      if (imageBase64) {
        const base64Data = imageBase64.replace(/^data:[^;]+;base64,/, '')
        mimeType = imageBase64.match(/^data:([^;]+);/)?.[1] || imageType
        imageBuffer = Buffer.from(base64Data, 'base64')
      } else if (imageUrl) {
        const imgRes = await fetch(imageUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BrandPulseBot/1.0)' }
        })
        if (!imgRes.ok) return res.status(502).json({ error: `Could not fetch image (${imgRes.status})` })
        const ab = await imgRes.arrayBuffer()
        imageBuffer = Buffer.from(ab)
        mimeType = imgRes.headers.get('content-type')?.split(';')[0] || 'image/jpeg'
      }

      if (!imageBuffer) return res.status(400).json({ error: 'No image provided for edit mode' })

      // Upload to Fal.ai storage
      const uploadRes = await fetch('https://fal.run/files/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Key ${falKey}`,
          'Content-Type': mimeType,
          'Content-Length': imageBuffer.length.toString()
        },
        body: imageBuffer
      })

      if (!uploadRes.ok) {
        const err = await uploadRes.text()
        return res.status(500).json({ error: `Fal.ai upload failed: ${err}` })
      }

      const uploadData = await uploadRes.json()
      const publicUrl = uploadData.url
      if (!publicUrl) return res.status(500).json({ error: 'No URL returned from Fal.ai storage' })

      // ── Step 2: Flux Kontext — keeps your product, changes the scene ─────────
      // Flux Kontext is specifically designed for subject-preserving image editing
      const kontextPrompt = `The ${productName || 'product'} from the reference image must remain EXACTLY as shown - preserve every detail of its labels, colors, shape, and packaging perfectly. Do not alter the product in any way. Place it naturally in this scene: ${prompt}. Professional commercial photography, high quality, social media ready.`

      const kontextRes = await fetch('https://fal.run/fal-ai/flux-pro/kontext', {
        method: 'POST',
        headers: {
          'Authorization': `Key ${falKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prompt: kontextPrompt,
          image_url: publicUrl,
          num_images: 1,
          enable_safety_checker: true,
          guidance_scale: 3.5,
          num_inference_steps: 28
        })
      })

      if (!kontextRes.ok) {
        const err = await kontextRes.text()
        // Fallback: try flux/dev/image-to-image
        const fallbackRes = await fetch('https://fal.run/fal-ai/flux/dev/image-to-image', {
          method: 'POST',
          headers: { 'Authorization': `Key ${falKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image_url: publicUrl,
            prompt: kontextPrompt,
            strength: 0.65,
            num_inference_steps: 28,
            guidance_scale: 3.5,
            num_images: 1
          })
        })
        if (!fallbackRes.ok) {
          const fbErr = await fallbackRes.text()
          return res.status(500).json({ error: `Image editing failed: ${fbErr}` })
        }
        const fbData = await fallbackRes.json()
        const fbUrl = fbData.images?.[0]?.url
        if (!fbUrl) return res.status(500).json({ error: 'No image from fallback model' })
        return res.status(200).json({ url: fbUrl, mode, model: 'flux-dev-i2i' })
      }

      const kontextData = await kontextRes.json()
      const resultUrl = kontextData.images?.[0]?.url
      if (!resultUrl) return res.status(500).json({ error: 'No image returned from Flux Kontext' })
      return res.status(200).json({ url: resultUrl, mode, model: 'flux-kontext' })

    } else {
      // ── Text-to-image: generate background scene (no product) ────────────────
      const bgRes = await fetch('https://fal.run/fal-ai/flux/schnell', {
        method: 'POST',
        headers: { 'Authorization': `Key ${falKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `Professional lifestyle photography background: ${prompt}. High quality, social media ready, clean composition, beautiful lighting, no text, no watermarks.`,
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
