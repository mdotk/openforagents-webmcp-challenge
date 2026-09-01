import { describe, expect, it } from 'vitest'
import { resolveExperience } from './experience'

describe('experience routing', () => {
  it('promotes shopping to the root and preserves its scenario query', () => {
    expect(resolveExperience('')).toBe('shopping')
    expect(resolveExperience('?scenario=tighter-budget')).toBe('shopping')
    expect(resolveExperience('?experience=shopping')).toBe('shopping')
  })

  it('keeps the earlier experiments on explicit routes', () => {
    expect(resolveExperience('?experience=launch-window')).toBe('launch-window')
    expect(resolveExperience('?experience=fitting-room')).toBe('fitting-room')
    expect(resolveExperience('?experience=rack-rescue')).toBe('rack-rescue')
  })
})
