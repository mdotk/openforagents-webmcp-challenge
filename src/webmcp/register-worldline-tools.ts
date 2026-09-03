import type {
  BurnGrant,
  SciencePacketId,
  WebMcpDocumentScope,
  WebMcpTool,
  WebMcpToolResult,
  WorldlineControl,
  WorldlineToolsRegistration,
} from '../types'
import { MAX_WORLDLINE_SIMULATIONS } from '../domain/worldline'

export const initialWorldlineToolNames = Object.freeze([
  'read_mission_state',
  'inspect_science_packets',
  'inspect_maneuver_window',
  'simulate_worldline',
  'present_worldline_choices',
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
    hypothesis: Object.freeze({ type: 'string', minLength: 1, maxLength: 160 }),
    expected_outcome: Object.freeze({
      type: 'string',
      enum: Object.freeze(['probe_return', 'science_transmission', 'total_loss']),
    }),
  }),
  required: Object.freeze(['expected_revision', 'burn_at_probe_second', 'delta_v_mps', 'packet_ids', 'hypothesis', 'expected_outcome']),
  additionalProperties: false as const,
})

const choicesSchema = Object.freeze({
  type: 'object' as const,
  properties: Object.freeze({
    expected_revision: revision,
    option_a_simulation_id: Object.freeze({ type: 'string', minLength: 1, maxLength: 40 }),
    option_b_simulation_id: Object.freeze({ type: 'string', minLength: 1, maxLength: 40 }),
    recommended_simulation_id: Object.freeze({ type: 'string', minLength: 1, maxLength: 40 }),
    recommendation_rationale: Object.freeze({ type: 'string', minLength: 1, maxLength: 240 }),
  }),
  required: Object.freeze(['expected_revision', 'option_a_simulation_id', 'option_b_simulation_id', 'recommended_simulation_id', 'recommendation_rationale']),
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
      description: 'Read the current educational mission revision, clocks, fuel, contact window, shared choices and authority state once.',
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
            simulationAttemptsUsed: snapshot.simulationAttemptsUsed,
            simulationAttemptsRemaining: MAX_WORLDLINE_SIMULATIONS - snapshot.simulationAttemptsUsed,
            humanPriority: snapshot.humanPriority,
            testedWorldlines: snapshot.simulations.map((simulation) => ({
              id: simulation.id,
              hypothesis: simulation.hypothesis,
              expectedOutcome: simulation.expectedOutcome,
              outcome: simulation.outcome,
              expectationMatched: simulation.expectationMatched,
              burnAtProbeSecond: simulation.burnAtProbeSecond,
              deltaVMetersPerSecond: simulation.deltaVMetersPerSecond,
              packetIds: simulation.packetIds,
              failureReasons: simulation.failureReasons,
            })),
            choices: snapshot.choices,
            review: snapshot.review,
            receipt: snapshot.receipt,
            temporaryBurnCapabilityActive: Boolean(snapshot.activeGrant),
          },
        )
      },
    },
    {
      name: 'inspect_science_packets',
      description: 'Inspect the raw packet manifest: size, scientific value, replication status and observation. Use it to decide what is worth transmitting.',
      inputSchema: emptySchema,
      annotations: readOnly,
      execute: () => {
        reportActivity('Three science packets inspected')
        return result('The packet manifest is available. Compare each packet’s size, scientific value and replication status against the separate signal-window evidence.', control.getSnapshot().packets)
      },
    },
    {
      name: 'inspect_maneuver_window',
      description: 'Inspect raw propulsion, antenna-lock and downlink telemetry. Combine these constraints to form and test your own maneuver hypotheses.',
      inputSchema: emptySchema,
      annotations: readOnly,
      execute: () => {
        const snapshot = control.getSnapshot()
        reportActivity('Maneuver and signal window inspected')
        return result(
          `Contact ends at probe second ${snapshot.contactSecondsRemaining}; downlink is ${snapshot.downlinkMegabytesPerSecond} MB/s. Gravity telemetry shows escape thrust becomes ineffective after second 42 and needs at least 3400 m/s. Earth lock stabilizes from seconds 44–50, but thrust outside 2000–2400 m/s breaks that lock. A selected packet set must finish before contact ends.`,
          {
            downlinkMegabytesPerSecond: snapshot.downlinkMegabytesPerSecond,
            contactEndsAtProbeSecond: snapshot.contactSecondsRemaining,
            propulsionTelemetry: {
              burnRangeProbeSeconds: [34, 58],
              deltaVRangeMetersPerSecond: [1800, 3800],
              escapeThrustEffectiveThroughProbeSecond: 42,
              minimumEscapeDeltaVMetersPerSecond: 3400,
            },
            antennaTelemetry: {
              stableEarthLockProbeSeconds: [44, 50],
              lockPreservingDeltaVMetersPerSecond: [2000, 2400],
            },
            packetCompletionRule: 'burn_at_probe_second + ceil(selected_packet_megabytes / downlink_megabytes_per_second) <= contact_ends_at_probe_second',
            initialEarthElapsedSeconds: snapshot.earthElapsedSeconds,
            initialProbeElapsedSeconds: snapshot.probeElapsedSeconds,
            earthArrivalYearsForSuccessfulScience: 23,
            educationalModel: true,
          },
        )
      },
    },
    {
      name: 'simulate_worldline',
      description: 'State a concise hypothesis, then test one exact burn time, delta-v and packet selection. This changes no spacecraft state and reports whether your expectation matched the result.',
      inputSchema: simulationSchema,
      annotations: write,
      execute: (args) => {
        const before = control.getSnapshot()
        const hypothesis = text(args, 'hypothesis', 160)
        const expectedOutcome = text(args, 'expected_outcome', 40) as 'probe_return' | 'science_transmission' | 'total_loss'
        const simulation = control.simulate({
          burnAtProbeSecond: integer(args, 'burn_at_probe_second'),
          deltaVMetersPerSecond: integer(args, 'delta_v_mps'),
          packetIds: selectedPackets(args),
          hypothesis,
          expectedOutcome,
        }, integer(args, 'expected_revision'))
        const after = control.getSnapshot()
        const reused = before.revision === after.revision
        const outcomesFound = [...new Set(after.simulations.map((candidate) => candidate.outcome))]
        const investigationComplete = outcomesFound.includes('probe_return')
          && outcomesFound.includes('science_transmission')
          && outcomesFound.includes('total_loss')
        const remainingAttempts = MAX_WORLDLINE_SIMULATIONS - after.simulationAttemptsUsed
        reportActivity(`${simulation.expectationMatched ? 'Hypothesis confirmed' : 'Hypothesis revised'} · ${simulation.probeSurvives ? 'probe returns' : simulation.discoveryDelivered ? 'discovery reaches Earth' : 'nothing returns'}`)
        return result(
          `Simulation ${simulation.id} ${simulation.expectationMatched ? 'confirmed' : 'did not confirm'} the hypothesis: ${simulation.explanation} ${reused ? 'This exact worldline was already recorded, so the revision did not change; the repeated call still used one investigation attempt.' : `Mission state moved to revision ${after.revision}.`} No real burn occurred.${simulation.failureReasons.length ? ` Failure reasons: ${simulation.failureReasons.join(', ')}.` : ''} ${investigationComplete ? 'Two materially different viable futures and a failed control are now established. Present the alternatives with one recommendation tied to the person’s priority; do not simulate again.' : `${remainingAttempts} simulation attempt${remainingAttempts === 1 ? '' : 's'} remain. Adapt the next hypothesis to this evidence.`}`,
          {
            ...simulation,
            reused,
            remainingAttempts,
            outcomesFound,
            investigationComplete,
          },
        )
      },
    },
    {
      name: 'present_worldline_choices',
      description: 'Present two materially different viable tested futures, identify the one you recommend for the person’s stated priority and explain why the alternative is weaker for that priority. This does not choose or execute either future.',
      inputSchema: choicesSchema,
      annotations: write,
      execute: (args) => {
        const review = control.presentChoices(
          text(args, 'option_a_simulation_id', 40),
          text(args, 'option_b_simulation_id', 40),
          integer(args, 'expected_revision'),
          {
            recommendedSimulationId: text(args, 'recommended_simulation_id', 40),
            rationale: text(args, 'recommendation_rationale', 240),
          },
        )
        const snapshot = control.getSnapshot()
        const choices = snapshot.choices!
        const probeReturn = snapshot.simulations.find((simulation) => simulation.id === choices.probeReturnSimulationId)!
        const scienceTransmission = snapshot.simulations.find((simulation) => simulation.id === choices.scienceTransmissionSimulationId)!
        const recommended = snapshot.simulations.find((simulation) => simulation.id === choices.recommendedSimulationId)!
        reportActivity(`Recommendation ready · ${recommended.discoveryDelivered ? 'send the discovery' : 'bring the probe home'}`)
        return result(
          'Two viable futures and your recommendation are now displayed together. The person must choose on the page. No burn is authorized or possible yet; stop and wait for them.',
          {
            revision: snapshot.revision,
            review,
            choices,
            options: [probeReturn, scienceTransmission],
            temporaryBurnCapabilityActive: false,
          },
        )
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
  const enqueue = (task: () => Promise<void>, deferToNextTask = false) => {
    work = work.then(async () => {
      if (deferToNextTask) {
        await new Promise<void>((resolve) => setTimeout(resolve, 0))
      }
      await task()
    }).catch(record)
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

  const unsubscribe = control.subscribe((snapshot) => {
    // Let the browser receive the execution result before aborting the
    // controller that registered the one-use tool. Aborting in the same
    // microtask can make a successful call appear to fail in native clients.
    enqueue(reconcile, snapshot.phase === 'executed')
  })
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
