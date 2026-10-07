// Parses typed Bible references like "Matthew 12", "Mt 12:13" or
// "1 Cor 13: 4 - 7" into a canonical form the ESV API understands. Whole
// books ("Matthew") are deliberately not accepted: a chapter is required.

/** The 66 books with their chapter counts (English versification). */
const BOOKS: [name: string, chapters: number][] = [
  ['Genesis', 50], ['Exodus', 40], ['Leviticus', 27], ['Numbers', 36], ['Deuteronomy', 34],
  ['Joshua', 24], ['Judges', 21], ['Ruth', 4], ['1 Samuel', 31], ['2 Samuel', 24],
  ['1 Kings', 22], ['2 Kings', 25], ['1 Chronicles', 29], ['2 Chronicles', 36], ['Ezra', 10],
  ['Nehemiah', 13], ['Esther', 10], ['Job', 42], ['Psalms', 150], ['Proverbs', 31],
  ['Ecclesiastes', 12], ['Song of Solomon', 8], ['Isaiah', 66], ['Jeremiah', 52], ['Lamentations', 5],
  ['Ezekiel', 48], ['Daniel', 12], ['Hosea', 14], ['Joel', 3], ['Amos', 9],
  ['Obadiah', 1], ['Jonah', 4], ['Micah', 7], ['Nahum', 3], ['Habakkuk', 3],
  ['Zephaniah', 3], ['Haggai', 2], ['Zechariah', 14], ['Malachi', 4],
  ['Matthew', 28], ['Mark', 16], ['Luke', 24], ['John', 21], ['Acts', 28],
  ['Romans', 16], ['1 Corinthians', 16], ['2 Corinthians', 13], ['Galatians', 6], ['Ephesians', 6],
  ['Philippians', 4], ['Colossians', 4], ['1 Thessalonians', 5], ['2 Thessalonians', 3], ['1 Timothy', 6],
  ['2 Timothy', 4], ['Titus', 3], ['Philemon', 1], ['Hebrews', 13], ['James', 5],
  ['1 Peter', 5], ['2 Peter', 3], ['1 John', 5], ['2 John', 1], ['3 John', 1],
  ['Jude', 1], ['Revelation', 22]
]

/** Common abbreviations that a plain prefix match would miss or find ambiguous. */
const ALIASES: Record<string, string> = {
  gn: 'Genesis', ex: 'Exodus', dt: 'Deuteronomy', jdg: 'Judges', judg: 'Judges', rth: 'Ruth',
  ps: 'Psalms', psa: 'Psalms', psalm: 'Psalms', pss: 'Psalms', pr: 'Proverbs', prv: 'Proverbs',
  qoh: 'Ecclesiastes', song: 'Song of Solomon', sos: 'Song of Solomon', songofsongs: 'Song of Solomon',
  canticles: 'Song of Solomon', ezk: 'Ezekiel', jl: 'Joel', jon: 'Jonah', jnh: 'Jonah', mic: 'Micah',
  na: 'Nahum', hab: 'Habakkuk', zep: 'Zephaniah', hag: 'Haggai', zec: 'Zechariah', ml: 'Malachi',
  mt: 'Matthew', mk: 'Mark', mrk: 'Mark', lk: 'Luke', jn: 'John', jhn: 'John',
  rom: 'Romans', ro: 'Romans', rm: 'Romans', gal: 'Galatians', eph: 'Ephesians',
  phil: 'Philippians', php: 'Philippians', phm: 'Philemon', philem: 'Philemon',
  col: 'Colossians', heb: 'Hebrews', jas: 'James', jm: 'James',
  rev: 'Revelation', revelations: 'Revelation',
  // Numbered books: the number is stripped before these are looked up.
  sam: 'Samuel', sa: 'Samuel', sm: 'Samuel', kgs: 'Kings', ki: 'Kings', chr: 'Chronicles', ch: 'Chronicles',
  cor: 'Corinthians', co: 'Corinthians', thess: 'Thessalonians', th: 'Thessalonians', ths: 'Thessalonians',
  tim: 'Timothy', ti: 'Timothy', pet: 'Peter', pe: 'Peter', pt: 'Peter'
}

const key = (s: string) => s.toLowerCase().replace(/[\s.]+/g, '')
const BOOK_KEYS = BOOKS.map(([name, chapters]) => ({ name, chapters, key: key(name) }))
const chaptersIn = (name: string) => BOOK_KEYS.find((b) => b.name === name)!.chapters

/** Resolves a typed book name or abbreviation ("Matt", "1 Cor", "Song of Songs"). */
export function resolveBook(input: string): string | null {
  const k = key(input)
  if (!k) return null
  const exact = BOOK_KEYS.find((b) => b.key === k)
  if (exact) return exact.name

  const [, num = '', rest] = /^([1-3]?)(.*)$/.exec(k)!
  const alias = ALIASES[rest]
  if (alias) {
    const name = num ? `${num} ${alias}` : alias
    if (BOOK_KEYS.some((b) => b.name === name)) return name
  }
  // Otherwise an unambiguous prefix of at least three letters, e.g. "Deut", "Lev", "Ecc".
  if (rest.length < 3) return null
  const hits = BOOK_KEYS.filter((b) => b.key.startsWith(k))
  return hits.length === 1 ? hits[0].name : null
}

