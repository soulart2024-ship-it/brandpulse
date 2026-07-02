// api/generate-image.js — Google Gemini (Nano Banana) image generation
// Supports:
//   mode: 'edit'   → your product photo + scene = Gemini keeps product, changes scene
//   mode: 'create' → text-to-image background scene
//
// Image input can be:
//   imageBase64 → base64 data URL from file upload
//   imageUrl    → direct URL to product image (fetched server-side)
//
// Add GOOGLE_AI_KEY to Vercel Environment Variables

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const apiKey = process.env.GOOGLE_AI_KEY
  if (!apiKey) return res.status(500).json({ error: 'GOOGLE_AI_KEY not configured in Vercel' })

  try {
    const { prompt, imageBase64, imageUrl, imageType = 'image/jpeg', productName, mode = 'create' } = req.body
    if (!prompt) return res.status(400).json({ error: 'Prompt required' })

    let parts = []

    if (mode === 'edit') {
      // Get image data — either from base64 upload OR by fetching URL server-side
      let base64Data = null
      let mimeType = imageType

      if (imageBase64) {
        // From file upload (already base64)
        base64Data = imageBase64.replace(/^data:[^;]+;base64,/, '')
        mimeType = imageBase64.match(/^data:([^;]+);/)?.[1] || imageType
      } else if (imageUrl) {
        // Fetch the image URL server-side — user can paste any product image URL
        const imgRes = await fetch(imageUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BrandPulseBot/1.0)' }
        })
        if (!imgRes.ok) return res.status(502).json({ error: `Could not fetch image URL (${imgRes.status})` })
        const buffer = await imgRes.arrayBuffer()
        base64Data = Buffer.from(buffer).toString('base64')
        mimeType = imgRes.headers.get('content-type')?.split(';')[0] || 'image/jpeg'
      }

      if (!base64Data) return res.status(400).json({ error: 'Provide imageBase64 or imageUrl for edit mode' })

      parts = [
        {
          text: `You are a professional commercial product photographer creating social media content.

CRITICAL: Keep the ${productName ? `"${productName}"` : 'product'} in the uploaded photo EXACTLY as it appears. Preserve every single detail: the label text, brand name, colors, packaging shape, any logos or graphics on the product. Do NOT modify, alter, blur, or change the product itself in any way whatsoever.

Your task: Naturally place this exact product into the following scene — ${prompt}

The product should appear as if it genuinely belongs in this setting. Use professional commercial photography aesthetics: natural lighting, clean composition, aspirational lifestyle feel appropriate for social media.

Output only the image.`
        },
        {
          inline_data: {
            mime_type: mimeType.startsWith('image/') ? mimeType : 'image/jpeg',
            data: base64Data
          }
        }
      ]
    } else {
      // Text-to-image — create background/lifestyle scene only
      parts = [{
        text: `Professional commercial photography: ${prompt}. High quality, social media ready, clean composition, aspirational aesthetic, beautiful lighting, no text overlays.`
      }]
    }

    const model = 'gemini-2.0-flash-preview-image-generation'
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: { responseModalities: ['IMAGE', 'TEXT'] }
      })
    })

    if (!response.ok) {
      const err = await response.text()
      return res.status(response.status).json({ error: `Gemini API error: ${err}` })
    }

    const data = await response.json()
    const imagePart = data.candidates?.[0]?.content?.parts?.find(p => p.inlineData)

    if (!imagePart?.inlineData?.data) {
      const textPart = data.candidates?.[0]?.content?.parts?.find(p => p.text)
      return res.status(500).json({
        error: textPart?.text || 'No image returned — check your GOOGLE_AI_KEY and model access'
      })
    }

    const mime = imagePart.inlineData.mimeType || 'image/png'
    const dataUrl = `data:${mime};base64,${imagePart.inlineData.data}`
    return res.status(200).json({ url: dataUrl, mode })

  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
