import { describe, expect, it } from 'vitest'
import { resolveExperience } from './experience'

describe('experience routing', () => {
  it('promotes WORLDLINE to the root and keeps shopping explicit', () => {
    expect(resolveExperience('')).toBe('worldline')
    expect(resolveExperience('?scenario=tighter-budget')).toBe('worldline')
    expect(resolveExperience('?experience=shopping')).toBe('shopping')
    expect(resolveExperience('?experience=shopping&scenario=tighter-budget')).toBe('shopping')
  })

  it('keeps the earlier experiments on explicit routes', () => {
    expect(resolveExperience('?experience=worldline')).toBe('worldline')
    expect(resolveExperience('?experience=launch-window')).toBe('launch-window')
    expect(resolveExperience('?experience=fitting-room')).toBe('fitting-room')
    expect(resolveExperience('?experience=rack-rescue')).toBe('rack-rescue')
  })
})
