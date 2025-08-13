import { describe, expect, it } from 'vitest'
import { toSlug } from './slug'

describe('toSlug', () => {
  it('lowercases and replaces spaces with hyphens', () => {
    expect(toSlug('Blue Vase 2025')).toBe('blue-vase-2025')
  })

  it('removes diacritics', () => {
    expect(toSlug('Café Crème Brûlée')).toBe('cafe-creme-brulee')
  })

  it('strips non-alphanumeric characters', () => {
    expect(toSlug('Tea Bowl (Shino Glaze)!')).toBe('tea-bowl-shino-glaze')
  })

  it('trims leading and trailing hyphens', () => {
    expect(toSlug('---Hello---World---')).toBe('hello-world')
  })

  it('handles empty input', () => {
    expect(toSlug('')).toBe('')
  })

  it('enforces a max length', () => {
    const long = 'a'.repeat(200)
    expect(toSlug(long).length).toBeLessThanOrEqual(80)
  })
})


