import { beforeEach, describe, expect, it, vi } from 'vitest'
import { buildEsvUrl, citeVerses, passageToMarkdown, splitVerses, type EsvTextResponse } from '@shared/esv'
import { clearPassageCache, fetchPassage } from './esv'

const romans: EsvTextResponse = {
  query: 'Romans 8:1-2',
  canonical: 'Romans 8:1–2',
  parsed: [[45008001, 45008002]],
  passages: [
    '[1] There is therefore now no condemnation for those who are in Christ Jesus. [2] For the law of the Spirit of life has set you free in Christ Jesus from the law of sin and death.\n\n'
  ]
}

const ok = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } })

beforeEach(() => clearPassageCache())

describe('ESV helpers', () => {
  it('builds a text request with verse numbers and no extras', () => {
    const url = new URL(buildEsvUrl('John 3:16'))
    expect(url.origin + url.pathname).toBe('https://api.esv.org/v3/passage/text/')
    expect(url.searchParams.get('q')).toBe('John 3:16')
    expect(url.searchParams.get('include-verse-numbers')).toBe('true')
    expect(url.searchParams.get('include-footnotes')).toBe('false')
  })

  it('splits verses and tracks chapter boundaries', () => {
    const verses = splitVerses('[38] For I am sure [39] nor height [1] I am speaking the truth', 8)
    expect(verses).toEqual([
      { number: 38, chapter: 8, text: 'For I am sure' },
      { number: 39, chapter: 8, text: 'nor height' },
      { number: 1, chapter: 9, text: 'I am speaking the truth' }
    ])
  })

  it('cites selected verses compactly', () => {
    const v = (chapter: number, number: number) => ({ chapter, number, text: '' })
    expect(citeVerses('Romans 8:1–11', [v(8, 1), v(8, 2), v(8, 3), v(8, 5)])).toBe('Romans 8:1–3, 5')
    expect(citeVerses('Romans 8:38–9:2', [v(8, 38), v(8, 39), v(9, 1)])).toBe('Romans 8:38–39; 9:1')
    expect(citeVerses('1 John 3', [v(3, 16)])).toBe('1 John 3:16')
  })

  it('formats a passage as a Markdown quote', async () => {
    const fetchImpl = vi.fn(async () => ok(romans))
    const p = await fetchPassage('Romans 8:1-2', 'key', fetchImpl as unknown as typeof fetch)
    expect(passageToMarkdown(p)).toBe(
      '> **Romans 8:1–2** (ESV)\n>\n> **1** There is therefore now no condemnation for those who are in Christ Jesus. **2** For the law of the Spirit of life has set you free in Christ Jesus from the law of sin and death.'
    )
  })
})

describe('fetchPassage', () => {
  it('sends the API key and caches results', async () => {
    const fetchImpl = vi.fn(async () => ok(romans))
    const p = await fetchPassage('Romans 8:1-2', 'secret', fetchImpl as unknown as typeof fetch)
    await fetchPassage('romans 8:1-2', 'secret', fetchImpl as unknown as typeof fetch)

    expect(fetchImpl).toHaveBeenCalledTimes(1)
    const [, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit]
    expect(init.headers).toEqual({ Authorization: 'Token secret' })
    expect(p.reference).toBe('Romans 8:1–2')
    expect(p.verses.map((v) => [v.chapter, v.number])).toEqual([
      [8, 1],
      [8, 2]
    ])
  })

  it('explains missing keys, bad keys and empty results', async () => {
    const never = vi.fn() as unknown as typeof fetch
    await expect(fetchPassage('John 1', undefined, never)).rejects.toThrow(/Add your ESV API key/)

    const unauthorized = vi.fn(async () => new Response('', { status: 401 })) as unknown as typeof fetch
    await expect(fetchPassage('John 1', 'bad', unauthorized)).rejects.toThrow(/rejected your key/)

    const empty = vi.fn(async () => ok({ ...romans, canonical: '', passages: [] })) as unknown as typeof fetch
    await expect(fetchPassage('Hezekiah 4', 'key', empty)).rejects.toThrow(/No passage found/)
  })
})
