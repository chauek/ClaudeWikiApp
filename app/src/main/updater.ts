import type { ReleaseInfo } from '../shared/types'

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

interface GithubAsset {
  name: string
  browser_download_url: string
  size: number
}

interface GithubRelease {
  tag_name: string
  name: string | null
  body: string | null
  html_url: string
  published_at: string
  assets: GithubAsset[]
}

export function parseRelease(raw: unknown): ReleaseInfo {
  const r = raw as GithubRelease
  const dmg = r.assets.find(
    (a) => a.name.toLowerCase().endsWith('.dmg') &&
           !a.name.toLowerCase().endsWith('.blockmap')
  )
  if (!dmg) {
    throw new Error('Release is missing a DMG asset')
  }
  return {
    tag: r.tag_name,
    version: r.tag_name.replace(/^v/, ''),
    name: r.name ?? r.tag_name,
    notes: r.body ?? '',
    dmgUrl: dmg.browser_download_url,
    dmgSize: dmg.size,
    htmlUrl: r.html_url,
    publishedAt: r.published_at
  }
}
