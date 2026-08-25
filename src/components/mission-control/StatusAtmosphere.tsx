import type { AtmosphereCondition } from './types'

export interface StatusAtmosphereProps {
  condition: AtmosphereCondition
  label: string
  detail?: string
  className?: string
}

const cloudBands = [
  'M-80 132C40 70 154 74 250 134C344 192 448 186 532 132C632 68 746 76 1040 184V330H-80Z',
  'M-120 248C32 172 188 176 306 246C408 308 528 308 646 238C754 174 870 184 1040 286V430H-120Z',
] as const

export function StatusAtmosphere({
  condition,
  label,
  detail,
  className = '',
}: StatusAtmosphereProps) {
  const description = detail ? `${label}. ${detail}` : label

  return (
    <div
      className={`mc-atmosphere mc-atmosphere--${condition} ${className}`.trim()}
      role="img"
      aria-label={description}
    >
      <svg
        className="mc-atmosphere__art"
        viewBox="0 0 960 620"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        <g className="mc-atmosphere__stars">
          <circle cx="90" cy="84" r="2" />
          <circle cx="188" cy="46" r="1.5" />
          <circle cx="322" cy="108" r="2.5" />
          <circle cx="452" cy="58" r="1.5" />
          <circle cx="598" cy="112" r="2" />
          <circle cx="732" cy="44" r="2" />
          <circle cx="848" cy="98" r="1.5" />
          <path d="M670 78h18M679 69v18" />
          <path d="M246 156h12M252 150v12" />
        </g>

        <g className="mc-atmosphere__clouds">
          {cloudBands.map((path, index) => (
            <path key={path} d={path} data-cloud={index + 1} />
          ))}
        </g>

        <g className="mc-atmosphere__rain">
          {Array.from({ length: 14 }, (_, index) => {
            const x = 48 + index * 70
            const y = 222 + (index % 3) * 28
            return <path key={x} d={`M${x} ${y}l-24 70`} />
          })}
        </g>

        <path
          className="mc-atmosphere__lightning"
          d="m714 178-62 120h46l-50 116 122-158h-54l56-78Z"
        />
        <path
          className="mc-atmosphere__horizon"
          d="M0 472c120-26 218-26 326 8 98 30 204 34 316-2 106-34 212-30 318 4v138H0Z"
        />
      </svg>

      <div className="mc-atmosphere__readout" aria-hidden="true">
        <span className="mc-atmosphere__signal" />
        <span>{label}</span>
      </div>
    </div>
  )
}
