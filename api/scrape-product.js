// api/scrape-product.js — Vercel serverless function
// Fetches a real product page URL and extracts structured product data
// using Claude to intelligently parse the content.

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'API key not configured' })

  try {
    let { url } = req.body
    if (!url) return res.status(400).json({ error: 'URL required' })
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url

    // Step 1: Fetch the real product page
    const pageRes = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BrandPulseBot/1.0)' },
      redirect: 'follow'
    })
    if (!pageRes.ok) return res.status(502).json({ error: `Could not fetch page (${pageRes.status})` })

    const html = await pageRes.text()

    // Step 2: Clean the HTML to readable text
    const title = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1]?.trim() ?? ''
    const metaDesc = (html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i) || [])[1]?.trim() ?? ''
    const text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"')
      .replace(/\s+/g, ' ').trim().slice(0, 4000)

    if (!text || text.length < 50) {
      return res.status(200).json({ error: 'Not enough readable content found on this page — try a different URL or fill in manually.' })
    }

    // Step 3: Use Claude to extract structured product data
    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 800,
        system: 'You are a product data extractor. Given real text scraped from a product page, extract accurate product information. Return JSON only — no markdown, no extra text: { "name": "exact product name", "brand": "brand name", "price": "price if visible", "tagline": "main marketing tagline max 10 words", "description": "2-3 sentence product description", "benefits": ["benefit 1", "benefit 2", "benefit 3", "benefit 4"], "keyIngredients": ["ingredient 1", "ingredient 2"], "idealFor": "who this is for", "callToAction": "natural CTA phrase e.g. Try it today" }. Only use information actually present in the content.',
        messages: [{
          role: 'user',
          content: `Page title: ${title}\nMeta description: ${metaDesc}\n\nPage content:\n${text}\n\nExtract the product information.`
        }]
      })
    })

    const claudeData = await claudeRes.json()
    const raw = claudeData.content?.[0]?.text ?? ''
    const start = raw.indexOf('{'), end = raw.lastIndexOf('}')
    if (start === -1 || end === -1) throw new Error('Could not parse product data')
    const product = JSON.parse(raw.slice(start, end + 1))

    return res.status(200).json({ product, url })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
