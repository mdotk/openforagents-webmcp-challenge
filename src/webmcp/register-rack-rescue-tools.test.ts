import { describe, expect, it } from 'vitest'
import { createRackRescueControl } from '../domain'
import type { WebMcpModelContext, WebMcpTool } from '../types'
import {
  permanentRackRescueToolNames,
  registerRackRescueTools,
} from './register-rack-rescue-tools'

class FakeModelContext implements WebMcpModelContext {
  readonly tools = new Map<string, WebMcpTool>()
  readonly listeners = new Set<EventListenerOrEventListenerObject>()

  async registerTool(tool: WebMcpTool, options: { readonly signal: AbortSignal }) {
    if (options.signal.aborted) throw new DOMException('Cancelled', 'AbortError')
    this.tools.set(tool.name, tool)
    options.signal.addEventListener('abort', () => {
      this.tools.delete(tool.name)
      this.emit()
    }, { once: true })
    this.emit()
  }

  async getTools() {
    return [...this.tools.values()].map(({ name }) => ({ name }))
  }

  addEventListener(_type: 'toolchange', listener: EventListenerOrEventListenerObject) {
    this.listeners.add(listener)
  }

  removeEventListener(_type: 'toolchange', listener: EventListenerOrEventListenerObject) {
    this.listeners.delete(listener)
  }

  invoke(name: string, args: Record<string, unknown> = {}, signal?: AbortSignal) {
    const tool = this.tools.get(name)
    if (!tool) throw new Error(`Missing tool ${name}`)
    return tool.execute(args, { signal })
  }

  private emit() {
    const event = new Event('toolchange')
    for (const listener of this.listeners) {
      if (typeof listener === 'function') listener(event)
      else listener.handleEvent(event)
    }
  }
}

const moves = [
  ['RR-RED-MUG', 5, 3, 'north'], ['RR-CHILD-CUP', 6, 0, 'north'],
  ['RR-CUTLERY', 7, 2, 'north'], ['RR-IVORY-PLATE-1', 0, 2, 'north'],
  ['RR-IVORY-PLATE-2', 1, 2, 'north'], ['RR-IVORY-PLATE-3', 2, 2, 'north'],
  ['RR-IVORY-PLATE-4', 0, 4, 'east'], ['RR-BLUE-PLATE-1', 2, 4, 'east'],
  ['RR-BLUE-PLATE-2', 4, 4, 'east'], ['RR-IVORY-BOWL-1', 3, 0, 'north'],
  ['RR-IVORY-BOWL-2', 4, 0, 'north'], ['RR-BLUE-BOWL-1', 4, 1, 'north'],
  ['RR-BLUE-BOWL-2', 5, 1, 'north'],
].map(([dish_id, column, row, orientation]) => ({ dish_id, column, row, orientation }))

const movesAfterTray = [
  ...moves.filter((move) => move.dish_id !== 'RR-IVORY-BOWL-1'),
  { dish_id: 'RR-IVORY-BOWL-1', column: 6, row: 1, orientation: 'north' },
  { dish_id: 'RR-ROASTING-TRAY', column: 0, row: 0, orientation: 'north' },
]

