// api/generate-image.js — Vercel serverless function
// Calls Fal.ai to generate AI images. FAL_KEY stored as Vercel env variable.

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const falKey = process.env.FAL_KEY
  if (!falKey) return res.status(500).json({ error: 'FAL_KEY not configured in Vercel' })

  try {
    const { prompt, image_size = 'square_hd' } = req.body
    if (!prompt) return res.status(400).json({ error: 'Prompt required' })

    const response = await fetch('https://fal.run/fal-ai/flux/schnell', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${falKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prompt,
        image_size,
        num_inference_steps: 4,
        num_images: 1,
        enable_safety_checker: true
      })
    })

    if (!response.ok) {
      const err = await response.text()
      return res.status(response.status).json({ error: err })
    }

    const data = await response.json()
    const imageUrl = data.images?.[0]?.url

    if (!imageUrl) return res.status(500).json({ error: 'No image returned from Fal.ai' })

    return res.status(200).json({ url: imageUrl, seed: data.seed })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
