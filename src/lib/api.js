export async function callClaude({ messages, system, max_tokens = 1024 }) {
  const res = await fetch('/api/claude', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, system, max_tokens })
  })
  if (!res.ok) throw new Error(`API error: ${await res.text()}`)
  const data = await res.json()
  return data.content?.[0]?.text ?? ''
}
