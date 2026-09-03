import type {
  BurnGrant,
  SciencePacketId,
  WebMcpDocumentScope,
  WebMcpTool,
  WebMcpToolResult,
  WorldlineControl,
  WorldlineToolsRegistration,
} from '../types'

export const initialWorldlineToolNames = Object.freeze([
  'read_mission_state',
  'inspect_science_packets',
  'read_signal_window',
  'simulate_worldline',
  'update_shared_plan',
  'request_burn_review',
] as const)

export const EXECUTE_AUTHORIZED_BURN_TOOL_NAME = 'execute_authorized_burn'

export const finalWorldlineToolNames = Object.freeze([
  'read_final_state',
  'verify_transmission_receipt',
] as const)

const allNames = new Set<string>([
  ...initialWorldlineToolNames,
  EXECUTE_AUTHORIZED_BURN_TOOL_NAME,
  ...finalWorldlineToolNames,
])

const packetIds = Object.freeze([
  'gravity-map',
  'horizon-spectrum',
  'navigation-archive',
] as const)

const emptySchema = Object.freeze({
  type: 'object' as const,
  properties: Object.freeze({}),
  required: Object.freeze([]),
  additionalProperties: false as const,
})

const revision = Object.freeze({ type: 'integer', minimum: 0 })

const simulationSchema = Object.freeze({
  type: 'object' as const,
  properties: Object.freeze({
    expected_revision: revision,
    burn_at_probe_second: Object.freeze({ type: 'integer', minimum: 34, maximum: 58 }),
    delta_v_mps: Object.freeze({ type: 'integer', minimum: 1800, maximum: 3800 }),
    packet_ids: Object.freeze({
      type: 'array',
      items: Object.freeze({ type: 'string', enum: packetIds }),
      uniqueItems: true,
      minItems: 0,
      maxItems: 3,
    }),
  }),
  required: Object.freeze(['expected_revision', 'burn_at_probe_second', 'delta_v_mps', 'packet_ids']),
  additionalProperties: false as const,
})

const planSchema = Object.freeze({
  type: 'object' as const,
  properties: Object.freeze({
    expected_revision: revision,
    simulation_id: Object.freeze({ type: 'string', minLength: 1, maxLength: 40 }),
    title: Object.freeze({ type: 'string', minLength: 1, maxLength: 80 }),
    rationale: Object.freeze({ type: 'string', minLength: 1, maxLength: 240 }),
  }),
  required: Object.freeze(['expected_revision', 'simulation_id', 'title', 'rationale']),
  additionalProperties: false as const,
})

const reviewSchema = Object.freeze({
  type: 'object' as const,
  properties: Object.freeze({
    expected_revision: revision,
    plan_id: Object.freeze({ type: 'string', const: 'shared-plan-01' }),
  }),
  required: Object.freeze(['expected_revision', 'plan_id']),
  additionalProperties: false as const,
})

function result(summary: string, structuredContent: unknown): WebMcpToolResult {
  return { content: [{ type: 'text', text: summary }], structuredContent }
}

function integer(args: Record<string, unknown>, key: string) {
  const value = args[key]
  if (!Number.isInteger(value)) throw new TypeError(`${key} must be an integer.`)
  return value as number
}

function text(args: Record<string, unknown>, key: string, maximum: number) {
  const value = args[key]
  if (typeof value !== 'string' || !value.trim() || value.length > maximum) {
    throw new TypeError(`${key} must contain 1 to ${maximum} characters.`)
  }
  return value
}

function selectedPackets(args: Record<string, unknown>): readonly SciencePacketId[] {
  const value = args.packet_ids
  if (!Array.isArray(value) || value.length > 3 || new Set(value).size !== value.length) {
    throw new TypeError('packet_ids must contain zero to three unique packet IDs.')
  }
  if (!value.every((id) => typeof id === 'string' && packetIds.includes(id as SciencePacketId))) {
    throw new TypeError('packet_ids contains an unsupported packet.')
  }
  return value as readonly SciencePacketId[]
}

type ActivityReporter = (message: string) => void

