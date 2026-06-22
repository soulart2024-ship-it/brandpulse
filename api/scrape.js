// api/scrape.js — Vercel serverless function
// Actually fetches the real webpage content server-side, then returns
// clean text for Claude to analyse. This avoids Claude guessing from the URL alone.

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    let { url } = req.body
    if (!url) return res.status(400).json({ error: 'URL required' })
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; BrandPulseBot/1.0; +https://brandpulse.app)'
      },
      redirect: 'follow'
    })

    if (!response.ok) {
      return res.status(502).json({ error: `Could not fetch site (status ${response.status})` })
    }

    const html = await response.text()
    const extracted = extractText(html)

    if (!extracted.text || extracted.text.length < 40) {
      return res.status(200).json({
        ...extracted,
        warning: 'This site may use heavy JavaScript rendering, so little readable text was found.'
      })
    }

    return res.status(200).json(extracted)
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}

function extractText(html) {
  let cleaned = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')

  const titleMatch = cleaned.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  const descMatch =
    cleaned.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i) ||
    cleaned.match(/<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i)

  const text = cleaned
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()

  return {
    title: titleMatch ? titleMatch[1].trim() : '',
    description: descMatch ? descMatch[1].trim() : '',
    text: text.slice(0, 3000)
  }
}
