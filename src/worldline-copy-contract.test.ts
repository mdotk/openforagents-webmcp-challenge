import { describe, expect, it } from 'vitest'
import app from './WorldlineApp.tsx?raw'
import narrative from './worldline-narrative.ts?raw'
import domain from './domain/worldline.ts?raw'
import tools from './webmcp/register-worldline-tools.ts?raw'
import readme from '../README.md?raw'
import metadata from '../index.html?raw'
import packageMetadata from '../package.json?raw'
import submission from '../docs/submission-draft.md?raw'
import storyboard from '../docs/video-storyboard.md?raw'
import blueprint from '../docs/worldline-implementation-blueprint.md?raw'
import qualification from '../docs/worldline-qualification-2026-09-03.md?raw'
import chronology from '../docs/challenge-chronology.md?raw'

const copy = new Map<string, string>([
  ['src/WorldlineApp.tsx', app],
  ['src/worldline-narrative.ts', narrative],
  ['src/domain/worldline.ts', domain],
  ['src/webmcp/register-worldline-tools.ts', tools],
  ['README.md', readme],
  ['index.html', metadata],
  ['package.json', packageMetadata],
  ['docs/submission-draft.md', submission],
  ['docs/video-storyboard.md', storyboard],
  ['docs/worldline-implementation-blueprint.md', blueprint],
  ['docs/worldline-qualification-2026-09-03.md', qualification],
  ['docs/challenge-chronology.md', chronology],
])

describe('WORLDLINE copy contract', () => {
  it('makes the final choice conditional on the investigation result', () => {
    expect(app).toContain('Can one engine burn save the probe and send both files?')
    expect(app).toContain('It has fuel for one engine burn, a short firing that changes its speed.')
    expect(app).toContain('Work with your browser agent to find out whether that burn can both let the probe escape and send the files. If it cannot, you decide what to save.')
    expect(app).not.toContain('somehow do both. Then decide what to save.')
    expect(app).not.toContain('somehow do both')
  })

  it('explains that 30 MB is processed and compressed science, not all raw measurements', () => {
    expect(app).toContain('Its computer has processed and compressed the raw measurements into two files ready to send.')
    expect(app).toContain('an 18 MB gravity map and a 12 MB light spectrum')
    expect(domain).toContain('An 18 MB compressed file made from the probe’s raw measurements')
    expect(domain).toContain('A 12 MB compressed file made from the probe’s raw measurements')
    expect(tools).toContain('processed its raw measurements into an 18 MB compressed gravity-map file and a 12 MB compressed light-spectrum file')
    expect(readme).toContain('30 MB of compressed data takes 25 seconds')
    expect(submission).toContain('30 MB of compressed data at 1.2 MB/s takes 25 seconds')
    expect(app).not.toContain('Those measurements are stored in two files')
    expect(readme).not.toContain('30 MB of data takes 25 seconds')
  })

  it('starts with one instruction and waits until after the tests to recommend an outcome', () => {
    expect(app).toContain('<span>Tell your browser agent</span>')
    expect(app).toContain("begin: 'Begin WORLDLINE.'")
    expect(app).toContain('It will recommend an outcome only after the tests.')
    expect(app).not.toContain('<select')
    expect(app).not.toContain('Step 1 of 2')
    expect(app).not.toContain('Step 2 of 2')
    expect(app).not.toContain('What should the agent protect?')
  })

  it('asks questions that match the learner actions available on each screen', () => {
    expect(app).toContain('How long do both files take to send?')
    expect(app).toContain('What might stop one burn from doing both?')
    expect(app).toContain('The agent has not tested a middle burn yet.')
    expect(app).not.toContain('Can both files finish sending?')
    expect(app).not.toContain('Why can’t one burn save the probe and send both files?')
    expect(app).toContain('The agent found the file sizes and radio speed without revealing the answer.')
  })

  it('states the two proven outcomes without implying that the probe returns to Earth', () => {
    expect(app).toContain('The probe gets away from the black hole. Its radio link closes before Earth receives either file.')
    expect(app).toContain('The files finish sending before the radio link closes. Earth receives them 23 years later. The probe cannot escape.')
    expect(narrative).toContain('The probe escapes. Earth receives no files.')
    expect(narrative).toContain('Both files are sent. The probe cannot escape.')
    expect(domain).toContain('The early, powerful burn lets the probe escape, but turns its antenna away before either file is sent to Earth.')

    const learnerFacingCopy = [app, narrative, domain].join('\n')
    expect(learnerFacingCopy).not.toMatch(/(?:bring|return) the probe home/i)
    expect(learnerFacingCopy).not.toMatch(/the probe (?:returns|returned) (?:to earth|home)/i)
    expect(learnerFacingCopy).not.toMatch(/what comes home/i)
  })

  it('keeps the internal probe_return code explicitly defined as escape', () => {
    expect(tools).toContain('The probe_return code means the probe escapes the black hole; it does not mean the probe travels back to Earth.')
    expect(submission).toContain('the page does not claim that the probe travelled home')
  })

  it('makes the post-choice next action explicit', () => {
    expect(app).toContain('Final step · Tell the same browser agent')
    expect(app).toContain('Only the browser agent can use the one-time burn you approved. It will run the burn and check the result.')
  })

  it('rejects known vague or contradictory wording across every public copy surface', () => {
    const prohibited = [
      /observations that can never be repeated/i,
      /science waiting/i,
      /send the discovery/i,
      /discovery lost/i,
      /somehow do both/i,
      /then decide what to save/i,
      /what comes home/i,
      /what should the agent protect/i,
      /starting preference/i,
      /starting recommendation/i,
      /recommendation preference/i,
      /set the agent.s recommendation/i,
      /can both files finish sending/i,
      /why can.t one burn save the probe and send both files/i,
      /the files cannot finish sending before final contact ends/i,
      /your answer is saved/i,
      /calculation, answer and priority/i,
      /across three steps/i,
      /your starting priority/i,
      /prove (?:the )?(?:person|learner).*(?:answer|prediction) wrong/i,
      /disprove (?:the )?(?:person|learner).*(?:answer|prediction)/i,
      /the probe returns? (?:to earth|home)/i,
      /bring the probe home/i,
      /not enough thrust/i,
      /timing, thrust/i,
      /\u2014/,
    ]

    for (const [path, contents] of copy) {
      for (const phrase of prohibited) {
        expect(contents, `${path} contains ${phrase}`).not.toMatch(phrase)
      }
    }
  })
})
