// Pure helpers for the ESV API (https://api.esv.org/docs/). The network call
// itself lives in the main process so the API key never reaches the renderer.

import type { BiblePassage } from './types'

export const ESV_TEXT_ENDPOINT = 'https://api.esv.org/v3/passage/text/'

export const ESV_SHORT_COPYRIGHT = '(ESV)'
export const ESV_COPYRIGHT =
  'Scripture quotations are from the ESV® Bible (The Holy Bible, English Standard Version®), ' +
  '© 2001 by Crossway, a publishing ministry of Good News Publishers. Used by permission. All rights reserved.'

/** Query params for /v3/passage/text — plain text with [n] verse markers, no extras. */
export const ESV_TEXT_PARAMS: Record<string, string> = {
  'include-passage-references': 'false',
  'include-verse-numbers': 'true',
  'include-first-verse-numbers': 'true',
  'include-footnotes': 'false',
  'include-footnote-body': 'false',
  'include-headings': 'false',
  'include-short-copyright': 'false',
  'include-copyright': 'false',
  'include-selahs': 'true',
  'indent-paragraphs': '0',
  'indent-poetry': 'false',
  'line-length': '0'
}

/** Shape of the bits of the ESV /passage/text response we use. */
export interface EsvTextResponse {
  query: string
  canonical: string
  /** Inclusive verse ranges encoded as BBCCCVVV, e.g. 45008001 = Romans 8:1. */
  parsed: [number, number][]
  passages: string[]
}

export function buildEsvUrl(reference: string): string {
  const params = new URLSearchParams({ q: reference, ...ESV_TEXT_PARAMS })
  return `${ESV_TEXT_ENDPOINT}?${params.toString()}`
}

/** Chapter number encoded in an ESV verse id (BBCCCVVV). */
export function chapterOf(verseId: number): number {
  return Math.floor(verseId / 1000) % 1000
}

/**
 * Splits ESV text like "[1] In the beginning... [2] The earth..." into verses.
 * When verse numbers go backwards we have crossed into the next chapter.
 */
export function splitVerses(text: string, startChapter?: number): BiblePassage['verses'] {
  const verses: BiblePassage['verses'] = []
  const marker = /\[(\d+)\]/g
  const clean = (s: string) => s.replace(/\s+/g, ' ').trim()

  let chapter = startChapter
  let lastNumber = 0
  let match: RegExpExecArray | null
  let cursor = 0
  let pendingNumber: number | null = null

  const flush = (end: number) => {
    const chunk = clean(text.slice(cursor, end))
    if (chunk) verses.push({ number: pendingNumber, chapter, text: chunk })
  }

  while ((match = marker.exec(text))) {
    flush(match.index)
    const n = Number(match[1])
    if (chapter !== undefined && n < lastNumber) chapter += 1
    lastNumber = n
    pendingNumber = n
    cursor = match.index + match[0].length
  }
  flush(text.length)
  return verses
}

export function toPassage(res: EsvTextResponse): BiblePassage {
  const raw = (res.passages ?? []).join('\n\n')
  const startChapter = res.parsed?.[0] ? chapterOf(res.parsed[0][0]) : undefined
  return {
    query: res.query,
    reference: res.canonical,
    verses: splitVerses(raw, startChapter),
    text: raw.replace(/\s+/g, ' ').trim(),
    copyright: ESV_COPYRIGHT
  }
}

/** Markdown blockquote used when a passage is inserted into a note. */
export function passageToMarkdown(p: BiblePassage): string {
  const lines = p.verses.map((v) => (v.number === null ? v.text : `**${v.number}** ${v.text}`))
  return [`> **${p.reference}** ${ESV_SHORT_COPYRIGHT}`, '>', `> ${lines.join(' ')}`].join('\n')
}

/** Collapses sorted verse numbers into ranges: [1,2,3,5] → "1–3, 5". */
function compressNumbers(nums: number[]): string {
  const parts: string[] = []
  for (let i = 0; i < nums.length; i++) {
    let j = i
    while (j + 1 < nums.length && nums[j + 1] === nums[j] + 1) j++
    parts.push(j > i ? `${nums[i]}–${nums[j]}` : String(nums[i]))
    i = j
  }
  return parts.join(', ')
}

/** Citation for a selection of verses, e.g. "Romans 8:1–3, 5" or "Romans 8:38–39; 9:1". */
export function citeVerses(reference: string, verses: BiblePassage['verses']): string {
  const book = reference.replace(/[\s\d:–\-,;]+$/, '')
  const byChapter = new Map<number, number[]>()
  for (const v of verses) {
    if (v.number === null || v.chapter === undefined) return reference
    byChapter.set(v.chapter, [...(byChapter.get(v.chapter) ?? []), v.number])
  }
  if (!book || byChapter.size === 0) return reference
  const parts = [...byChapter].map(([ch, nums]) => `${ch}:${compressNumbers([...new Set(nums)].sort((a, b) => a - b))}`)
  return `${book} ${parts.join('; ')}`
}
