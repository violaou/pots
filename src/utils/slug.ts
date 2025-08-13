/**
 * Create a URL-safe, human-readable slug from an arbitrary string.
 *
 * A slug is a stable identifier used in URLs, typically derived from a title.
 * It is lowercase, uses hyphens as separators, removes diacritics, and strips
 * non-alphanumeric characters. Example: "Tea Bowl (Shino Glaze)" → "tea-bowl-shino-glaze".
 *
 * Notes:
 * - Output is trimmed to a maximum reasonable length to keep URLs concise.
 * - Uniqueness is NOT enforced here; append a suffix at call sites if needed.
 */
export function toSlug(input: string): string {
  if (!input) return ''
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

export { toSlug as slugify }


