// api/buffer.js — Vercel serverless function
// GET  — lists connected channels; add ?posts=true to also fetch scheduled posts
// POST — creates a scheduled post
// Add BUFFER_API_KEY to Vercel Environment Variables

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()

  const apiKey = process.env.BUFFER_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'BUFFER_API_KEY not configured in Vercel' })

  const callBuffer = async (query) => {
    const response = await fetch('https://api.buffer.com', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({ query })
    })
    const data = await response.json()
    if (data.errors) throw new Error(data.errors[0]?.message || 'Buffer API error')
    return data.data
  }

  if (req.method === 'GET') {
    try {
      const channelsData = await callBuffer(`
        query GetChannels {
          organizations(input: {}) {
            id
            channels { id name service avatar }
          }
        }
      `)

      const orgs = channelsData?.organizations || []
      const organizationId = orgs[0]?.id || null
      const channels = orgs.flatMap(org => org.channels || [])

      let posts = []
      if (req.query.posts === 'true' && organizationId && channels.length > 0) {
        const channelIds = channels.map(c => `"${c.id}"`).join(',')
        const postsData = await callBuffer(`
          query GetScheduledPosts {
            posts(
              first: 50
              input: {
                organizationId: "${organizationId}"
                filter: { status: [scheduled], channelIds: [${channelIds}] }
                sort: [{ field: dueAt, direction: asc }]
              }
            ) {
              edges { node { id text status dueAt channelId } }
            }
          }
        `)
        posts = (postsData?.posts?.edges || []).map(e => e.node)
      }

      return res.status(200).json({ channels, organizationId, posts })
    } catch (err) {
      return res.status(500).json({ error: err.message })
    }
  }

  if (req.method === 'POST') {
    try {
      const { text, channelId, imageUrl, dueAt, mode = 'addToQueue' } = req.body
      if (!text || !channelId) return res.status(400).json({ error: 'text and channelId are required' })

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
      } else {
        inputFields.push(`assets: []`)
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

      const data = await callBuffer(mutation)
      const result = data?.createPost
      if (result?.message) return res.status(400).json({ error: result.message })

      return res.status(200).json({ success: true, post: result?.post })
    } catch (err) {
      return res.status(500).json({ error: err.message })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