function createPlanningTools(control: WorldlineControl, reportActivity: ActivityReporter): readonly WebMcpTool[] {
  const readOnly = { readOnlyHint: true, untrustedContentHint: false } as const
  const write = { readOnlyHint: false, untrustedContentHint: false } as const
  return [
    {
      name: 'read_mission_state',
      description: 'Read the current educational mission revision, clocks, fuel, contact window, shared plan and authority state once.',
      inputSchema: emptySchema,
      annotations: readOnly,
      execute: () => {
        const snapshot = control.getSnapshot()
        reportActivity('Mission state inspected')
        return result(
          `Mission revision ${snapshot.revision}; phase ${snapshot.phase}; ${snapshot.contactSecondsRemaining} probe-seconds of contact remain; temporary burn capability ${snapshot.activeGrant ? 'active' : 'not active'}. Use this result and do not repeat the read in the same turn.`,
          {
            revision: snapshot.revision,
            phase: snapshot.phase,
            earthElapsedSeconds: snapshot.earthElapsedSeconds,
            probeElapsedSeconds: snapshot.probeElapsedSeconds,
            fuelKilograms: snapshot.fuelKilograms,
            contactSecondsRemaining: snapshot.contactSecondsRemaining,
            simulationsTested: snapshot.simulations.length,
            plan: snapshot.plan,
            review: snapshot.review,
            receipt: snapshot.receipt,
            temporaryBurnCapabilityActive: Boolean(snapshot.activeGrant),
          },
        )
      },
    },
    {
      name: 'inspect_science_packets',
      description: 'Inspect the size, uniqueness, replication status and bounded scientific value of all three waiting data packets.',
      inputSchema: emptySchema,
      annotations: readOnly,
      execute: () => {
        reportActivity('Three science packets inspected')
        return result('Three packets inspected. Two are unique and total 30 MB; the 72 MB navigation archive is already replicated on Earth.', control.getSnapshot().packets)
      },
    },
    {
      name: 'read_signal_window',
      description: 'Read the current downlink rate, remaining probe contact time and how the Earth and probe clocks relate in this educational simulation.',
      inputSchema: emptySchema,
      annotations: readOnly,
      execute: () => {
        const snapshot = control.getSnapshot()
        reportActivity('Final signal window inspected')
        return result(
          `The probe has ${snapshot.contactSecondsRemaining} seconds of contact at ${snapshot.downlinkMegabytesPerSecond} MB/s. A successful science signal arrives on Earth 23 years after mission start.`,
          {
            downlinkMegabytesPerSecond: snapshot.downlinkMegabytesPerSecond,
            contactSecondsRemaining: snapshot.contactSecondsRemaining,
            initialEarthElapsedSeconds: snapshot.earthElapsedSeconds,
            initialProbeElapsedSeconds: snapshot.probeElapsedSeconds,
            educationalModel: true,
          },
        )
      },
    },
    {
      name: 'simulate_worldline',
      description: 'Test one exact burn time, delta-v and packet selection. This changes no spacecraft state and returns whether the probe or selected science can be saved.',
      inputSchema: simulationSchema,
      annotations: write,
      execute: (args) => {
        const simulation = control.simulate({
          burnAtProbeSecond: integer(args, 'burn_at_probe_second'),
          deltaVMetersPerSecond: integer(args, 'delta_v_mps'),
          packetIds: selectedPackets(args),
        }, integer(args, 'expected_revision'))
        reportActivity(
          simulation.probeSurvives
            ? 'Escape burn tested · probe saved, discovery lost'
            : simulation.discoveryDelivered
              ? 'Transmission burn tested · signal reaches Earth, probe lost'
              : 'Late burn tested · nothing returns',
        )
        return result(
          `Simulation ${simulation.id}: ${simulation.explanation} Mission state moved to revision ${control.getSnapshot().revision}; no real burn occurred.`,
          simulation,
        )
      },
    },
    {
      name: 'update_shared_plan',
      description: 'Put one viable simulated worldline and a concise rationale onto the shared page for the person to inspect. This does not request or execute a burn.',
      inputSchema: planSchema,
      annotations: write,
      execute: (args) => {
        const plan = control.updatePlan(
          text(args, 'simulation_id', 40),
          text(args, 'title', 80),
          text(args, 'rationale', 240),
          integer(args, 'expected_revision'),
        )
        reportActivity('One viable future placed on the shared page')
        return result(`Shared plan updated at revision ${control.getSnapshot().revision}. ${plan.consequence}`, plan)
      },
    },
    {
      name: 'request_burn_review',
      description: 'Place the exact current plan before the person for review. This creates no execution capability and changes no spacecraft state.',
      inputSchema: reviewSchema,
      annotations: write,
      execute: (args) => {
        const review = control.requestBurnReview(
          text(args, 'plan_id', 40),
          integer(args, 'expected_revision'),
        )
        reportActivity('The remaining choice is yours')
        return result('The exact burn is now waiting for the person. No burn is possible until they approve it on the page.', review)
      },
    },
  ]
}

