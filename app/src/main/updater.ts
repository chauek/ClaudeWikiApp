export function isNewer(remote: string, local: string): boolean {
  const parse = (v: string): number[] =>
    v.replace(/^v/, '').split('.').map((n) => Number.parseInt(n, 10) || 0)
  const r = parse(remote)
  const l = parse(local)
  const len = Math.max(r.length, l.length, 3)
  for (let i = 0; i < len; i++) {
    const a = r[i] ?? 0
    const b = l[i] ?? 0
    if (a > b) return true
    if (a < b) return false
  }
  return false
}
