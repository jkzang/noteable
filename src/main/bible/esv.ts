import { buildEsvUrl, toPassage, type EsvTextResponse } from '@shared/esv'
import type { BiblePassage } from '@shared/types'

const CACHE_LIMIT = 50
const cache = new Map<string, BiblePassage>()

/**
 * Fetches a passage from the ESV API. Runs in the main process so the API key
 * stays out of the renderer and the request is not subject to browser CORS.
 * A small in-memory cache avoids refetching while you flip between notes.
 */
export async function fetchPassage(
  reference: string,
  apiKey: string | undefined,
  fetchImpl: typeof fetch = fetch
): Promise<BiblePassage> {
  const query = reference.trim()
  if (!query) throw new Error('Enter a passage, e.g. "John 3:16-21".')
  if (!apiKey) throw new Error('Add your ESV API key in Settings to look up passages.')

  const key = query.toLowerCase()
  const hit = cache.get(key)
  if (hit) return hit

  const res = await fetchImpl(buildEsvUrl(query), { headers: { Authorization: `Token ${apiKey}` } })
  if (res.status === 401 || res.status === 403) throw new Error('The ESV API rejected your key. Check it in Settings.')
  if (res.status === 429) throw new Error('ESV API rate limit reached. Try again in a minute.')
  if (!res.ok) throw new Error(`ESV API error (${res.status}).`)

  const data = (await res.json()) as EsvTextResponse
  if (!data.passages?.length || !data.canonical) throw new Error(`No passage found for "${query}".`)

  const passage = toPassage(data)
  cache.set(key, passage)
  if (cache.size > CACHE_LIMIT) cache.delete(cache.keys().next().value!)
  return passage
}

export function clearPassageCache(): void {
  cache.clear()
}
