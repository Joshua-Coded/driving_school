import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Icon } from '../components/Icons'
import { QuestionView } from '../components/QuestionView'
import { byId } from '../lib/data'
import { resolveSet } from '../lib/sessions'
import { useStore } from '../lib/store'

/** Study mode: one card at a time with the correct answer shown. */
export default function Study() {
  const [params] = useSearchParams()
  const { state, markStudied } = useStore()
  const navigate = useNavigate()
  // Resolve the set once so it doesn't shift while studying.
  const set = useMemo(() => resolveSet(params, state), [params.toString()]) // eslint-disable-line react-hooks/exhaustive-deps
  const qs = set.ids.map((id) => byId.get(id)!).filter(Boolean)
  const firstUnseen = Math.max(0, qs.findIndex((q) => !state.studied[q.id] && !state.stats[q.id]))
  const [i, setI] = useState(firstUnseen)
  const q = qs[i]

  useEffect(() => {
    if (q) markStudied(q.id)
  }, [q, markStudied])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') setI((x) => Math.min(qs.length - 1, x + 1))
      if (e.key === 'ArrowLeft') setI((x) => Math.max(0, x - 1))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [qs.length])

  if (!q)
    return (
      <div className="page narrow">
        <div className="card empty">Nothing to study here yet.</div>
      </div>
    )

  const practiceLink = `/practice?${params.toString()}`
  const last = i === qs.length - 1

  return (
    <div className="page narrow">
      <div className="quiz-bar stack" style={{ gap: 8 }}>
        <div className="row between">
          <button className="btn ghost sm" onClick={() => navigate(-1)}>
            <Icon.back /> Back
          </button>
          <span className="faint">Study · {set.title}</span>
          <Link className="btn sm" to={practiceLink}>
            Practise
          </Link>
        </div>
        <div className="bar thin">
          <i style={{ width: `${((i + 1) / qs.length) * 100}%` }} />
        </div>
      </div>

      <QuestionView q={q} picked={null} reveal index={i} total={qs.length} />

      <div className="row quiz-actions">
        <button className="btn secondary" onClick={() => setI(i - 1)} disabled={i === 0} aria-label="Previous">
          <Icon.back />
        </button>
        {last ? (
          <Link className="btn ok grow" to={practiceLink}>
            Done. Now practise these {qs.length} <Icon.arrow />
          </Link>
        ) : (
          <button className="btn grow" onClick={() => setI(i + 1)}>
            Next card <Icon.arrow />
          </button>
        )}
      </div>
      <p className="faint hide-sm">Tip: use ← → keys to move between cards.</p>
    </div>
  )
}
