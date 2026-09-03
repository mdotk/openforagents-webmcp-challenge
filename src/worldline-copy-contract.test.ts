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
    expect(app).toContain('Work with your browser agent to find out whether one burn can both let the probe escape and send the files. If it cannot, you decide what to save.')
    expect(app).not.toContain('somehow do both. Then decide what to save.')
    expect(app).not.toContain('somehow do both')
  })

  it('states the two proven outcomes without implying that the probe returns to Earth', () => {
    expect(app).toContain('The probe gets away from the black hole. Its final contact ends before Earth receives either file.')
    expect(app).toContain('Earth receives both files after 23 years. The probe cannot escape.')
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

  it('rejects known vague or contradictory wording across every public copy surface', () => {
    const prohibited = [
      /observations that can never be repeated/i,
      /science waiting/i,
      /send the discovery/i,
      /discovery lost/i,
      /somehow do both/i,
      /then decide what to save/i,
      /what comes home/i,
      /the probe returns? (?:to earth|home)/i,
      /bring the probe home/i,
      /\u2014/,
    ]

    for (const [path, contents] of copy) {
      for (const phrase of prohibited) {
        expect(contents, `${path} contains ${phrase}`).not.toMatch(phrase)
      }
    }
  })
})
