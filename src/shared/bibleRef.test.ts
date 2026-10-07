import { describe, expect, it } from 'vitest'
import { mightBeReference, parseReference, referenceHint, resolveBook } from './bibleRef'

const label = (s: string) => parseReference(s)?.label ?? null

describe('resolveBook', () => {
  it('accepts full names, abbreviations and numbered books', () => {
    expect(resolveBook('Matthew')).toBe('Matthew')
    expect(resolveBook('matt')).toBe('Matthew')
    expect(resolveBook('Mt')).toBe('Matthew')
    expect(resolveBook('Ps')).toBe('Psalms')
    expect(resolveBook('psalm')).toBe('Psalms')
    expect(resolveBook('1 Cor')).toBe('1 Corinthians')
    expect(resolveBook('1cor')).toBe('1 Corinthians')
    expect(resolveBook('2 Tim.')).toBe('2 Timothy')
    expect(resolveBook('1 jn')).toBe('1 John')
    expect(resolveBook('Song of Songs')).toBe('Song of Solomon')
    expect(resolveBook('Deut')).toBe('Deuteronomy')
    expect(resolveBook('Phil')).toBe('Philippians')
  })

  it('rejects unknown or ambiguous names', () => {
    expect(resolveBook('Heading')).toBeNull()
    expect(resolveBook('Jud')).toBeNull() // Judges or Jude?
    expect(resolveBook('J')).toBeNull()
    expect(resolveBook('4 John')).toBeNull()
  })
})

describe('parseReference', () => {
  it('parses verses, verse ranges and whole chapters', () => {
    expect(parseReference('Matthew 12:13')).toMatchObject({ book: 'Matthew', chapter: 12, verse: 13, query: 'Matthew 12:13' })
    expect(label('Matthew 12: 13')).toBe('Matthew 12:13')
    expect(parseReference('Matthew 12: 13-24')).toMatchObject({ verse: 13, endVerse: 24, label: 'Matthew 12:13–24', query: 'Matthew 12:13-24' })
    expect(label('matthew 12 : 13 – 24')).toBe('Matthew 12:13–24')
    expect(parseReference('Matthew 12')).toMatchObject({ chapter: 12, verse: undefined, label: 'Matthew 12' })
    expect(label('1 Cor 13:4-7')).toBe('1 Corinthians 13:4–7')
    expect(label('Ps 23')).toBe('Psalms 23')
  })

  it('parses chapter ranges and ranges across chapters', () => {
    expect(label('Matthew 5-7')).toBe('Matthew 5–7')
    expect(parseReference('Matthew 12:46-13:9')).toMatchObject({ chapter: 12, verse: 46, endChapter: 13, endVerse: 9, label: 'Matthew 12:46–13:9' })
  })

  it('reads numbers in one-chapter books as verses', () => {
    expect(parseReference('Jude 5')).toMatchObject({ chapter: 1, verse: 5, label: 'Jude 5', query: 'Jude 1:5' })
    expect(parseReference('Jude 1-3')).toMatchObject({ label: 'Jude 1–3', query: 'Jude 1:1-3' })
    expect(label('Philemon 1:4')).toBe('Philemon 1:4')
  })

  it('refuses whole books and impossible references', () => {
    expect(parseReference('Matthew')).toBeNull()
    expect(parseReference('Matthew 29')).toBeNull()
    expect(parseReference('Matthew 0')).toBeNull()
    expect(parseReference('Matthew 12:0')).toBeNull()
    expect(parseReference('Matthew 12:24-13')).toBeNull() // end verse before start
    expect(parseReference('Matthew 7-5')).toBeNull()
    expect(parseReference('Matthew 5-6:2')).toBeNull()
    expect(parseReference('Heading 2')).toBeNull()
    expect(parseReference('Matthew 12:13 is great')).toBeNull()
  })
})

describe('mightBeReference', () => {
  it('keeps the slash menu open only while a reference is being typed', () => {
    for (const q of ['1 ', '1 C', 'Song of', 'Matthew ', 'Matthew 12', 'Matthew 12: ', 'Matthew 12: 13-', 'Mt 12:13 - 24']) {
      expect(mightBeReference(q), q).toBe(true)
    }
    for (const q of ['heading 2', 'hello world', 'Matthew 12 is', 'Nope 3', 'Matthew 12:13 and']) {
      expect(mightBeReference(q), q).toBe(false)
    }
  })
})

describe('referenceHint', () => {
  it('asks for a chapter instead of accepting a whole book', () => {
    expect(referenceHint('Matthew')).toBe('Add a chapter, e.g. Matthew 5 or Matthew 5:1–4')
    expect(referenceHint('Matthew 12:')).toBe('Add verses, e.g. Matthew 12:1 or Matthew 12:1–4')
    expect(referenceHint('Matthew 40')).toBe('Matthew has 28 chapters')
    expect(referenceHint('Jude')).toBe('Add a chapter, e.g. Jude 1 or Jude 1:1–4')
    expect(referenceHint('heading')).toBeNull()
  })
})
