import { describe, expect, it } from 'vitest'
import { createRackRescueControl } from './rack-rescue'
import type { RackMoveInput } from '../types'

const firstPlan: readonly RackMoveInput[] = [
  { dishId: 'RR-RED-MUG', column: 5, row: 3, orientation: 'north' },
  { dishId: 'RR-CHILD-CUP', column: 6, row: 0, orientation: 'north' },
  { dishId: 'RR-CUTLERY', column: 7, row: 2, orientation: 'north' },
  { dishId: 'RR-IVORY-PLATE-1', column: 0, row: 2, orientation: 'north' },
  { dishId: 'RR-IVORY-PLATE-2', column: 1, row: 2, orientation: 'north' },
  { dishId: 'RR-IVORY-PLATE-3', column: 2, row: 2, orientation: 'north' },
  { dishId: 'RR-IVORY-PLATE-4', column: 0, row: 4, orientation: 'east' },
  { dishId: 'RR-BLUE-PLATE-1', column: 2, row: 4, orientation: 'east' },
  { dishId: 'RR-BLUE-PLATE-2', column: 4, row: 4, orientation: 'east' },
  { dishId: 'RR-IVORY-BOWL-1', column: 3, row: 0, orientation: 'north' },
  { dishId: 'RR-IVORY-BOWL-2', column: 4, row: 0, orientation: 'north' },
  { dishId: 'RR-BLUE-BOWL-1', column: 4, row: 1, orientation: 'north' },
  { dishId: 'RR-BLUE-BOWL-2', column: 5, row: 1, orientation: 'north' },
]

const afterTray: readonly RackMoveInput[] = [
  ...firstPlan.filter((move) => move.dishId !== 'RR-IVORY-BOWL-1'),
  { dishId: 'RR-IVORY-BOWL-1', column: 6, row: 1, orientation: 'north' },
  { dishId: 'RR-ROASTING-TRAY', column: 0, row: 0, orientation: 'north' },
]

describe('Rack Rescue domain', () => {
  it('starts with thirteen visible dishes and a genuinely hidden tray', () => {
    const control = createRackRescueControl()
    const snapshot = control.getSnapshot()

    expect(snapshot.revision).toBe(0)
    expect(snapshot.dishes.filter((dish) => dish.visible)).toHaveLength(13)
    expect(snapshot.dishes.find((dish) => dish.id === 'RR-ROASTING-TRAY')).toBeUndefined()
    expect(snapshot.placements).toEqual([])
  })

  it('shows a blocked preview without moving dishes, then applies a corrected plan', () => {
    const control = createRackRescueControl()
    control.pinRedMug(0)
    const blocked = control.previewLoadPlan(
      1,
      firstPlan.map((move) =>
        move.dishId === 'RR-IVORY-PLATE-3'
          ? { ...move, column: 3, row: 2 }
          : move,
      ),
    )

    expect(blocked.preview?.valid).toBe(false)
    expect(blocked.preview?.conflicts.map((conflict) => conflict.code)).toContain('SPRAY_BLOCKED')
    expect(blocked.placements).toEqual([
      { dishId: 'RR-RED-MUG', column: 5, row: 3, orientation: 'north' },
    ])

    const corrected = control.previewLoadPlan(2, firstPlan)
    expect(corrected.preview).toMatchObject({ id: 'rack-preview-002', valid: true })
    const applied = control.applyLoadPlan(3, 'rack-preview-002')
    expect(applied.placements).toHaveLength(13)
    expect(applied.preview).toBeNull()
    expect(applied.undo?.token).toBe('rack-undo-001')
    expect(applied.placements.find((placement) => placement.dishId === 'RR-RED-MUG')).toMatchObject({
      column: 5,
      row: 3,
    })
  })

  it('invalidates the old plan when the tray appears and safely replans all fourteen dishes', () => {
    const control = createRackRescueControl()
    control.pinRedMug(0)
    control.previewLoadPlan(1, firstPlan)
    control.applyLoadPlan(2, 'rack-preview-001')
    const revealed = control.revealRoastingTray(3)

    expect(revealed.dishes.filter((dish) => dish.visible)).toHaveLength(14)
    expect(revealed.preview).toBeNull()
    expect(revealed.undo).toBeNull()

    const preview = control.previewLoadPlan(4, afterTray)
    expect(preview.preview?.valid).toBe(true)
    const applied = control.applyLoadPlan(5, 'rack-preview-002')
    expect(applied.placements).toHaveLength(14)
    expect(applied.placements.find((placement) => placement.dishId === 'RR-ROASTING-TRAY')).toMatchObject({
      column: 0,
      row: 0,
    })
    expect(applied.placements.find((placement) => placement.dishId === 'RR-IVORY-BOWL-1')).toMatchObject({
      column: 6,
      row: 1,
    })
    expect(applied.conflictCount).toBe(0)
  })

  it('rejects stale revisions, locked-mug movement and replayed Undo', () => {
    const control = createRackRescueControl()
    control.pinRedMug(0)
    expect(() => control.previewLoadPlan(0, firstPlan)).toThrow('Stale revision')

    const movedMug = firstPlan.map((move) =>
      move.dishId === 'RR-RED-MUG' ? { ...move, column: 6 } : move,
    )
    const blocked = control.previewLoadPlan(1, movedMug)
    expect(blocked.preview?.conflicts.map((conflict) => conflict.code)).toContain('LOCKED_DISH')

    control.previewLoadPlan(2, firstPlan)
    const applied = control.applyLoadPlan(3, 'rack-preview-002')
    const token = applied.undo!.token
    const undone = control.undoLoadPlan(4, token)
    expect(undone.placements).toHaveLength(1)
    expect(() => control.undoLoadPlan(5, token)).toThrow('unavailable')
  })
})
