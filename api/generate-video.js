// api/generate-video.js — Vercel serverless function
// Animates a still image into a short video using Kling (via Fal.ai)

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const falKey = process.env.FAL_KEY
  if (!falKey) return res.status(500).json({ error: 'FAL_KEY not configured in Vercel' })

  try {
    const { imageUrl, imageBase64, prompt, duration = '5', aspectRatio = '9:16' } = req.body

    let imageDataUrl = imageBase64 || imageUrl
    if (!imageDataUrl) return res.status(400).json({ error: 'imageUrl or imageBase64 required' })

    if (imageDataUrl.startsWith('http')) {
      const imgRes = await fetch(imageDataUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } })
      if (!imgRes.ok) return res.status(502).json({ error: `Could not fetch image (${imgRes.status})` })
      const buffer = await imgRes.arrayBuffer()
      const mime = imgRes.headers.get('content-type')?.split(';')[0] || 'image/jpeg'
      imageDataUrl = `data:${mime};base64,${Buffer.from(buffer).toString('base64')}`
    }

    const validRatios = ['16:9', '9:16', '1:1']
    const ratio = validRatios.includes(aspectRatio) ? aspectRatio : '9:16'

    const response = await fetch('https://fal.run/fal-ai/kling-video/v2.5-turbo/pro/image-to-video', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${falKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        image_url: imageDataUrl,
        prompt: prompt || 'subtle natural motion, cinematic, professional commercial video',
        duration,
        aspect_ratio: ratio
      })
    })

    if (!response.ok) {
      const err = await response.text()
      return res.status(response.status).json({ error: `Kling error: ${err}` })
    }

    const data = await response.json()
    const videoUrl = data.video?.url
    if (!videoUrl) return res.status(500).json({ error: 'No video returned from Kling' })

    return res.status(200).json({ url: videoUrl })

  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
