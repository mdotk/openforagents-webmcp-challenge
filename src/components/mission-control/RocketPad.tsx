import type { MissionPhase } from './types'

export interface RocketPadProps {
  phase: MissionPhase
  rocketName: string
  className?: string
}

const phaseDescriptions: Record<MissionPhase, string> = {
  standby: 'secured on the launch pad',
  checks: 'undergoing system checks',
  'awaiting-approval': 'ready and waiting for approval',
  approved: 'approved and waiting for the launch command',
  launching: 'lifting off',
  launched: 'clear of the launch tower',
  paused: 'secured while launch is paused',
}

function RocketIllustration() {
  return (
    <svg
      className="mc-rocket__svg"
      viewBox="0 0 210 390"
      aria-hidden="true"
    >
      <path
        className="mc-rocket__flame mc-rocket__flame--outer"
        d="M72 316c3 37 17 62 33 73 16-11 30-36 33-73Z"
      />
      <path
        className="mc-rocket__flame mc-rocket__flame--inner"
        d="M88 316c2 24 8 41 17 51 9-10 15-27 17-51Z"
      />
      <path
        className="mc-rocket__fin mc-rocket__fin--left"
        d="M65 246c-24 19-33 51-34 84l43-23Z"
      />
      <path
        className="mc-rocket__fin mc-rocket__fin--right"
        d="M145 246c24 19 33 51 34 84l-43-23Z"
      />
      <path
        className="mc-rocket__body"
        d="M105 8C70 40 57 104 62 225l12 92h62l12-92C153 104 140 40 105 8Z"
      />
      <path
        className="mc-rocket__shade"
        d="M105 8c23 42 28 111 20 217l-9 92h20l12-92C153 104 140 40 105 8Z"
      />
      <path className="mc-rocket__seam" d="M63 218h84M72 284h66" />
      <circle className="mc-rocket__window-ring" cx="105" cy="126" r="29" />
      <circle className="mc-rocket__window" cx="105" cy="126" r="20" />
      <path className="mc-rocket__window-glint" d="M94 116c5-6 11-8 19-7" />
      <path className="mc-rocket__mark" d="m105 180-13 22h26Z" />
      <path className="mc-rocket__engine" d="M80 317h50l-8 20H88Z" />
    </svg>
  )
}

export function RocketPad({
  phase,
  rocketName,
  className = '',
}: RocketPadProps) {
  return (
    <div
      className={`mc-pad mc-pad--${phase} ${className}`.trim()}
      role="img"
      aria-label={`${rocketName} is ${phaseDescriptions[phase]}.`}
    >
      <svg
        className="mc-pad__structure"
        viewBox="0 0 720 620"
        preserveAspectRatio="xMidYMax meet"
        aria-hidden="true"
      >
        <g className="mc-pad__tower">
          <path d="M122 524V104h92v420M122 172h92M122 246h92M122 320h92M122 394h92M122 468h92" />
          <path d="m122 172 92 74-92 74 92 74-92 74M214 172l-92 74 92 74-92 74 92 74" />
          <path d="M88 104h160M105 80h126v24H105Z" />
        </g>
        <g className="mc-pad__service-arms">
          <path d="M214 190h180l34 28H214ZM214 326h154l30 24H214Z" />
          <path d="M380 190v54M354 326v50" />
        </g>
        <g className="mc-pad__ground">
          <path d="M26 526h668" />
          <path d="m80 526 68 54h424l68-54" />
          <path d="M156 580h408M206 604h308" />
          <path d="M278 526h164l34 54H244Z" />
        </g>
        <g className="mc-pad__lights">
          <circle cx="86" cy="518" r="6" />
          <circle cx="634" cy="518" r="6" />
          <circle cx="154" cy="518" r="4" />
          <circle cx="566" cy="518" r="4" />
        </g>
      </svg>

      <div className="mc-rocket__motion">
        <RocketIllustration />
      </div>

      <div className="mc-pad__scan" aria-hidden="true" />
      <div className="mc-pad__designation" aria-hidden="true">
        <span>LV</span>
        <strong>{rocketName}</strong>
      </div>
    </div>
  )
}
