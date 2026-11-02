import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Icon } from '../components/Icons'
import { QuestionView } from '../components/QuestionView'
import { Confetti } from '../components/Visuals'
import { byId, shuffle } from '../lib/data'
import { resolveSet } from '../lib/sessions'
import { useStore } from '../lib/store'

/**
 * Practice: instant feedback. A question you get wrong comes back
 * later in the same session, so every session ends with all answers right.
 */
export default function Practice() {
  const [params] = useSearchParams()
  const { state, answer } = useStore()
  const navigate = useNavigate()
  const key = params.toString()
  const set = useMemo(() => resolveSet(params, state), [key]) // eslint-disable-line react-hooks/exhaustive-deps

  const [queue, setQueue] = useState<number[]>(() => shuffle(set.ids))
  const [pos, setPos] = useState(0)
  const [picked, setPicked] = useState<number | null>(null)
  const [firstTry, setFirstTry] = useState<Record<number, boolean>>({})
  const uniqueTotal = set.ids.length

  useEffect(() => {
    setQueue(shuffle(set.ids))
    setPos(0)
    setPicked(null)
    setFirstTry({})
  }, [set])

  const q = queue[pos] !== undefined ? byId.get(queue[pos]) : undefined
  const done = pos >= queue.length

  const pick = useCallback(
    (i: number) => {
      if (!q || picked !== null) return
      const ok = i === q.answer
      setPicked(i)
      answer(q.id, ok)
      setFirstTry((f) => (q.id in f ? f : { ...f, [q.id]: ok }))
      if (!ok) {
        // bring it back a few cards later (or at the end)
        setQueue((qq) => {
          const n = qq.slice()
          n.splice(Math.min(n.length, pos + 4), 0, q.id)
          return n
        })
      }
    },
    [q, picked, answer, pos],
  )

  const next = useCallback(() => {
    setPicked(null)
    setPos((p) => p + 1)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!q) return
      const n = 'abcde'.indexOf(e.key.toLowerCase())
      const d = '12345'.indexOf(e.key)
      const idx = n >= 0 ? n : d
      if (picked === null && idx >= 0 && idx < q.options.length) pick(idx)
      else if (picked !== null && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault()
        next()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [q, picked, pick, next])

  if (uniqueTotal === 0)
    return (
      <div className="page narrow">
        <div className="card empty stack" style={{ alignItems: 'center' }}>
          <span className="chip" style={{ width: 64, height: 64 }}>
            <Icon.check />
          </span>
          <h2>Nothing here right now</h2>
          <p>{set.title}: no questions in this set yet.</p>
          <Link to="/" className="btn">
            Back home
          </Link>
        </div>
      </div>
    )

  const firstRight = Object.values(firstTry).filter(Boolean).length
  const answeredUnique = Object.keys(firstTry).length

  if (done || !q) {
    const wrongIds = Object.entries(firstTry)
      .filter(([, ok]) => !ok)
      .map(([id]) => id)
    const pct = Math.round((firstRight / Math.max(1, answeredUnique)) * 100)
    return (
      <div className="page narrow">
        <div className={`result-hero stack lg ${pct >= 60 ? 'pass' : 'fail'}`} style={{ alignItems: 'center' }}>
          {pct >= 80 && <Confetti />}
          <span className="chip" style={{ width: 64, height: 64, borderRadius: 20, background: 'rgba(255,255,255,.1)', color: 'var(--yellow)' }}>
            {pct >= 80 ? <Icon.trophy /> : pct >= 60 ? <Icon.award /> : <Icon.book />}
          </span>
          <div className="result-big">{pct}%</div>
          <p className="muted">
            {firstRight} of {answeredUnique} right on the first try. Every question was answered correctly by the end.
          </p>
          <div className="row wrap" style={{ justifyContent: 'center' }}>
            {wrongIds.length > 0 && (
              <Link className="btn dark" style={{ background: 'rgba(255,255,255,.1)' }} to={`/study?ids=${wrongIds.join(',')}`}>
                Review the {wrongIds.length} I missed
              </Link>
            )}
            <button className="btn dark" style={{ background: 'rgba(255,255,255,.1)' }} onClick={() => navigate(0)}>
              <Icon.replay /> Again
            </button>
            <Link className="btn yellow" to="/">
              Home
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page narrow">
      <div className="quiz-bar stack" style={{ gap: 8 }}>
        <div className="row between">
          <button className="btn ghost sm" onClick={() => navigate(-1)}>
            <Icon.close /> Exit
          </button>
          <span className="faint">{set.title}</span>
          <span className="pill ok">
            <Icon.check /> {firstRight}/{answeredUnique}
          </span>
        </div>
        <div className="bar thin ok">
          <i style={{ width: `${(pos / queue.length) * 100}%` }} />
        </div>
      </div>

      <QuestionView q={q} picked={picked} reveal={picked !== null} onPick={pick} index={pos} total={queue.length} />

      {picked !== null && (
        <div className="quiz-actions">
          <button className="btn block" onClick={next} autoFocus>
            {pos + 1 >= queue.length ? 'See results' : 'Next question'} <Icon.arrow />
          </button>
        </div>
      )}
      <p className="faint hide-sm">
        Keys: <span className="kbd">A</span>–<span className="kbd">D</span> to answer, <span className="kbd">Enter</span> for next.
      </p>
    </div>
  )
}
