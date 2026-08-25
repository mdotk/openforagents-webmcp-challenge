import type {
  MissionControl,
  MissionSnapshot,
  MissionSubsystemId,
  MissionToolsRegistration,
  PowerRerouteGrant,
  WebMcpDocumentScope,
  WebMcpTool,
  WebMcpToolResult,
} from '../types'

export const permanentMissionToolNames = Object.freeze([
  'mission_status',
  'inspect_subsystem',
  'repair_procedures',
  'view_repair_plan',
  'restart_comms_relay',
  'recalibrate_nav_array',
  'request_power_reroute',
] as const)

const APPLY_POWER_REROUTE_TOOL_NAME = 'apply_power_reroute'
const allMissionToolNames = new Set<string>([
  ...permanentMissionToolNames,
  APPLY_POWER_REROUTE_TOOL_NAME,
])

const emptySchema = Object.freeze({
  type: 'object' as const,
  properties: Object.freeze({}),
  required: Object.freeze([]),
  additionalProperties: false as const,
})

const subsystemSchema = Object.freeze({
  type: 'object' as const,
  properties: Object.freeze({
    subsystem_id: Object.freeze({
      type: 'string',
      enum: Object.freeze([
        'communications-relay',
        'navigation-array',
        'guidance-power',
      ]),
    }),
  }),
  required: Object.freeze(['subsystem_id']),
  additionalProperties: false as const,
})

const revisionSchema = Object.freeze({
  type: 'object' as const,
  properties: Object.freeze({
    expected_revision: Object.freeze({ type: 'integer', minimum: 0 }),
  }),
  required: Object.freeze(['expected_revision']),
  additionalProperties: false as const,
})

function result(value: unknown): WebMcpToolResult {
  return {
    content: [{ type: 'text', text: JSON.stringify(value) }],
  }
}

function getExpectedRevision(args: Record<string, unknown>): number {
  const revision = args.expected_revision
  if (!Number.isInteger(revision) || (revision as number) < 0) {
    throw new TypeError('expected_revision must be a non-negative integer.')
  }
  return revision as number
}

function getSubsystemId(args: Record<string, unknown>): MissionSubsystemId {
  const id = args.subsystem_id
  if (
    id !== 'communications-relay' &&
    id !== 'navigation-array' &&
    id !== 'guidance-power'
  ) {
    throw new TypeError('subsystem_id does not identify a mission subsystem.')
  }
  return id
}

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error))
}

function throwIfAborted(signal?: AbortSignal) {
  if (signal?.aborted) {
    throw signal.reason instanceof Error
      ? signal.reason
      : new DOMException('Tool execution was cancelled.', 'AbortError')
  }
}

const ABORTABLE_COMMIT_DELAY_MS = 75

function waitForAbortableCommit(signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      throwIfAborted(signal)
    } catch (error) {
      reject(error)
      return
    }

    let timer: ReturnType<typeof setTimeout>
    const cleanup = () => {
      clearTimeout(timer)
      signal?.removeEventListener('abort', onAbort)
    }
    const onAbort = () => {
      cleanup()
      reject(
        signal?.reason instanceof Error
          ? signal.reason
          : new DOMException('Tool execution was cancelled.', 'AbortError'),
      )
    }
    signal?.addEventListener('abort', onAbort, { once: true })
    timer = setTimeout(() => {
      cleanup()
      try {
        throwIfAborted(signal)
        resolve()
      } catch (error) {
        reject(error)
      }
    }, ABORTABLE_COMMIT_DELAY_MS)
  })
}

