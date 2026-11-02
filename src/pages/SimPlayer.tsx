import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Icon } from '../components/Icons'
import { useStore } from '../lib/store'
import { compile, draw } from '../sim/engine'
import { scenarios } from '../sim/scenarios'

type Phase = 'ready' | 'intro' | 'decide' | 'outcome' | 'feedback'
const DECIDE_SECONDS = 12

export default function SimPlayer() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { recordSim } = useStore()
  const idx = scenarios.findIndex((s) => s.id === id)
  const sc = scenarios[idx]
  const [phase, setPhase] = useState<Phase>('ready')
  const [choice, setChoice] = useState<number | null>(null)
  const [timedOut, setTimedOut] = useState(false)
  const [decideLeft, setDecideLeft] = useState(DECIDE_SECONDS)
  // Shuffle answer order per visit so position can't be memorised.
  const order = useMemo(() => (sc ? sc.choices.map((_, i) => i).sort(() => Math.random() - 0.5) : []), [sc, phase === 'ready'])  // eslint-disable-line react-hooks/exhaustive-deps

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const tRef = useRef(0)
  const comp = useMemo(() => (sc ? compile(sc, choice) : null), [sc, choice])

  // reset when switching scenario
  useEffect(() => {
    setPhase('ready')
    setChoice(null)
    setTimedOut(false)
    tRef.current = 0
  }, [id])

  // render loop
  useEffect(() => {
    if (!sc || !comp) return
    const cv = canvasRef.current!
    const ctx = cv.getContext('2d')!
    let raf = 0
    let last = performance.now()
    const size = () => {
      const r = wrapRef.current!.getBoundingClientRect()
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      cv.width = Math.round(r.width * dpr)
      cv.height = Math.round(r.width * dpr)
    }
    size()
    const ro = new ResizeObserver(size)
    ro.observe(wrapRef.current!)
    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      if (phase === 'intro') {
        tRef.current = Math.min(sc.introDuration, tRef.current + dt)
        if (tRef.current >= sc.introDuration) setPhase('decide')
      } else if (phase === 'outcome') {
        tRef.current = Math.min(comp.duration, tRef.current + dt)
        if (tRef.current >= comp.duration) setPhase('feedback')
      } else if (phase === 'decide') {
        // keep blinking lights alive while frozen
        tRef.current = sc.introDuration
      }
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, cv.width, cv.height)
      draw(ctx, sc, comp, tRef.current, cv.width, phase === 'decide' ? now / 1000 : tRef.current)
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
    }
  }, [sc, comp, phase])

  // decision countdown
  useEffect(() => {
    if (phase !== 'decide') return
    const end = Date.now() + DECIDE_SECONDS * 1000
    setDecideLeft(DECIDE_SECONDS)
    const t = setInterval(() => {
      const left = Math.max(0, (end - Date.now()) / 1000)
      setDecideLeft(left)
      if (left <= 0) {
        clearInterval(t)
        setTimedOut(true)
        recordSim(sc.id, false)
        setPhase('feedback')
      }
    }, 100)
    return () => clearInterval(t)
  }, [phase, sc, recordSim])

  if (!sc)
    return (
      <div className="page narrow">
        <div className="card empty">
          Scenario not found. <Link to="/sim">Back to scenarios</Link>
        </div>
      </div>
    )

  const begin = () => {
    setChoice(null)
    setTimedOut(false)
    tRef.current = 0
    setPhase('intro')
  }
  const decide = (c: number) => {
    if (phase !== 'decide') return
    setChoice(c)
    recordSim(sc.id, sc.choices[c].correct)
    tRef.current = sc.introDuration
    setPhase('outcome')
  }
  const replayOutcome = () => {
    tRef.current = sc.introDuration
    setPhase('outcome')
  }

  const ch = choice !== null ? sc.choices[choice] : null
  const next = scenarios[idx + 1]

  return (
    <div className="page">
      <div className="row between">
        <button className="btn ghost sm" onClick={() => navigate('/sim')}>
          <Icon.back /> Scenarios
        </button>
        <span className="faint">
          Scenario {idx + 1} of {scenarios.length}
        </span>
      </div>

      <div className="sim-wrap">
        <div className="sim-canvas" ref={wrapRef}>
          <canvas ref={canvasRef} aria-label={`Animated top-down traffic scene: ${sc.brief}`} role="img" />
          {phase === 'ready' && (
            <div className="sim-overlay full">
              <span className="pill yellow">Scenario {idx + 1}</span>
              <h2 style={{ color: '#fff', fontSize: 26 }}>{sc.title}</h2>
              <p style={{ fontWeight: 500, opacity: 0.85, maxWidth: 360 }}>{sc.brief}</p>
              <button className="btn yellow lg" style={{ marginTop: 8 }} onClick={begin}>
                <Icon.play /> Start scene
              </button>
            </div>
          )}
          {(phase === 'intro' || phase === 'outcome') && (
            <div className="sim-hud">
              <span className="pill glass">{phase === 'intro' ? '● Watch the road' : '▶ Outcome'}</span>
              <span className="pill glass">You = blue car</span>
            </div>
          )}
          {phase === 'decide' && (
            <div className="sim-overlay">
              <span>Decide!</span>
              <div className="countdown">
                <i style={{ width: `${(decideLeft / DECIDE_SECONDS) * 100}%` }} />
              </div>
              <span style={{ fontVariantNumeric: 'tabular-nums' }}>{Math.ceil(decideLeft)}s</span>
            </div>
          )}
        </div>

        <div className="stack lg">
          <div className="stack">
            <div className="eyebrow">Scenario {idx + 1}</div>
            <h2 style={{ fontSize: 26 }}>{sc.title}</h2>
            <p className="muted">{sc.brief}</p>
          </div>
          <div className="stack">
            <h3>{sc.question}</h3>
            {order.map((c, k) => {
              const o = sc.choices[c]
              let cls = 'choice'
              if (phase === 'decide') cls += ' live'
              if (phase === 'feedback' || phase === 'outcome') {
                if (o.correct) cls += ' correct'
                else if (c === choice) cls += ' wrong'
              }
              return (
                <button key={c} className={cls} disabled={phase !== 'decide'} onClick={() => decide(c)}>
                  <span className="letter">{'ABC'[k]}</span>
                  <span>{o.label}</span>
                </button>
              )
            })}
            {phase === 'intro' && <p className="faint">Watch the scene… the options unlock in a moment.</p>}
          </div>

          {phase === 'feedback' && (
            <div className="stack fade-in">
              {timedOut ? (
                <div className="card flat stack" style={{ background: 'var(--bad-soft)', borderColor: 'transparent' }}>
                  <b style={{ color: 'var(--bad)' }}>Too slow</b>
                  <p>Hesitating at the wheel is dangerous too. Read the scene early and decide.</p>
                </div>
              ) : (
                ch && (
                  <div className="card flat stack" style={{ background: ch.correct ? 'var(--ok-soft)' : 'var(--bad-soft)', borderColor: 'transparent' }}>
                    <b style={{ color: ch.correct ? 'var(--ok)' : 'var(--bad)' }}>{ch.correct ? 'Safe choice ✓' : ch.crash ? 'Collision ✗' : 'Dangerous ✗'}</b>
                    <p>{ch.feedback}</p>
                  </div>
                )
              )}
              <div className="rule">📘 {sc.rule}</div>
              <div className="row wrap">
                {ch && (
                  <button className="btn secondary" onClick={replayOutcome}>
                    <Icon.replay /> Watch again
                  </button>
                )}
                <button className="btn secondary" onClick={begin}>
                  Try again
                </button>
                {next ? (
                  <Link className="btn" to={`/sim/${next.id}`}>
                    Next scenario <Icon.arrow />
                  </Link>
                ) : (
                  <Link className="btn" to="/sim">
                    All scenarios
                  </Link>
                )}
              </div>
              <Link to={`/practice?topic=${sc.relatedTopic}`} className="faint" style={{ textDecoration: 'underline' }}>
                Practise related theory questions →
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
