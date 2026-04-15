import { describe, expect, it } from 'vitest'
import { isNewer } from './updater'

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
