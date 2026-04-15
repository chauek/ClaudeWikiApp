import { describe, expect, it } from 'vitest'
import { isNewer, parseRelease } from './updater'

describe('isNewer', () => {
  it('returns true when remote major is greater', () => {
    expect(isNewer('1.0.0', '0.9.9')).toBe(true)
  })
  it('returns true when remote minor is greater', () => {
    expect(isNewer('0.4.0', '0.3.0')).toBe(true)
  })
  it('returns true when remote patch is greater', () => {
    expect(isNewer('0.3.1', '0.3.0')).toBe(true)
  })
  it('returns false when versions are equal', () => {
    expect(isNewer('0.3.0', '0.3.0')).toBe(false)
  })
  it('returns false when remote is older', () => {
    expect(isNewer('0.2.9', '0.3.0')).toBe(false)
  })
  it('treats missing segments as zero', () => {
    expect(isNewer('1.0', '1.0.0')).toBe(false)
    expect(isNewer('1.0.1', '1.0')).toBe(true)
  })
  it('strips a leading v', () => {
    expect(isNewer('v0.4.0', 'v0.3.0')).toBe(true)
    expect(isNewer('v0.4.0', '0.3.0')).toBe(true)
  })
})

const githubSample = {
  tag_name: 'v0.4.0',
  name: 'ClaudeWiki 0.4.0',
  body: '## Highlights\n- fancy new thing',
  html_url: 'https://github.com/chauek/ClaudeWikiApp/releases/tag/v0.4.0',
  published_at: '2026-04-15T12:00:00Z',
  assets: [
    { name: 'ClaudeWiki-0.4.0.dmg',
      browser_download_url: 'https://example.com/ClaudeWiki-0.4.0.dmg',
      size: 123456 },
    { name: 'ClaudeWiki-0.4.0.dmg.blockmap',
      browser_download_url: 'https://example.com/ClaudeWiki-0.4.0.dmg.blockmap',
      size: 99 }
  ]
}

describe('parseRelease', () => {
  it('maps GitHub JSON to ReleaseInfo', () => {
    const out = parseRelease(githubSample)
    expect(out).toEqual({
      tag: 'v0.4.0',
      version: '0.4.0',
      name: 'ClaudeWiki 0.4.0',
      notes: '## Highlights\n- fancy new thing',
      dmgUrl: 'https://example.com/ClaudeWiki-0.4.0.dmg',
      dmgSize: 123456,
      htmlUrl: 'https://github.com/chauek/ClaudeWikiApp/releases/tag/v0.4.0',
      publishedAt: '2026-04-15T12:00:00Z'
    })
  })

  it('throws when no .dmg asset is present', () => {
    const noDmg = { ...githubSample, assets: [] }
    expect(() => parseRelease(noDmg)).toThrow(/missing a DMG/i)
  })

  it('ignores .dmg.blockmap when picking the asset', () => {
    const onlyBlockmap = { ...githubSample,
      assets: [githubSample.assets[1]] }
    expect(() => parseRelease(onlyBlockmap)).toThrow(/missing a DMG/i)
  })

  it('defaults notes to empty string when body is null', () => {
    const nullBody = { ...githubSample, body: null }
    expect(parseRelease(nullBody).notes).toBe('')
  })
})
