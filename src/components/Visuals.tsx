import { useEffect, useMemo, useRef } from 'react'
import { compile, draw, type Scenario } from '../sim/engine'

/** Animated night-time crossroads used in the home hero. Pure SVG + SMIL, no JS. */
export function RoadHero() {
  const car = (fill: string) => (
    <g>
      <rect x={-11} y={-21} width={22} height={42} rx={7} fill={fill} />
      <rect x={-8} y={-13} width={16} height={8} rx={3} fill="#0b1426" opacity={0.85} />
      <rect x={-8} y={10} width={16} height={5} rx={2} fill="#0b1426" opacity={0.85} />
      <ellipse cx={-6} cy={-26} rx={5} ry={9} fill="url(#beam)" />
      <ellipse cx={6} cy={-26} rx={5} ry={9} fill="url(#beam)" />
      <rect x={-9} y={19} width={5} height={2.5} fill="#ff4d4f" />
      <rect x={4} y={19} width={5} height={2.5} fill="#ff4d4f" />
    </g>
  )
  // Each car drives a straight line; all share a 6s cycle so they never meet in the junction.
  const lanes: Array<{ path: string; rotate: number; color: string; begin: string }> = [
    { path: 'M230 380 L230 -60', rotate: 0, color: '#2f6bff', begin: '0s' },
    { path: 'M190 -60 L190 380', rotate: 180, color: '#ffc93c', begin: '0s' },
    { path: 'M460 170 L-60 170', rotate: 270, color: '#e5383b', begin: '3s' },
    { path: 'M-60 210 L460 210', rotate: 90, color: '#35d08a', begin: '3s' },
  ]
  return (
    <svg viewBox="0 0 400 320" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <radialGradient id="beam">
          <stop offset="0" stopColor="#fff6c2" stopOpacity="0.9" />
          <stop offset="1" stopColor="#fff6c2" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="lamp" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#ffc93c" stopOpacity="0.35" />
          <stop offset="1" stopColor="#ffc93c" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="grass" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#13284a" />
          <stop offset="1" stopColor="#0d1c36" />
        </linearGradient>
      </defs>
      <rect width="400" height="320" fill="url(#grass)" />
      {/* blocks */}
      {[
        [20, 20, 60, 44], [96, 30, 50, 60], [290, 24, 70, 50], [300, 92, 50, 34],
        [26, 256, 70, 46], [110, 262, 40, 40], [286, 250, 54, 50], [350, 262, 40, 40],
      ].map(([x, y, w, h], i) => (
        <rect key={i} x={x} y={y} width={w} height={h} rx={6} fill="#1b3460" opacity={0.75} />
      ))}
      {[[60, 120], [120, 110], [330, 60], [70, 230], [340, 230]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={12} fill="#1f5c4a" opacity={0.8} />
      ))}
      {/* roads */}
      <rect x="160" y="-10" width="80" height="340" fill="#1e2b45" />
      <rect x="-10" y="150" width="420" height="80" fill="#1e2b45" />
      <g stroke="#ffc93c" strokeWidth="3" strokeDasharray="14 12" opacity="0.8">
        <line x1="210" y1="-10" x2="210" y2="140">
          <animate attributeName="stroke-dashoffset" from="0" to="-52" dur="1.4s" repeatCount="indefinite" />
        </line>
        <line x1="210" y1="240" x2="210" y2="330">
          <animate attributeName="stroke-dashoffset" from="0" to="-52" dur="1.4s" repeatCount="indefinite" />
        </line>
        <line x1="-10" y1="190" x2="150" y2="190">
          <animate attributeName="stroke-dashoffset" from="0" to="52" dur="1.4s" repeatCount="indefinite" />
        </line>
        <line x1="250" y1="190" x2="410" y2="190">
          <animate attributeName="stroke-dashoffset" from="0" to="52" dur="1.4s" repeatCount="indefinite" />
        </line>
      </g>
      {/* zebra */}
      {[0, 1, 2, 3, 4].map((i) => (
        <rect key={i} x={166 + i * 15} y={244} width={9} height={22} fill="#e8edf6" opacity={0.75} />
      ))}
      {/* street lamps */}
      {[[150, 140], [260, 140], [150, 250], [260, 250]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={46} fill="url(#lamp)" />
      ))}
      {/* traffic light */}
      <g transform="translate(262 252)">
        <rect x="-7" y="-20" width="14" height="40" rx="4" fill="#070d1a" />
        <circle cx="0" cy="-10" r="4" fill="#ff4d4f">
          <animate attributeName="opacity" values="1;1;0.2;0.2;0.2;1" dur="6s" repeatCount="indefinite" />
        </circle>
        <circle cx="0" cy="0" r="4" fill="#ffc93c">
          <animate attributeName="opacity" values="0.2;0.2;0.2;0.2;1;0.2" dur="6s" repeatCount="indefinite" />
        </circle>
        <circle cx="0" cy="10" r="4" fill="#35d08a">
          <animate attributeName="opacity" values="0.2;0.2;1;1;0.2;0.2" dur="6s" repeatCount="indefinite" />
        </circle>
      </g>
      {lanes.map((l, i) => (
        <g key={i}>
          <g transform={`rotate(${l.rotate})`}>{car(l.color)}</g>
          <animateMotion path={l.path} dur="6s" begin={l.begin} repeatCount="indefinite" />
        </g>
      ))}
    </svg>
  )
}

/** Static frame of a scenario, drawn just before the decision moment. */
export function SceneThumb({ sc }: { sc: Scenario }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const comp = useMemo(() => compile(sc, null), [sc])
  useEffect(() => {
    const cv = ref.current
    if (!cv) return
    const paint = () => {
      const w = cv.clientWidth || 300
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      cv.width = Math.round(w * dpr)
      cv.height = Math.round(w * dpr)
      const ctx = cv.getContext('2d')
      if (!ctx) return
      draw(ctx, sc, comp, sc.introDuration, cv.width, 0.1)
    }
    paint()
    const ro = new ResizeObserver(paint)
    ro.observe(cv)
    return () => ro.disconnect()
  }, [sc, comp])
  return <canvas ref={ref} style={{ aspectRatio: '1', objectFit: 'cover', objectPosition: 'center 60%' }} aria-hidden="true" />
}

const CONFETTI = ['#ffc93c', '#35d08a', '#2f6bff', '#ff6b6e', '#ffffff']
export function Confetti() {
  const bits = useMemo(
    () =>
      Array.from({ length: 46 }, (_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 0.8,
        color: CONFETTI[i % CONFETTI.length],
        rot: Math.random() * 360,
      })),
    [],
  )
  return (
    <div className="confetti" aria-hidden="true">
      {bits.map((b, i) => (
        <i key={i} style={{ left: `${b.left}%`, background: b.color, animationDelay: `${b.delay}s`, transform: `rotate(${b.rot}deg)` }} />
      ))}
    </div>
  )
}

export function PageHead({ eyebrow, title, lede, right }: { eyebrow: string; title: string; lede?: string; right?: React.ReactNode }) {
  return (
    <div className="page-head">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        {lede && <p className="lede">{lede}</p>}
      </div>
      {right}
    </div>
  )
}
