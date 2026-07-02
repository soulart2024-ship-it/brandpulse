// api/generate-image.js — Vercel serverless function
// Supports three modes:
//   text-to-image   — generate from prompt only (no product image)
//   image-to-image  — place product photo into AI-generated scene (MAIN MODE)
//   image-to-video  — animate a still image (for animated posts)

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const falKey = process.env.FAL_KEY
  if (!falKey) return res.status(500).json({ error: 'FAL_KEY not configured in Vercel' })

  try {
    const { prompt, imageBase64, imageUrl, mode = 'text-to-image', image_size = 'square_hd', strength = 0.72 } = req.body
    if (!prompt) return res.status(400).json({ error: 'Prompt required' })

    let falUrl, falBody

    if (mode === 'image-to-video') {
      // Animate a still image using Kling
      falUrl = 'https://fal.run/fal-ai/kling-video/v1.6/standard/image-to-video'
      falBody = {
        image_url: imageBase64 || imageUrl,
        prompt,
        duration: '5',
        aspect_ratio: image_size === 'portrait_4_3' ? '9:16' : image_size === 'landscape_4_3' ? '16:9' : '1:1'
      }
    } else if (mode === 'image-to-image' && (imageBase64 || imageUrl)) {
      // Place product photo into AI scene — CORE FEATURE
      // strength: 0.5 = close to original, 0.85 = heavily transformed
      falUrl = 'https://fal.run/fal-ai/flux/dev/image-to-image'
      falBody = {
        image_url: imageBase64 || imageUrl,
        prompt,
        strength,
        num_inference_steps: 28,
        guidance_scale: 3.5,
        num_images: 1,
        enable_safety_checker: true,
        image_size
      }
    } else {
      // Text-to-image fallback (no product photo)
      falUrl = 'https://fal.run/fal-ai/flux/schnell'
      falBody = {
        prompt,
        image_size,
        num_inference_steps: 4,
        num_images: 1,
        enable_safety_checker: true
      }
    }

    const response = await fetch(falUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Key ${falKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(falBody)
    })

    if (!response.ok) {
      const err = await response.text()
      return res.status(response.status).json({ error: `Fal.ai error: ${err}` })
    }

    const data = await response.json()

    // Video returns differently from image
    if (mode === 'image-to-video') {
      const videoUrl = data.video?.url
      if (!videoUrl) return res.status(500).json({ error: 'No video returned' })
      return res.status(200).json({ url: videoUrl, type: 'video' })
    }

    const imageResultUrl = data.images?.[0]?.url
    if (!imageResultUrl) return res.status(500).json({ error: 'No image returned from Fal.ai' })
    return res.status(200).json({ url: imageResultUrl, seed: data.seed, type: 'image' })

  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
