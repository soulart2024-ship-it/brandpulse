export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const falKey = process.env.FAL_KEY
  if (!falKey) return res.status(500).json({ error: 'FAL_KEY not configured' })

  try {
    const { prompt, imageBase64, imageUrl, imageType = 'image/jpeg', productName, mode = 'create' } = req.body
    if (!prompt) return res.status(400).json({ error: 'Prompt required' })

    let falUrl, falBody

    if (mode === 'edit') {
      let imageDataUrl = imageBase64
      if (!imageDataUrl && imageUrl) {
        const imgRes = await fetch(imageUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } })
        if (!imgRes.ok) return res.status(502).json({ error: `Could not fetch image (${imgRes.status})` })
        const buffer = await imgRes.arrayBuffer()
        const mime = imgRes.headers.get('content-type')?.split(';')[0] || 'image/jpeg'
        imageDataUrl = `data:${mime};base64,${Buffer.from(buffer).toString('base64')}`
      }
      if (!imageDataUrl) return res.status(400).json({ error: 'No image provided' })

      falUrl = 'https://fal.run/fal-ai/flux-pro/kontext'
      falBody = {
        prompt: `Keep the ${productName||'product'} EXACTLY as shown — preserve all labels, colors, packaging. Place it naturally in: ${prompt}. Professional commercial photography.`,
        image_url: imageDataUrl,
        num_images: 1,
        enable_safety_checker: true
      }
    } else {
      falUrl = 'https://fal.run/fal-ai/flux/schnell'
      falBody = {
        prompt: `Professional lifestyle photography: ${prompt}. High quality, social media ready, clean composition, beautiful lighting, no text.`,
        image_size: 'square_hd',
        num_inference_steps: 4,
        num_images: 1,
        enable_safety_checker: true
      }
    }

    const response = await fetch(falUrl, {
      method: 'POST',
      headers: { 'Authorization': `Key ${falKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(falBody)
    })

    if (!response.ok) {
      const err = await response.text()
      return res.status(response.status).json({ error: `Fal.ai error: ${err}` })
    }

    const data = await response.json()
    const resultUrl = data.images?.[0]?.url
    if (!resultUrl) return res.status(500).json({ error: 'No image returned from Fal.ai' })

    // Convert to base64 server-side to avoid CORS issues in the browser
    const imgRes = await fetch(resultUrl)
    const imgBuffer = await imgRes.arrayBuffer()
    const mime = imgRes.headers.get('content-type') || 'image/jpeg'
    const base64 = `data:${mime};base64,${Buffer.from(imgBuffer).toString('base64')}`

    return res.status(200).json({ url: base64, mode })

  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
