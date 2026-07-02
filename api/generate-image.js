// api/generate-image.js — Nano Banana Pro via Fal.ai
// Uses fal-ai/nano-banana-pro — Google's Gemini 3 Pro Image model
// accessed through Fal.ai using your existing FAL_KEY
// No Google billing needed — just your Fal.ai credit

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

    // Get image data if provided
    let imageDataUrl = imageBase64
    if (!imageDataUrl && imageUrl) {
      const imgRes = await fetch(imageUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BrandPulseBot/1.0)' }
      })
      if (!imgRes.ok) return res.status(502).json({ error: `Could not fetch image URL (${imgRes.status})` })
      const buffer = await imgRes.arrayBuffer()
      const base64 = Buffer.from(buffer).toString('base64')
      const mime = imgRes.headers.get('content-type')?.split(';')[0] || 'image/jpeg'
      imageDataUrl = `data:${mime};base64,${base64}`
    }

    // Build the prompt
    const fullPrompt = (mode === 'edit' && imageDataUrl)
      ? `Professional commercial product photography for social media. The ${productName || 'product'} shown in the reference image must remain completely intact — preserve all labels, text, colors, packaging shape and brand details exactly. Place this product naturally in this lifestyle setting: ${prompt}. High quality, aspirational, social media ready.`
      : `Professional lifestyle photography: ${prompt}. High quality, clean composition, social media ready, no text overlays.`

    // Fal.ai Nano Banana Pro endpoint
    const falBody = {
      prompt: fullPrompt,
      ...(imageDataUrl && { image_url: imageDataUrl }),
      num_images: 1,
      enable_safety_checker: true
    }

    const response = await fetch('https://fal.run/fal-ai/nano-banana-pro', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${falKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(falBody)
    })

    if (!response.ok) {
      const err = await response.text()
      return res.status(response.status).json({ error: `Fal.ai Nano Banana Pro error: ${err}` })
    }

    const data = await response.json()

    // Nano Banana Pro returns images array
    const imageResultUrl = data.images?.[0]?.url || data.image?.url
    if (!imageResultUrl) {
      return res.status(500).json({ error: 'No image returned from Nano Banana Pro' })
    }

    return res.status(200).json({ url: imageResultUrl, mode })

  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
