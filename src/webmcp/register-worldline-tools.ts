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

const revision = Object.freeze({
  type: 'integer',
  minimum: 0,
  description: 'The revision number from the latest mission state. This prevents acting on old information.',
})

const simulationSchema = Object.freeze({
  type: 'object' as const,
  properties: Object.freeze({
    expected_revision: revision,
    burn_at_probe_second: Object.freeze({ type: 'integer', minimum: 34, maximum: 58, description: 'The probe clock second when the engine burn starts.' }),
    delta_v_mps: Object.freeze({ type: 'integer', minimum: 1800, maximum: 3800, description: 'How much the burn changes the probe’s speed, in metres per second.' }),
    packet_ids: Object.freeze({
      type: 'array',
      items: Object.freeze({ type: 'string', enum: packetIds }),
      uniqueItems: true,
      minItems: 0,
      maxItems: 3,
      description: 'The files to send: gravity-map, horizon-spectrum or navigation-archive.',
    }),
    hypothesis: Object.freeze({
      type: 'string',
      minLength: 1,
      maxLength: 160,
      description: 'One plain sentence stating what you think this test will show.',
    }),
    expected_outcome: Object.freeze({
      type: 'string',
      enum: Object.freeze(['probe_return', 'science_transmission', 'total_loss']),
      description: 'The predicted result. The probe_return code means the probe escapes the black hole; it does not mean the probe travels back to Earth.',
    }),
    test_role: Object.freeze({
      type: 'string',
      enum: Object.freeze(['extreme', 'compromise', 'counterexample']),
      description: 'Use extreme for the first two clear outcomes, compromise for a middle option, or counterexample for a test designed to prove the learner’s answer wrong.',
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
      description: 'Choose the tested option that matches the person’s priority from read_mission_state.',
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
    throw new TypeError('packet_ids must contain zero to three different file IDs.')
  }
  if (!value.every((id) => typeof id === 'string' && packetIds.includes(id as SciencePacketId))) {
    throw new TypeError('packet_ids contains an unknown file ID.')
  }
  return value as readonly SciencePacketId[]
}

type ActivityReporter = (message: string) => void

function plainPhase(phase: WorldlineSnapshot['phase']) {
  if (phase === 'investigating_extremes') return 'the agent should test one escape burn and one send-files burn'
  if (phase === 'prediction') return 'waiting for the learner’s calculation and answer'
  if (phase === 'investigating_prediction') return 'the agent should test the learner’s answer'
  if (phase === 'review') return 'waiting for the person to choose what to save'
  if (phase === 'authorized') return 'the person’s chosen burn is ready'
  return 'the mission is complete'
}

function guidanceFor(snapshot: WorldlineSnapshot) {
  if (snapshot.phase === 'investigating_extremes') {
    return {
      command: 'Begin WORLDLINE.',
      objective: 'Find one burn that lets the probe escape and one burn that sends the gravity map and light spectrum to Earth.',
      permittedNextActions: [
        'Inspect the three files and the engine, antenna and contact limits.',
        'Test exactly two clearly different options with test_role extreme.',
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
      ? 'Recommend sending the gravity map and light spectrum because the learner chose to send the files that Earth does not have.'
      : snapshot.humanPriority === WORLDLINE_HUMAN_PRIORITIES.probe
        ? 'Recommend the escape option because the learner chose to save the probe.'
        : `Follow this recorded learner priority exactly: ${snapshot.humanPriority}`
    return {
      command: 'Test my prediction.',
      objective: 'Test the learner’s answer and explain which parts the results support.',
      permittedNextActions: [
        'Use learnerCalculation to acknowledge the learner’s transmission-time answer and its correction, if needed.',
        'Test one middle option with test_role compromise.',
        'Test one option designed to prove the learner’s answer wrong with test_role counterexample.',
        `Call present_worldline_choices with a prediction assessment and teaching explanation. ${requiredRecommendation}`,
      ],
      recommendationRule: requiredRecommendation,
      stopWhen: 'The two possible outcomes appear. Stop and wait for the learner to choose which loss to accept.',
    }
  }
  if (snapshot.phase === 'review') {
    return {
      command: null,
      objective: 'Wait for the learner to choose one of the two tested outcomes on the page.',
      permittedNextActions: [],
      stopWhen: 'The person has not approved a burn yet. Do not choose for them.',
    }
  }
  if (snapshot.phase === 'authorized') {
    return {
      command: 'Carry out my choice.',
      objective: 'Run the exact burn the person approved, then check the final result.',
      permittedNextActions: ['Call execute_authorized_burn with no arguments.'],
      stopWhen: 'The final result has been checked and reported.',
    }
  }
  return {
    command: null,
    objective: 'Report the completed mission using the final read-only tools.',
    permittedNextActions: [],
    stopWhen: 'The checked final outcome has been reported.',
  }
}

function createPlanningTools(control: WorldlineControl, reportActivity: ActivityReporter): readonly WebMcpTool[] {
  const readOnly = { readOnlyHint: true, untrustedContentHint: false } as const
  const write = { readOnlyHint: false, untrustedContentHint: false } as const
  return [
    {
      name: 'read_mission_state',
      description: 'Start or continue WORLDLINE. Call this first when the person says “Begin WORLDLINE” or “Test my prediction.” It returns what has happened, what the learner entered, what to do next and when to stop for the learner.',
      inputSchema: emptySchema,
      annotations: readOnly,
      execute: () => {
        const snapshot = control.getSnapshot()
        const guidance = guidanceFor(snapshot)
        reportActivity(snapshot.phase === 'investigating_prediction' && snapshot.learnerPrediction
          ? 'Learner prediction inspected'
          : 'Mission state inspected')
        return result(
          `Mission revision ${snapshot.revision}. Current step: ${plainPhase(snapshot.phase)}. ${snapshot.contactSecondsRemaining} seconds of final contact remain. What to do: ${guidance.objective} ${guidance.stopWhen} Use this result and do not read the mission again in the same turn.`,
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
      description: 'Read the three files on the probe, their sizes, what each file contains and whether Earth already has a copy.',
      inputSchema: emptySchema,
      annotations: readOnly,
      execute: () => {
        reportActivity('Three files inspected')
        return result('The probe holds a gravity map, a light spectrum and a navigation record. Earth has no copy of the first two files, but it already has the navigation record. Use their sizes with the radio speed and final contact time.', control.getSnapshot().packets)
      },
    },
    {
      name: 'inspect_maneuver_window',
      description: 'Read when the probe can escape, when its antenna can stay pointed at Earth, how powerful each burn must be and how fast the radio sends files.',
      inputSchema: emptySchema,
      annotations: readOnly,
      execute: () => {
        const snapshot = control.getSnapshot()
        reportActivity('Engine, antenna and contact limits inspected')
        return result(
          `Final contact ends at probe second ${snapshot.contactSecondsRemaining}. The radio sends ${snapshot.downlinkMegabytesPerSecond} MB each second. To escape, the probe must burn by second 42 and change speed by at least 3,400 m/s. To keep its antenna pointed at Earth, it must burn from second 44 to 50 and change speed by 2,000 to 2,400 m/s. Every selected file must finish sending before final contact.`,
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
      description: 'State what you think will happen, then test one burn time, speed change and set of files. This is only a simulation. It does not fire the probe’s engine.',
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
          ? 'Test complete · the probe can escape, but Earth receives no files'
          : simulation.discoveryDelivered
            ? 'Test complete · both files can be sent, but the probe cannot escape'
            : 'Test complete · the probe is lost and Earth receives no complete files')
        return result(
          `Test ${simulation.id} ${simulation.expectationMatched ? 'matched' : 'did not match'} the predicted result. ${simulation.explanation} ${reused ? 'This exact test was already recorded, so the mission number did not change. The repeated call still used one of the five test attempts.' : `The mission is now at revision ${after.revision}.`} This was a simulation; no real burn occurred. ${after.phase === 'investigating_extremes' && extremesEstablished ? 'You have shown the two clear outcomes. Call present_learning_checkpoint now, then stop so the learner can calculate the sending time and answer why one burn cannot do both.' : investigationComplete ? 'The middle option and the attempt to disprove the learner’s answer are complete. Present the two possible choices, explain what the tests taught and do not run another simulation.' : `${remainingAttempts} test attempt${remainingAttempts === 1 ? '' : 's'} remain. Use this result to choose the next test.`}`,
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
      description: 'After showing one escape outcome and one send-files outcome, ask the learner to calculate how long sending takes and answer why one burn cannot do both. Stop testing until the learner completes both steps on the page.',
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
        reportActivity('Two clear outcomes found · your calculation is next')
        return result(
          'The page now shows one burn that lets the probe escape and one that sends both files. The learner must calculate how long both files take to send, then answer why one burn cannot save the probe and send the files. Stop and wait until both answers are saved on the page.',
          { revision: snapshot.revision, checkpoint, simulationPaused: true, resumeInstruction: 'Test my prediction.' },
        )
      },
    },
    {
      name: 'present_worldline_choices',
      description: 'After testing a middle option and an option designed to disprove the learner’s answer, explain what the tests showed and present the two possible outcomes. Recommend the outcome that matches the person’s priority from read_mission_state. Do not choose or run a burn.',
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
        reportActivity(`Recommendation ready · ${recommended.discoveryDelivered ? 'send both files' : 'save the probe'}`)
        return result(
          'The page explains the learner’s answer and shows the two possible outcomes. The person must now choose which loss to accept. No burn can run until the person chooses. Stop and wait for them.',
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
    description: 'When the person says “Carry out my choice,” run the exact burn they approved. This tool accepts no settings, so it cannot change the burn time, speed or files. It works once and then disappears. Check the final result after it runs.',
    inputSchema: emptySchema,
    annotations: { readOnlyHint: false, untrustedContentHint: false },
    execute: () => {
      if (consumed) throw new Error('The approved burn has already run and cannot run again.')
      const receipt = control.executeAuthorizedBurn(grant.id)
      consumed = true
      reportActivity('The authorized burn is executing')
      return result(`${receipt.summary} The approved burn ran once and cannot run again.`, { receipt, authorityConsumed: true })
    },
  }
}

function createFinalTools(control: WorldlineControl): readonly WebMcpTool[] {
  const readOnly = { readOnlyHint: true, untrustedContentHint: false } as const
  return [
    {
      name: 'read_final_state',
      description: 'Read what happened after the approved burn ran. The result cannot change.',
      inputSchema: emptySchema,
      annotations: readOnly,
      execute: () => result('The mission is complete. Planning and execution tools are no longer available.', control.getSnapshot()),
    },
    {
      name: 'verify_transmission_receipt',
      description: 'Check the final result and which files, if any, reached Earth.',
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
