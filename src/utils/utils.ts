/* eslint-disable @typescript-eslint/no-explicit-any */
// Helpers to normalize snake_case payloads into our camelCase shapes
function pick(raw: any, ...keys: string[]): unknown {
  for (const key of keys) {
    const value = raw?.[key]
    if (value != null) return value
  }
  return undefined
}

export function pickString(raw: any, ...keys: string[]): string | undefined {
  const value = pick(raw, ...keys)
  return value == null ? undefined : String(value)
}

export function pickNumber(raw: any, ...keys: string[]): number | undefined {
  const value = pick(raw, ...keys)
  if (value == null) return undefined
  const numberValue = Number(value)
  return Number.isFinite(numberValue) ? numberValue : undefined
}

export function pickBoolean(raw: any, defaultValue: boolean, ...keys: string[]): boolean {
  const value = pick(raw, ...keys)
  return value == null ? defaultValue : Boolean(value)
}

export function pickDateString(raw: any, ...keys: string[]): string {
  return pickString(raw, ...keys) ?? new Date().toISOString()
}

export function withTrailingSlash(url: string): string {
  if (!url) return ''
  return url.endsWith('/') ? url : `${url}/`
}