/** True while `input` could still grow into a book name, e.g. "1 C", "Song of". */
export function isBookPrefix(input: string): boolean {
  const k = key(input)
  if (!k) return true
  return BOOK_KEYS.some((b) => b.key.startsWith(k)) || resolveBook(input) !== null
}

export interface BibleReference {
  book: string
  chapter: number
  /** Last chapter of a chapter range ("Matthew 5–7") or cross-chapter range ("12:46–13:9"). */
  endChapter?: number
  verse?: number
  endVerse?: number
  /** Display form with an en dash, e.g. "Matthew 12:13–24". */
  label: string
  /** Form sent to the ESV API, e.g. "Matthew 12:13-24". */
  query: string
}

// book, then chapter[:verse][-[chapter:]verse|chapter]; spaces around ":" and "-" are fine.
const REF = /^\s*((?:[1-3]\s*)?[a-z][a-z.\s]*?)\s*(\d+)(?:\s*:\s*(\d+))?(?:\s*[-–—]\s*(\d+)(?:\s*:\s*(\d+))?)?\s*$/i

/**
 * Parses "Matthew 12", "Matthew 12:13", "Matthew 12: 13-24", "Matthew 12:46-13:9"
 * or "Matthew 5-7". Returns null for whole books, unknown books and impossible
 * chapters or ranges. In one-chapter books "Jude 5" means verse 5.
 */
export function parseReference(input: string): BibleReference | null {
  const m = REF.exec(input)
  if (!m) return null
  const book = resolveBook(m[1])
  if (!book) return null
  const chapters = chaptersIn(book)
  const [n1, n2, n3, n4] = [m[2], m[3], m[4], m[5]].map((x) => (x === undefined ? undefined : Number(x)))

  // In one-chapter books, numbers without a colon are verses: "Jude 5", "Jude 3-4".
  if (chapters === 1 && n2 === undefined) {
    if (n4 !== undefined || !n1 || (n3 !== undefined && n3 <= n1)) return null
    const body = n3 === undefined ? `${n1}` : `${n1}–${n3}`
    return {
      book,
      chapter: 1,
      verse: n1,
      endVerse: n3,
      label: `${book} ${body}`,
      query: `${book} 1:${body.replace('–', '-')}`
    }
  }

  const chapter = n1!
  const verse = n2
  let endChapter: number | undefined
  let endVerse: number | undefined
  if (verse === undefined) {
    if (n4 !== undefined) return null // "5-6:2"
    endChapter = n3 // "Matthew 5-7"
  } else if (n4 !== undefined) {
    ;[endChapter, endVerse] = [n3, n4] // "12:46-13:9"
  } else {
    endVerse = n3 // "12:13-24"
  }

  if (!chapter || chapter > chapters || verse === 0 || endVerse === 0) return null
  if (endChapter !== undefined && (endChapter <= chapter || endChapter > chapters)) return null
  if (endChapter === undefined && endVerse !== undefined && endVerse <= verse!) return null

  const start = verse === undefined ? `${chapter}` : `${chapter}:${verse}`
  const end = endChapter === undefined ? endVerse : endVerse === undefined ? endChapter : `${endChapter}:${endVerse}`
  const label = `${book} ${end === undefined ? start : `${start}–${end}`}`
  return { book, chapter, endChapter, verse, endVerse, label, query: label.replace('–', '-') }
}

/**
 * Whether a slash-menu query with spaces in it might still become a
 * reference ("1 ", "Song of", "Matthew 12: 1"), so the menu stays open.
 */
export function mightBeReference(input: string): boolean {
  const m = /^\s*((?:[1-3]\s*)?(?:[a-z][a-z.\s]*?)?)\s*(\d[\d\s:–—-]*)?$/i.exec(input)
  if (!m) return false
  return m[2] ? resolveBook(m[1]) !== null : isBookPrefix(m[1])
}

/** Guidance for a slash query that names a book but isn't a full reference yet. */
export function referenceHint(input: string): string | null {
  const m = /^\s*((?:[1-3]\s*)?[a-z][a-z.\s]*?)\s*(\d[\d\s:–—-]*)?$/i.exec(input)
  const book = m && resolveBook(m[1])
  if (!book) return null
  const chapters = chaptersIn(book)
  const chapter = m[2] ? Number(/^\d+/.exec(m[2])![0]) : 0
  if (chapters > 1 && chapter > chapters) return `${book} has ${chapters} chapters`
  if (chapter) return `Add verses, e.g. ${book} ${chapter}:1 or ${book} ${chapter}:1–4`
  const ex = Math.min(5, chapters)
  return `Add a chapter, e.g. ${book} ${ex} or ${book} ${ex}:1–4`
}
