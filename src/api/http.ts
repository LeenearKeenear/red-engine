// Shared fetch helpers. Every API call throws an Error on a non-OK response so
// callers/composables can surface a message uniformly.

export async function getJSON<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init)
  if (!res.ok) {
    throw new Error(await errorText(res))
  }
  return (await res.json()) as T
}

export async function getText(url: string, init?: RequestInit): Promise<string> {
  const res = await fetch(url, init)
  if (!res.ok) {
    throw new Error(await errorText(res))
  }
  return res.text()
}

// Fire a request and only check status (no body expected). Returns the raw
// Response so callers can inspect status if they wish.
export async function send(url: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(url, init)
  if (!res.ok) {
    throw new Error(await errorText(res))
  }
  return res
}

async function errorText(res: Response): Promise<string> {
  let body = ''
  try {
    body = (await res.text()).trim()
  } catch {
    /* ignore */
  }
  if (body) {
    // Try to unwrap a JSON {"error": "..."} payload.
    try {
      const parsed = JSON.parse(body) as { error?: string }
      if (parsed && typeof parsed.error === 'string') return parsed.error
    } catch {
      /* not JSON — use raw text */
    }
    return body
  }
  return `Request failed (HTTP ${res.status})`
}

// Build admin request headers carrying the bearer-style admin token.
export function adminHeaders(token: string, json = false): HeadersInit {
  const headers: Record<string, string> = { 'X-Admin-Token': token }
  if (json) headers['Content-Type'] = 'application/json'
  return headers
}