describe('registerRackRescueTools', () => {
  it('registers exactly five closed-schema tools and no hidden solver or commerce tool', async () => {
    const modelContext = new FakeModelContext()
    const registration = await registerRackRescueTools(createRackRescueControl(), { modelContext })

    expect(await registration.getRegisteredToolNames()).toEqual([...permanentRackRescueToolNames].sort())
    expect(modelContext.tools.size).toBe(5)
    expect([...modelContext.tools.values()].every((tool) => tool.inputSchema.additionalProperties === false)).toBe(true)
    expect([...modelContext.tools.keys()].join(' ')).not.toMatch(/solver|checkout|payment|order|cycle/)

    await registration.dispose()
    expect(modelContext.tools.size).toBe(0)
    expect(modelContext.listeners.size).toBe(0)
  })

  it('returns a terminal rack read and structured visible conflicts', async () => {
    const control = createRackRescueControl()
    control.pinRedMug(0, 0, 5)
    const modelContext = new FakeModelContext()
    const registration = await registerRackRescueTools(control, { modelContext })

    const read = await modelContext.invoke('get_rack_state')
    expect(read.content[0]?.text).toContain('do not repeat the read')
    expect(read.content[0]?.text).toContain('red mug pinned by the person')
    expect((read.structuredContent as { dishes: unknown[] }).dishes[0]).toMatchObject({
      id: 'RR-RED-MUG',
      kind: 'mug',
      lockedByHuman: true,
      placement: { dishId: 'RR-RED-MUG', column: 0, row: 5 },
    })
    expect(
      (read.structuredContent as { dishTypes: Record<string, unknown> })
        .dishTypes.mug,
    ).toMatchObject({
        footprints: {
          north: { columns: 1, rows: 1 },
          east: { columns: 1, rows: 1 },
        },
        placementRules: ['Keep the exact human-pinned placement when locked.'],
    })
    expect(JSON.stringify(read.structuredContent).length).toBeLessThan(7500)

    const inspected = await modelContext.invoke('inspect_dishes', {
      dish_ids: ['RR-IVORY-PLATE-1', 'RR-CHILD-CUP'],
    })
    expect(inspected.structuredContent).toMatchObject([
      {
        id: 'RR-IVORY-PLATE-1',
        allowedOrientations: ['north', 'east'],
        footprints: {
          north: { columns: 1, rows: 2 },
          east: { columns: 2, rows: 1 },
        },
      },
      {
        id: 'RR-CHILD-CUP',
        placementRules: ['Place in columns 6–7 and rows 0–1.'],
      },
    ])

    const blockedMoves = moves.map((move) => {
      if (move.dish_id === 'RR-RED-MUG') return { ...move, column: 0, row: 5 }
      if (move.dish_id === 'RR-IVORY-PLATE-3') return { ...move, column: 3 }
      return move
    })
    const blocked = await modelContext.invoke('preview_load_plan', {
      expected_revision: 1,
      moves: blockedMoves,
    })
    expect(blocked.content[0]?.text).toContain('Nothing moved')
    expect(blocked.structuredContent).toMatchObject({ valid: false })
    expect(control.getSnapshot().placements).toHaveLength(1)

    const movedLockedMug = await modelContext.invoke('preview_load_plan', {
      expected_revision: 2,
      moves,
    })
    expect(
      (movedLockedMug.structuredContent as { conflicts: { code: string }[] })
        .conflicts.map((conflict) => conflict.code),
    ).toContain('LOCKED_DISH')
    expect(control.getSnapshot().placements).toEqual([
      { dishId: 'RR-RED-MUG', column: 0, row: 5, orientation: 'north' },
    ])

    await registration.dispose()
  })

  it('applies only an exact valid preview and creates a one-use Undo', async () => {
    const control = createRackRescueControl()
    control.pinRedMug(0, 5, 3)
    const modelContext = new FakeModelContext()
    const registration = await registerRackRescueTools(control, { modelContext })

    const preview = await modelContext.invoke('preview_load_plan', {
      expected_revision: 1,
      moves,
    })
    expect(preview.structuredContent).toMatchObject({ id: 'rack-preview-001', valid: true })
    const applied = await modelContext.invoke('apply_load_plan', {
      expected_revision: 2,
      preview_id: 'rack-preview-001',
    })
    expect(applied.content[0]?.text).toContain('red mug remains pinned')
    expect(applied.structuredContent).toMatchObject({ undo: { token: 'rack-undo-001' } })

    const undone = await modelContext.invoke('undo_load_plan', {
      expected_revision: 3,
      undo_token: 'rack-undo-001',
    })
    expect(undone.content[0]?.text).toContain('undone once')
    await expect(Promise.resolve(modelContext.invoke('undo_load_plan', {
      expected_revision: 4,
      undo_token: 'rack-undo-001',
    }))).rejects.toThrow('unavailable')

    await registration.dispose()
  })

  it('adapts through the WebMCP tools when the forgotten tray appears', async () => {
    const control = createRackRescueControl()
    control.pinRedMug(0, 5, 3)
    const modelContext = new FakeModelContext()
    const registration = await registerRackRescueTools(control, { modelContext })

    const firstPreview = await modelContext.invoke('preview_load_plan', {
      expected_revision: 1,
      moves,
    })
    expect(firstPreview.structuredContent).toMatchObject({
      id: 'rack-preview-001',
      valid: true,
      conflicts: [],
    })
    await modelContext.invoke('apply_load_plan', {
      expected_revision: 2,
      preview_id: 'rack-preview-001',
    })

    control.revealRoastingTray(3)
    const changed = await modelContext.invoke('get_rack_state')
    expect(changed.structuredContent).toMatchObject({
      revision: 4,
      roastingTrayRevealed: true,
    })
    expect(
      (changed.structuredContent as { dishes: { id: string }[] }).dishes,
    ).toHaveLength(14)

    const secondPreview = await modelContext.invoke('preview_load_plan', {
      expected_revision: 4,
      moves: movesAfterTray,
    })
    expect(secondPreview.structuredContent).toMatchObject({
      id: 'rack-preview-002',
      valid: true,
      conflicts: [],
    })
    const applied = await modelContext.invoke('apply_load_plan', {
      expected_revision: 5,
      preview_id: 'rack-preview-002',
    })
    expect(applied.structuredContent).toMatchObject({
      revision: 6,
      conflictCount: 0,
    })
    const final = control.getSnapshot()
    expect(final.placements).toHaveLength(14)
    expect(final.placements).toContainEqual({
      dishId: 'RR-ROASTING-TRAY',
      column: 0,
      row: 0,
      orientation: 'north',
    })
    expect(final.placements).toContainEqual({
      dishId: 'RR-RED-MUG',
      column: 5,
      row: 3,
      orientation: 'north',
    })

    await registration.dispose()
  })

  it('does not mutate when an execution is cancelled before commit', async () => {
    const control = createRackRescueControl()
    control.pinRedMug(0, 5, 3)
    const modelContext = new FakeModelContext()
    const registration = await registerRackRescueTools(control, { modelContext })
    const abort = new AbortController()

    const execution = modelContext.invoke('preview_load_plan', {
      expected_revision: 1,
      moves,
    }, abort.signal)
    abort.abort()
    await expect(execution).rejects.toMatchObject({ name: 'AbortError' })
    expect(control.getSnapshot()).toMatchObject({ revision: 1, preview: null })

    await registration.dispose()
  })
})
