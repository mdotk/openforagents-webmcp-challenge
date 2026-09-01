export type Experience =
  | 'shopping'
  | 'launch-window'
  | 'fitting-room'
  | 'rack-rescue'

export function resolveExperience(search: string): Experience {
  const requested = new URLSearchParams(search).get('experience')
  if (requested === 'launch-window') return 'launch-window'
  if (requested === 'fitting-room') return 'fitting-room'
  if (requested === 'rack-rescue') return 'rack-rescue'
  return 'shopping'
}
