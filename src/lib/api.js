// All AI calls go through /api/claude (Vercel serverless function)
// The Anthropic API key never touches the browser

export async function callClaude({ messages, system, max_tokens = 1024, tools }) {
  const res = await fetch('/api/claude', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, system, max_tokens, tools })
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`API error: ${err}`)
  }
  const data = await res.json()
  const textBlocks = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n')
  return textBlocks
}

// Extracts the first valid JSON object found in a string
// even if the model added stray text before/after it
export function extractJSON(text) {
  const cleaned = text.replace(/```json|```/g, '')
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start === -1 || end === -1) throw new Error('No JSON found in response')
  return JSON.parse(cleaned.slice(start, end + 1))
}
