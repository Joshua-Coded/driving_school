import type { ReactNode } from 'react'

const p = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
const svg = (children: ReactNode, extra: Record<string, unknown> = {}) => (
  <svg viewBox="0 0 24 24" {...p} {...extra} aria-hidden="true">
    {children}
  </svg>
)

export const Icon = {
  home: () => svg(<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />),
  plan: () => svg(<><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M16 2v4M8 2v4M3 10h18M8 15l2 2 4-4" /></>),
  learn: () => svg(<><path d="M2 5.5C4.5 4 7.5 3.7 12 5.5v15c-4.5-1.8-7.5-1.5-10 0z" /><path d="M22 5.5C19.5 4 16.5 3.7 12 5.5v15c4.5-1.8 7.5-1.5 10 0z" /></>),
  exam: () => svg(<><circle cx="12" cy="13" r="8" /><path d="M12 9v4l2.5 2.5M9 2h6" /></>),
  drive: () => svg(<><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="2.5" /><path d="M12 14.5V21M9.6 11.2 3.3 9.5M14.4 11.2l6.3-1.7" /></>),
  progress: () => svg(<path d="M3 21h18M6 17V11M11 17V6M16 17v-4M21 17V8" />),
  check: () => svg(<path d="m5 12 5 5 9-10" />, { strokeWidth: 3 }),
  star: ({ filled }: { filled?: boolean }) =>
    svg(<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" />, { fill: filled ? 'currentColor' : 'none' }),
  close: () => svg(<path d="M6 6l12 12M18 6 6 18" />),
  arrow: () => svg(<path d="M5 12h14M13 6l6 6-6 6" />),
  back: () => svg(<path d="M19 12H5M11 18l-6-6 6-6" />),
  flag: () => svg(<path d="M5 21V4M5 4h11l-2 4 2 4H5" />),
  replay: () => svg(<path d="M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5" />),
  play: () => svg(<path d="M7 4v16l13-8z" />, { fill: 'currentColor' }),
  search: () => svg(<><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>),
  fire: () => svg(<path d="M12 22c4 0 7-2.7 7-7 0-4-3-6-4-9-1.5 2-2 3-3 3 0-2-1-4-3-6 0 4-4 6-4 12 0 4.3 3 7 7 7z" />),
  target: () => svg(<><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" /></>),
  award: () => svg(<><circle cx="12" cy="9" r="6" /><path d="m8.5 14-1.5 8 5-3 5 3-1.5-8" /></>),
  refresh: () => svg(<path d="M21 12a9 9 0 0 1-15.5 6.2L3 16M3 12a9 9 0 0 1 15.5-6.2L21 8M21 3v5h-5M3 21v-5h5" />),
  file: () => svg(<><path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z" /><path d="M14 3v5h5M9 13h6M9 17h4" /></>),
  car: () => svg(<><path d="M5 16V11l2-5h10l2 5v5" /><rect x="3" y="11" width="18" height="6" rx="2" /><path d="M6 17v2M18 17v2" /><circle cx="7.5" cy="14" r="1" /><circle cx="16.5" cy="14" r="1" /></>),
  image: () => svg(<><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="10" r="2" /><path d="m21 16-5-5-9 9" /></>),
  layers: () => svg(<><path d="m12 3 9 5-9 5-9-5z" /><path d="m3 13 9 5 9-5" /></>),
  trophy: () => svg(<><path d="M8 4h8v5a4 4 0 0 1-8 0z" /><path d="M8 6H4a3 3 0 0 0 4 4M16 6h4a3 3 0 0 1-4 4M12 13v4M8 21h8M9 17h6" /></>),
  info: () => svg(<><circle cx="12" cy="12" r="9" /><path d="M12 11v6M12 7.5v.5" /></>),
  help: () => svg(<><circle cx="12" cy="12" r="9" /><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14M12 17.5v.5" /></>),
  book: () => svg(<><path d="M4 19V5a2 2 0 0 1 2-2h14v15H6a2 2 0 0 0-2 2 2 2 0 0 0 2 2h14" /></>),
  shield: () => svg(<><path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z" /><path d="M12 9v6M9 12h6" /></>),
  eye: () => svg(<><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></>),
  crash: () => svg(<path d="m12 2 2 6 6-2-3 5 5 3-6 1 1 7-5-4-5 4 1-7-6-1 5-3-3-5 6 2z" />),
  warn: () => svg(<><path d="M12 3 2 20h20z" /><path d="M12 10v4M12 17v.5" /></>),
  lock: () => svg(<><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></>),
}

/** One line icon per topic, used instead of emoji. */
export function TopicIcon({ id }: { id: string }) {
  switch (id) {
    case 'signs':
      return svg(<><path d="M12 3 2.5 19h19z" /><path d="M12 9v5M12 16.5v.5" /></>)
    case 'markings':
      return svg(<><path d="M6 3v18M18 3v18" /><path d="M12 3v3M12 9.5v3M12 16v3" /></>)
    case 'priority':
      return svg(<><path d="M12 21V3M3 12h18" /><path d="m9 6 3-3 3 3M18 9l3 3-3 3" /></>)
    case 'overtaking':
      return svg(<><path d="M4 18h6M14 6h6" /><path d="M6 18c0-6 6-12 12-12" /><path d="m15 3 3 3-3 3" /></>)
    case 'speed':
      return svg(<><path d="M3.5 16a9 9 0 1 1 17 0" /><path d="m12 13 4-5" /><circle cx="12" cy="13" r="1.5" /></>)
    case 'lights':
      return svg(<><path d="M10 6c-4 0-6 2.5-6 6s2 6 6 6h1V6z" /><path d="M15 8h6M15 12h6M15 16h6" /></>)
    case 'parking':
      return svg(<><rect x="3" y="3" width="18" height="18" rx="4" /><path d="M9.5 17V7h3.5a3 3 0 0 1 0 6H9.5" /></>)
    case 'vehicle':
      return svg(<><path d="M2 6h12v10H2zM14 9h4l4 4v3h-8" /><circle cx="6" cy="17.5" r="1.8" /><circle cx="17" cy="17.5" r="1.8" /></>)
    case 'safety':
      return Icon.shield()
    default:
      return Icon.book()
  }
}
