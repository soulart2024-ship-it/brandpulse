// api/buffer.js — Vercel serverless function
// Creates a scheduled post in Buffer using a Personal API Key
// Add BUFFER_API_KEY to Vercel Environment Variables

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()

  const apiKey = process.env.BUFFER_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'BUFFER_API_KEY not configured in Vercel' })

  // GET — list connected channels (so the user can pick which one to post to)
  if (req.method === 'GET') {
    try {
      const query = `
        query GetChannels {
          organizations {
            id
            channels {
              id
              name
              service
              avatar
            }
          }
        }
      `
      const response = await fetch('https://api.buffer.com', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({ query })
      })
      const data = await response.json()
      if (data.errors) return res.status(400).json({ error: data.errors[0]?.message || 'Buffer API error' })

      const channels = (data.data?.organizations || []).flatMap(org => org.channels || [])
      return res.status(200).json({ channels })
    } catch (err) {
      return res.status(500).json({ error: err.message })
    }
  }

  // POST — create a scheduled post
  if (req.method === 'POST') {
    try {
      const { text, channelId, imageUrl, dueAt, mode = 'addToQueue' } = req.body
      if (!text || !channelId) return res.status(400).json({ error: 'text and channelId are required' })

      const media = imageUrl ? {
        media: [{ type: 'image', url: imageUrl }]
      } : {}

      const inputFields = [
        `text: ${JSON.stringify(text)}`,
        `channelId: ${JSON.stringify(channelId)}`,
        `schedulingType: automatic`,
        `mode: ${mode === 'customScheduled' ? 'customScheduled' : 'addToQueue'}`,
      ]
      if (mode === 'customScheduled' && dueAt) {
        inputFields.push(`dueAt: ${JSON.stringify(dueAt)}`)
      }
      if (imageUrl) {
        inputFields.push(`media: { assets: [{ type: image, url: ${JSON.stringify(imageUrl)} }] }`)
      }

      const mutation = `
        mutation CreatePost {
          createPost(input: { ${inputFields.join(', ')} }) {
            ... on PostActionSuccess {
              post { id text dueAt }
            }
            ... on MutationError {
              message
            }
          }
        }
      `

      const response = await fetch('https://api.buffer.com', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({ query: mutation })
      })

      const data = await response.json()
      if (data.errors) return res.status(400).json({ error: data.errors[0]?.message || 'Buffer API error' })

      const result = data.data?.createPost
      if (result?.message) return res.status(400).json({ error: result.message })

      return res.status(200).json({ success: true, post: result?.post })
    } catch (err) {
      return res.status(500).json({ error: err.message })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