function createPermanentTools(control: MissionControl): readonly WebMcpTool[] {
  const readOnlyAnnotations = {
    readOnlyHint: true,
    untrustedContentHint: false,
  } as const
  const writeAnnotations = {
    readOnlyHint: false,
    untrustedContentHint: false,
  } as const

  return [
    {
      name: 'mission_status',
      description: 'Read the current simulated mission state and revision.',
      inputSchema: emptySchema,
      annotations: readOnlyAnnotations,
      execute: () => result(control.getSnapshot()),
    },
    {
      name: 'inspect_subsystem',
      description: 'Inspect one simulated launch subsystem.',
      inputSchema: subsystemSchema,
      annotations: readOnlyAnnotations,
      execute: (args) => {
        const subsystemId = getSubsystemId(args)
        const system = control
          .getSnapshot()
          .systems.find((candidate) => candidate.id === subsystemId)
        if (!system) {
          throw new Error(`Subsystem ${subsystemId} is not available.`)
        }
        return result(system)
      },
    },
    {
      name: 'repair_procedures',
      description: 'Read the local repair procedure for one subsystem.',
      inputSchema: subsystemSchema,
      annotations: readOnlyAnnotations,
      execute: (args) => {
        const subsystemId = getSubsystemId(args)
        const procedure = control
          .getSnapshot()
          .repairPlan.find((step) => step.subsystemId === subsystemId)
        if (!procedure) {
          throw new Error(`No repair procedure exists for ${subsystemId}.`)
        }
        return result(procedure)
      },
    },
    {
      name: 'view_repair_plan',
      description: 'Read the ordered repair plan and current step states.',
      inputSchema: emptySchema,
      annotations: readOnlyAnnotations,
      execute: () => {
        const current = control.getSnapshot()
        return result({ revision: current.revision, steps: current.repairPlan })
      },
    },
    {
      name: 'restart_comms_relay',
      description: 'Restart the simulated communications relay.',
      inputSchema: revisionSchema,
      annotations: writeAnnotations,
      execute: async (args, context) => {
        await waitForAbortableCommit(context?.signal)
        return result(
          control.restartCommunicationsRelay(getExpectedRevision(args)),
        )
      },
    },
    {
      name: 'recalibrate_nav_array',
      description: 'Recalibrate the simulated navigation array.',
      inputSchema: revisionSchema,
      annotations: writeAnnotations,
      execute: async (args, context) => {
        await waitForAbortableCommit(context?.signal)
        return result(
          control.recalibrateNavigationArray(getExpectedRevision(args)),
        )
      },
    },
    {
      name: 'request_power_reroute',
      description:
        'Request human approval for the simulated 15 kW guidance power reroute.',
      inputSchema: revisionSchema,
      annotations: writeAnnotations,
      execute: async (args, context) => {
        await waitForAbortableCommit(context?.signal)
        return result(control.requestPowerReroute(getExpectedRevision(args)))
      },
    },
  ]
}

function defaultDocumentScope(): WebMcpDocumentScope | undefined {
  if (typeof document === 'undefined') return undefined
  return document as unknown as WebMcpDocumentScope
}

