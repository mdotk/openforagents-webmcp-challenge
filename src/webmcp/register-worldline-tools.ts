import type {
  BurnGrant,
  SciencePacketId,
  WebMcpDocumentScope,
  WebMcpTool,
  WebMcpToolResult,
  WorldlineControl,
  WorldlineSnapshot,
  WorldlineToolsRegistration,
} from '../types'
import { MAX_WORLDLINE_SIMULATIONS, WORLDLINE_HUMAN_PRIORITIES } from '../domain/worldline'

export const initialWorldlineToolNames = Object.freeze([
  'read_mission_state',
  'inspect_science_packets',
  'inspect_maneuver_window',
  'simulate_worldline',
  'present_learning_checkpoint',
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
    test_role: Object.freeze({
      type: 'string',
      enum: Object.freeze(['extreme', 'compromise', 'counterexample']),
    }),
  }),
  required: Object.freeze(['expected_revision', 'burn_at_probe_second', 'delta_v_mps', 'packet_ids', 'hypothesis', 'expected_outcome', 'test_role']),
  additionalProperties: false as const,
})

const choicesSchema = Object.freeze({
  type: 'object' as const,
  properties: Object.freeze({
    expected_revision: revision,
    option_a_simulation_id: Object.freeze({ type: 'string', minLength: 1, maxLength: 40 }),
    option_b_simulation_id: Object.freeze({ type: 'string', minLength: 1, maxLength: 40 }),
    recommended_simulation_id: Object.freeze({
      type: 'string',
      minLength: 1,
      maxLength: 40,
      description: 'Must select the viable future that follows the learner priority returned by read_mission_state.',
    }),
    recommendation_rationale: Object.freeze({ type: 'string', minLength: 1, maxLength: 240 }),
    prediction_assessment: Object.freeze({ type: 'string', enum: Object.freeze(['correct', 'partly_correct', 'not_supported']) }),
    teaching_explanation: Object.freeze({ type: 'string', minLength: 1, maxLength: 320 }),
  }),
  required: Object.freeze(['expected_revision', 'option_a_simulation_id', 'option_b_simulation_id', 'recommended_simulation_id', 'recommendation_rationale', 'prediction_assessment', 'teaching_explanation']),
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

function guidanceFor(snapshot: WorldlineSnapshot) {
  if (snapshot.phase === 'investigating_extremes') {
    return {
      command: 'Begin WORLDLINE.',
      objective: 'Establish one credible future that returns the probe and one that sends both unique discoveries.',
      permittedNextActions: [
        'Inspect the science packets and maneuver window.',
        'Test exactly two materially different extremes with test_role extreme.',
        'Call present_learning_checkpoint after both outcomes are established.',
      ],
      stopWhen: 'The learning checkpoint opens. Stop and wait for the learner to calculate the signal time and make a prediction on the page.',
    }
  }
  if (snapshot.phase === 'prediction') {
    const learnerStep = snapshot.learnerCalculation
      ? 'The learner has calculated the signal time and must now predict why one burn cannot save both outcomes.'
      : 'The learner must first calculate the signal time, then predict why one burn cannot save both outcomes.'
    return {
      command: null,
      objective: learnerStep,
      permittedNextActions: [],
      stopWhen: 'The learner has not completed both steps yet. Do not run another simulation.',
    }
  }
  if (snapshot.phase === 'investigating_prediction') {
    const requiredRecommendation = snapshot.humanPriority === WORLDLINE_HUMAN_PRIORITIES.discovery
      ? 'Recommend the science-transmission future because the learner chose to protect irreplaceable science.'
      : snapshot.humanPriority === WORLDLINE_HUMAN_PRIORITIES.probe
        ? 'Recommend the probe-return future because the learner chose to protect the spacecraft.'
        : `Follow this recorded learner priority exactly: ${snapshot.humanPriority}`
    return {
      command: 'Test my prediction.',
      objective: 'Challenge the learner prediction and teach what the evidence supports.',
      permittedNextActions: [
        'Use learnerCalculation to acknowledge the learner’s transmission-time answer and its correction, if needed.',
        'Test one plausible compromise with test_role compromise.',
        'Test one counterexample with test_role counterexample.',
        `Call present_worldline_choices with a prediction assessment and teaching explanation. ${requiredRecommendation}`,
      ],
      recommendationRule: requiredRecommendation,
      stopWhen: 'The two viable futures appear. Stop and wait for the learner to choose which loss to accept.',
    }
  }
  if (snapshot.phase === 'review') {
    return {
      command: null,
      objective: 'Wait for the learner to choose one of the two tested futures on the page.',
      permittedNextActions: [],
      stopWhen: 'No burn is authorized yet. Do not choose for the learner.',
    }
  }
  if (snapshot.phase === 'authorized') {
    return {
      command: 'Carry out my choice.',
      objective: 'Execute the exact person-approved burn, then verify the final receipt.',
      permittedNextActions: ['Call execute_authorized_burn with no arguments.'],
      stopWhen: 'The final receipt is verified and the outcome has been reported.',
    }
  }
  return {
    command: null,
    objective: 'Report the completed mission from the final read-only tools.',
    permittedNextActions: [],
    stopWhen: 'The verified final outcome has been reported.',
  }
}

function createPlanningTools(control: WorldlineControl, reportActivity: ActivityReporter): readonly WebMcpTool[] {
  const readOnly = { readOnlyHint: true, untrustedContentHint: false } as const
  const write = { readOnlyHint: false, untrustedContentHint: false } as const
  return [
    {
      name: 'read_mission_state',
      description: 'Start or resume WORLDLINE. Call this first when the person says “Begin WORLDLINE” or “Test my prediction.” It returns the current phase, shared learner state, permitted next work and exact stopping point.',
      inputSchema: emptySchema,
      annotations: readOnly,
      execute: () => {
        const snapshot = control.getSnapshot()
        const guidance = guidanceFor(snapshot)
        reportActivity(snapshot.phase === 'investigating_prediction' && snapshot.learnerPrediction
          ? 'Learner prediction inspected'
          : 'Mission state inspected')
        return result(
          `Mission revision ${snapshot.revision}; phase ${snapshot.phase}; ${snapshot.contactSecondsRemaining} probe-seconds of contact remain. Objective: ${guidance.objective} ${guidance.stopWhen} Use this result and do not repeat the read in the same turn.`,
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
            distanceFromEarthLightYears: snapshot.distanceFromEarthLightYears,
            humanPriority: snapshot.humanPriority,
            learningCheckpoint: snapshot.learningCheckpoint,
            learnerCalculation: snapshot.learnerCalculation,
            learnerPrediction: snapshot.learnerPrediction,
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
            guidance,
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
            distanceFromEarthLightYears: snapshot.distanceFromEarthLightYears,
            signalTravelYears: snapshot.distanceFromEarthLightYears,
            initialEarthElapsedSeconds: snapshot.earthElapsedSeconds,
            initialProbeElapsedSeconds: snapshot.probeElapsedSeconds,
            earthArrivalYearsForSuccessfulScience: snapshot.distanceFromEarthLightYears,
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
          testRole: text(args, 'test_role', 40) as 'extreme' | 'compromise' | 'counterexample',
        }, integer(args, 'expected_revision'))
        const after = control.getSnapshot()
        const reused = before.revision === after.revision
        const outcomesFound = [...new Set(after.simulations.map((candidate) => candidate.outcome))]
        const extremesEstablished = outcomesFound.includes('probe_return') && outcomesFound.includes('science_transmission')
        const predictionTests = after.learnerPrediction
          ? after.simulations.slice(after.learnerPrediction.selectedAfterSimulationCount)
          : []
        const predictionRoles = new Set(predictionTests.map((candidate) => candidate.testRole))
        const investigationComplete = after.phase === 'investigating_prediction'
          && predictionRoles.has('compromise')
          && predictionRoles.has('counterexample')
          && predictionTests.some((candidate) => candidate.outcome === 'total_loss')
        const remainingAttempts = MAX_WORLDLINE_SIMULATIONS - after.simulationAttemptsUsed
        reportActivity(simulation.probeSurvives
          ? 'Test complete · the probe can return, but its discoveries cannot'
          : simulation.discoveryDelivered
            ? 'Test complete · both discoveries can be sent, but the probe cannot return'
            : 'Test complete · this path saves neither the probe nor its discoveries')
        return result(
          `Simulation ${simulation.id} ${simulation.expectationMatched ? 'confirmed' : 'did not confirm'} the hypothesis: ${simulation.explanation} ${reused ? 'This exact worldline was already recorded, so the revision did not change; the repeated call still used one investigation attempt.' : `Mission state moved to revision ${after.revision}.`} No real burn occurred.${simulation.failureReasons.length ? ` Failure reasons: ${simulation.failureReasons.join(', ')}.` : ''} ${after.phase === 'investigating_extremes' && extremesEstablished ? 'The two extreme futures are established. Call present_learning_checkpoint now, then stop so the learner can calculate the signal time and make a prediction.' : investigationComplete ? 'The compromise and counterexample have tested the learner’s prediction. Present the two viable choices, assess the prediction and teach the result; do not simulate again.' : `${remainingAttempts} simulation attempt${remainingAttempts === 1 ? '' : 's'} remain. Adapt the next hypothesis to this evidence.`}`,
          {
            ...simulation,
            reused,
            remainingAttempts,
            outcomesFound,
            investigationComplete,
            extremesEstablished,
          },
        )
      },
    },
    {
      name: 'present_learning_checkpoint',
      description: 'After testing the two opposite viable extremes, ask the learner to calculate the signal time and predict why one burn cannot achieve both. This pauses simulation until the learner completes both steps on the page.',
      inputSchema: Object.freeze({
        type: 'object' as const,
        properties: Object.freeze({ expected_revision: revision }),
        required: Object.freeze(['expected_revision']),
        additionalProperties: false as const,
      }),
      annotations: write,
      execute: (args) => {
        const checkpoint = control.presentLearningCheckpoint(integer(args, 'expected_revision'))
        const snapshot = control.getSnapshot()
        reportActivity('The agent found the two extremes · your calculation is next')
        return result(
          'The two opposite viable futures are displayed. The learner must now calculate how long both discoveries take to transmit, then predict why no single burn can save both the probe and the discoveries. Stop and wait until both answers are recorded on the page.',
          { revision: snapshot.revision, checkpoint, simulationPaused: true, resumeInstruction: 'Test my prediction.' },
        )
      },
    },
    {
      name: 'present_worldline_choices',
      description: 'After testing the learner prediction with a compromise and counterexample, assess the prediction, explain the physics and present the two viable futures. The recommendation must follow the learner priority returned by read_mission_state. This does not choose or execute either future.',
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
          text(args, 'prediction_assessment', 40) as 'correct' | 'partly_correct' | 'not_supported',
          text(args, 'teaching_explanation', 320),
        )
        const snapshot = control.getSnapshot()
        const choices = snapshot.choices!
        const probeReturn = snapshot.simulations.find((simulation) => simulation.id === choices.probeReturnSimulationId)!
        const scienceTransmission = snapshot.simulations.find((simulation) => simulation.id === choices.scienceTransmissionSimulationId)!
        const recommended = snapshot.simulations.find((simulation) => simulation.id === choices.recommendedSimulationId)!
        reportActivity(`Recommendation ready · ${recommended.discoveryDelivered ? 'send the discovery' : 'bring the probe home'}`)
        return result(
          'The learner’s prediction has been assessed and the two viable futures are displayed. The person must now choose which loss to accept. No burn is authorized or possible yet; stop and wait for them.',
          {
            revision: snapshot.revision,
            review,
            choices,
            options: [probeReturn, scienceTransmission],
            temporaryBurnCapabilityActive: false,
            resumeInstructionAfterChoice: 'Carry out my choice.',
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
    description: 'When the person says “Carry out my choice,” execute the one exact person-approved burn once. It accepts no arguments, cannot alter the plan and removes itself after use. Then verify the final receipt.',
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