function createExecutionTool(control: WorldlineControl, grant: BurnGrant, reportActivity: ActivityReporter): WebMcpTool {
  let consumed = false
  return {
    name: EXECUTE_AUTHORIZED_BURN_TOOL_NAME,
    description: 'Execute the one exact person-approved burn once. It accepts no arguments, cannot alter the plan and removes itself after use.',
    inputSchema: emptySchema,
    annotations: { readOnlyHint: false, untrustedContentHint: false },
    execute: () => {
      if (consumed) throw new Error('The one-use burn authority has already been consumed.')
      const receipt = control.executeAuthorizedBurn(grant.id)
      consumed = true
      reportActivity('The authorized burn is executing')
      return result(`${receipt.summary} The one-use authority was consumed.`, { receipt, authorityConsumed: true })
    },
  }
}

function createFinalTools(control: WorldlineControl): readonly WebMcpTool[] {
  const readOnly = { readOnlyHint: true, untrustedContentHint: false } as const
  return [
    {
      name: 'read_final_state',
      description: 'Read the immutable final mission outcome after the authorized burn.',
      inputSchema: emptySchema,
      annotations: readOnly,
      execute: () => result('The mission is complete. Planning and execution tools are no longer available.', control.getSnapshot()),
    },
    {
      name: 'verify_transmission_receipt',
      description: 'Verify the final signal receipt and the exact science packets that reached Earth.',
      inputSchema: emptySchema,
      annotations: readOnly,
      execute: () => {
        const receipt = control.getSnapshot().receipt
        if (!receipt) throw new Error('No transmission receipt exists.')
        return result(`Receipt ${receipt.id} verified. ${receipt.summary}`, receipt)
      },
    },
  ]
}

function defaultScope(): WebMcpDocumentScope | undefined {
  if (typeof document === 'undefined') return undefined
  return document as unknown as WebMcpDocumentScope
}

export async function registerWorldlineTools(
  control: WorldlineControl,
  documentScope: WebMcpDocumentScope | undefined = defaultScope(),
  reportActivity: ActivityReporter = () => undefined,
): Promise<WorldlineToolsRegistration> {
  const modelContext = documentScope?.modelContext
  const supported = Boolean(modelContext?.registerTool && modelContext.getTools)
  let disposed = false
  let lastError: Error | null = null
  let work = Promise.resolve()
  let registered = new Set<string>()
  let planningController: AbortController | null = null
  let grantController: AbortController | null = null
  let finalController: AbortController | null = null
  let registeredGrantId: string | null = null

  const refresh = async () => {
    if (!modelContext) {
      registered = new Set()
      return
    }
    registered = new Set((await modelContext.getTools()).map((tool) => tool.name).filter((name) => allNames.has(name)))
  }
  const record = (error: unknown) => {
    lastError = error instanceof Error ? error : new Error(String(error))
  }
  const enqueue = (task: () => Promise<void>) => {
    work = work.then(task).catch(record)
  }
  const registerAll = async (tools: readonly WebMcpTool[], controller: AbortController) => {
    await Promise.all(tools.map((tool) => modelContext!.registerTool(tool, { signal: controller.signal })))
  }
  const reconcile = async () => {
    if (disposed || !modelContext) return
    const snapshot = control.getSnapshot()
    if (snapshot.phase === 'executed') {
      planningController?.abort()
      planningController = null
      grantController?.abort()
      grantController = null
      registeredGrantId = null
      if (!finalController) {
        finalController = new AbortController()
        await registerAll(createFinalTools(control), finalController)
      }
      await refresh()
      return
    }
    if (!planningController) {
      planningController = new AbortController()
      await registerAll(createPlanningTools(control, reportActivity), planningController)
    }
    const grant = snapshot.activeGrant
    if (grant?.id !== registeredGrantId) {
      grantController?.abort()
      grantController = null
      registeredGrantId = null
      if (grant) {
        grantController = new AbortController()
        await modelContext.registerTool(createExecutionTool(control, grant, reportActivity), { signal: grantController.signal })
        registeredGrantId = grant.id
      }
    } else if (!grant && grantController) {
      grantController.abort()
      grantController = null
      registeredGrantId = null
    }
    await refresh()
  }

  const unsubscribe = control.subscribe(() => enqueue(reconcile))
  if (modelContext) await reconcile().catch(record)

  const whenIdle = async () => {
    while (true) {
      const current = work
      await current
      if (current === work) return
    }
  }

  return {
    supported,
    initialToolNames: initialWorldlineToolNames,
    async getRegisteredToolNames() {
      await whenIdle()
      try { await refresh() } catch (error) { record(error) }
      return [...registered].sort()
    },
    getLastError: () => lastError,
    whenIdle,
    async dispose() {
      if (disposed) return
      disposed = true
      unsubscribe()
      planningController?.abort()
      grantController?.abort()
      finalController?.abort()
      await whenIdle()
      await refresh().catch(record)
    },
  }
}
