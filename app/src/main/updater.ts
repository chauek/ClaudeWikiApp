import { EventEmitter } from 'node:events'
import { app, shell } from 'electron'
import { createWriteStream } from 'node:fs'
import { rename, unlink, mkdir } from 'node:fs/promises'
import { pipeline } from 'node:stream/promises'
import { Readable } from 'node:stream'
import { join } from 'node:path'
import type { ReleaseInfo, UpdateStatus } from '../shared/types'

const RELEASES_URL =
  'https://api.github.com/repos/chauek/ClaudeWikiApp/releases/latest'
const FETCH_TIMEOUT_MS = 10_000

// ── Pure helpers ──────────────────────────────────────────

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

// ── Module state ──────────────────────────────────────────

let status: UpdateStatus = { state: 'idle' }
let inFlightCheck: Promise<UpdateStatus> | null = null
let inFlightDownload: AbortController | null = null
const emitter = new EventEmitter()

export function getStatus(): UpdateStatus {
  return status
}

export function onStatusChange(
  listener: (s: UpdateStatus) => void
): () => void {
  emitter.on('status', listener)
  return () => emitter.off('status', listener)
}

function setStatus(next: UpdateStatus): void {
  status = next
  emitter.emit('status', next)
}

// ── Check flow ────────────────────────────────────────────

export async function checkNow(): Promise<UpdateStatus> {
  if (inFlightCheck) return inFlightCheck
  inFlightCheck = doCheck().finally(() => { inFlightCheck = null })
  return inFlightCheck
}

async function doCheck(): Promise<UpdateStatus> {
  setStatus({ state: 'checking' })

  // Dev-only mock short-circuit. Documented in the spec.
  const mock = process.env.UPDATER_MOCK
  if (mock) {
    return applyMock(mock)
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    const res = await fetch(RELEASES_URL, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/vnd.github+json',
        'User-Agent': `ClaudeWiki/${app.getVersion()}`
      }
    })
    clearTimeout(timeout)

    if (res.status === 404) {
      return finishCheckError('No stable release published yet')
    }
    if (res.status === 403 &&
        res.headers.get('x-ratelimit-remaining') === '0') {
      return finishCheckError('GitHub rate limit hit — try later')
    }
    if (!res.ok) {
      return finishCheckError(`GitHub returned HTTP ${res.status}`)
    }

    const json = await res.json()
    const latest = parseRelease(json)
    const local = app.getVersion()
    const checkedAt = Date.now()
    if (isNewer(latest.version, local)) {
      setStatus({ state: 'available', latest, checkedAt })
    } else {
      setStatus({ state: 'up-to-date', checkedAt })
    }
    return status
  } catch (err: unknown) {
    clearTimeout(timeout)
    const msg = err instanceof Error && err.name === 'AbortError'
      ? 'No internet connection'
      : err instanceof Error ? shortenFetchError(err.message)
      : 'Check failed'
    return finishCheckError(msg)
  }
}

function shortenFetchError(raw: string): string {
  // `fetch failed` / `getaddrinfo ENOTFOUND api.github.com` etc.
  if (/ENOTFOUND|ECONNREFUSED|ETIMEDOUT|network|fetch failed/i.test(raw)) {
    return 'No internet connection'
  }
  if (/missing a DMG/i.test(raw)) return 'Release is missing a DMG asset'
  return raw
}

function finishCheckError(message: string): UpdateStatus {
  console.warn('[updater] check error:', message)
  setStatus({
    state: 'error', phase: 'check', message, checkedAt: Date.now()
  })
  return status
}

// ── Dev-only mock ─────────────────────────────────────────

function applyMock(mock: string): UpdateStatus {
  const fakeRelease: ReleaseInfo = {
    tag: 'v9.9.9',
    version: '9.9.9',
    name: 'Mock release',
    notes: '## Mock\n- pretend notes',
    dmgUrl: 'https://example.invalid/mock.dmg',
    dmgSize: 100_000_000,
    htmlUrl: 'https://github.com/chauek/ClaudeWikiApp',
    publishedAt: new Date().toISOString()
  }
  const now = Date.now()
  switch (mock) {
    case 'available':
      setStatus({ state: 'available', latest: fakeRelease, checkedAt: now })
      break
    case 'up-to-date':
      setStatus({ state: 'up-to-date', checkedAt: now })
      break
    case 'downloading':
      setStatus({ state: 'downloading', latest: fakeRelease,
        received: 30_000_000, total: 100_000_000 })
      break
    case 'downloaded':
      setStatus({ state: 'downloaded', latest: fakeRelease,
        dmgPath: '/tmp/mock.dmg' })
      break
    case 'error':
      setStatus({ state: 'error', phase: 'check',
        message: 'Mocked error', checkedAt: now })
      break
    default:
      setStatus({ state: 'idle' })
  }
  return status
}

// ── Download flow ─────────────────────────────────────────

export async function downloadDmg(): Promise<UpdateStatus> {
  if (status.state !== 'available') {
    throw new Error(
      `downloadDmg called from invalid state: ${status.state}`
    )
  }
  if (inFlightDownload) return status
  const { latest } = status
  const downloadsDir = app.getPath('downloads')
  await mkdir(downloadsDir, { recursive: true })
  const finalPath = join(downloadsDir, `ClaudeWiki-${latest.version}.dmg`)
  const partPath = `${finalPath}.part`

  setStatus({
    state: 'downloading', latest,
    received: 0, total: latest.dmgSize
  })

  inFlightDownload = new AbortController()
  try {
    const res = await fetch(latest.dmgUrl,
      { signal: inFlightDownload.signal })
    if (!res.ok || !res.body) {
      throw new Error(`HTTP ${res.status}`)
    }

    const total = Number(res.headers.get('content-length')) ||
      latest.dmgSize
    let received = 0
    let lastEmit = 0
    const ws = createWriteStream(partPath)
    const nodeStream = Readable.fromWeb(
      res.body as unknown as import('node:stream/web').ReadableStream
    )
    nodeStream.on('data', (chunk: Buffer) => {
      received += chunk.length
      const now = Date.now()
      if (now - lastEmit > 250) {
        lastEmit = now
        setStatus({ state: 'downloading', latest, received, total })
      }
    })

    await pipeline(nodeStream, ws)
    await rename(partPath, finalPath)

    setStatus({ state: 'downloaded', latest, dmgPath: finalPath })
    return status
  } catch (err: unknown) {
    await unlink(partPath).catch(() => { /* best-effort cleanup */ })
    const raw = err instanceof Error ? err.message : String(err)
    const msg = err instanceof Error && err.name === 'AbortError'
      ? 'Download cancelled'
      : `Download failed: ${raw}`
    console.warn('[updater] download error:', msg)
    setStatus({
      state: 'error', phase: 'download',
      message: msg, checkedAt: Date.now()
    })
    return status
  } finally {
    inFlightDownload = null
  }
}

export async function revealDmg(): Promise<void> {
  if (status.state !== 'downloaded') return
  shell.showItemInFolder(status.dmgPath)
}
