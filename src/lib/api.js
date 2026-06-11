// All AI calls go through /api/claude (Vercel serverless function)
// The Anthropic API key never touches the browser

export async function callClaude({ messages, system, max_tokens = 1024 }) {
  const res = await fetch('/api/claude', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, system, max_tokens })
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`API error: ${err}`)
  }
  const data = await res.json()
  return data.content?.[0]?.text ?? ''
}