export async function registerMissionTools(
  control: MissionControl,
  documentScope: WebMcpDocumentScope | undefined = defaultDocumentScope(),
): Promise<MissionToolsRegistration> {
  const modelContext = documentScope?.modelContext
  const supported = Boolean(
    modelContext &&
      typeof modelContext.registerTool === 'function' &&
      typeof modelContext.getTools === 'function',
  )
  let lastError: Error | null = null
  let disposed = false
  let registeredToolNames = new Set<string>()
  let work = Promise.resolve()
  let inventoryWork = Promise.resolve()
  const permanentController = new AbortController()
  let grantController: AbortController | null = null
  let registeredGrantId: string | null = null
  let unsubscribe = () => {}

  const recordError = (error: unknown) => {
    lastError = toError(error)
  }

  const refreshInventory = async () => {
    if (!modelContext) {
      registeredToolNames = new Set()
      return
    }
    const tools = await modelContext.getTools()
    registeredToolNames = new Set(
      tools
        .map((tool) => tool.name)
        .filter((name) => allMissionToolNames.has(name)),
    )
  }

  const scheduleInventoryRefresh = () => {
    inventoryWork = inventoryWork.then(refreshInventory).catch(recordError)
  }

  const toolChangeListener: EventListener = () => scheduleInventoryRefresh()

  const enqueue = (task: () => Promise<void>) => {
    work = work.then(task).catch(recordError)
  }

  const createGrantTool = (
    grant: PowerRerouteGrant,
    registrationController: AbortController,
  ): WebMcpTool => ({
    name: APPLY_POWER_REROUTE_TOOL_NAME,
    description:
      'Use the current one-use authorization to reroute 15 kW to guidance.',
    inputSchema: {
      type: 'object',
      properties: {
        grant_id: { type: 'string', const: grant.id },
      },
      required: ['grant_id'],
      additionalProperties: false,
    },
    annotations: {
      readOnlyHint: false,
      untrustedContentHint: false,
    },
    execute: async (args, context) => {
      if (args.grant_id !== grant.id) {
        throw new Error('grant_id does not match the active authorization.')
      }
      await waitForAbortableCommit(context?.signal)
      const nextSnapshot = control.applyPowerReroute(
        grant.id,
        control.getSnapshot().revision,
      )
      registrationController.abort()
      if (grantController === registrationController) {
        grantController = null
        registeredGrantId = null
      }
      scheduleInventoryRefresh()
      return result({
        applied: true,
        authorizationConsumed: true,
        snapshot: nextSnapshot,
      })
    },
  })

  const reconcileGrant = async (grant: PowerRerouteGrant | null) => {
    if (disposed || !modelContext) return
    if (grant?.id === registeredGrantId && !grantController?.signal.aborted) {
      return
    }

    grantController?.abort()
    grantController = null
    registeredGrantId = null

    if (grant) {
      const controller = new AbortController()
      grantController = controller
      registeredGrantId = grant.id
      try {
        await modelContext.registerTool(createGrantTool(grant, controller), {
          signal: controller.signal,
        })
      } catch (error) {
        controller.abort()
        if (grantController === controller) {
          grantController = null
          registeredGrantId = null
        }
        throw error
      }

      if (disposed || control.getSnapshot().activeGrant?.id !== grant.id) {
        controller.abort()
        if (grantController === controller) {
          grantController = null
          registeredGrantId = null
        }
      }
    }
    await refreshInventory()
  }

  const whenIdle = async () => {
    while (true) {
      const currentWork = work
      const currentInventoryWork = inventoryWork
      await Promise.all([currentWork, currentInventoryWork])
      if (currentWork === work && currentInventoryWork === inventoryWork) return
    }
  }

  const registration: MissionToolsRegistration = {
    supported,
    permanentToolNames: permanentMissionToolNames,
    async getRegisteredToolNames() {
      await whenIdle()
      try {
        await refreshInventory()
      } catch (error) {
        recordError(error)
      }
      return [...registeredToolNames].sort()
    },
    getLastError: () => lastError,
    whenIdle,
    async dispose() {
      if (disposed) return
      disposed = true
      unsubscribe()
      modelContext?.removeEventListener?.('toolchange', toolChangeListener)
      grantController?.abort()
      grantController = null
      registeredGrantId = null
      permanentController.abort()
      scheduleInventoryRefresh()
      await whenIdle()
    },
  }

  if (!supported || !modelContext) return registration

  modelContext.addEventListener?.('toolchange', toolChangeListener)
  const outcomes = await Promise.allSettled(
    createPermanentTools(control).map((tool) =>
      modelContext.registerTool(tool, { signal: permanentController.signal }),
    ),
  )
  for (const outcome of outcomes) {
    if (outcome.status === 'rejected') recordError(outcome.reason)
  }
  await refreshInventory().catch(recordError)

  unsubscribe = control.subscribe((nextSnapshot: MissionSnapshot) => {
    enqueue(() => reconcileGrant(nextSnapshot.activeGrant))
  })
  enqueue(() => reconcileGrant(control.getSnapshot().activeGrant))
  await whenIdle()

  return registration
}
