import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '../components/Icons'
import { Ring } from '../components/Ring'
import { QuestionView } from '../components/QuestionView'
import { Confetti } from '../components/Visuals'
import { byId, questions, shuffle, type Question } from '../lib/data'
import { useStore, type ExamRecord } from '../lib/store'

type Phase = 'intro' | 'running' | 'done'

export default function Exam() {
  const { state, answer, recordExam } = useStore()
  const { examQuestions, examMinutes, passMark } = state.settings
  const [phase, setPhase] = useState<Phase>('intro')
  const [qs, setQs] = useState<Question[]>([])
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [flags, setFlags] = useState<Record<number, boolean>>({})
  const [i, setI] = useState(0)
  const [endsAt, setEndsAt] = useState(0)
  const [now, setNow] = useState(Date.now())
  const [result, setResult] = useState<ExamRecord | null>(null)
  const startedAt = useRef(0)

  const start = () => {
    setQs(shuffle(questions).slice(0, examQuestions))
    setAnswers({})
    setFlags({})
    setI(0)
    setResult(null)
    startedAt.current = Date.now()
    setEndsAt(Date.now() + examMinutes * 60_000)
    setPhase('running')
  }

  const submit = useCallback(() => {
    let score = 0
    const wrongIds: number[] = []
    qs.forEach((q, idx) => {
      const ok = answers[idx] === q.answer
      if (ok) score++
      else wrongIds.push(q.id)
      answer(q.id, ok)
    })
    const rec: ExamRecord = {
      at: Date.now(),
      score,
      total: qs.length,
      passed: score >= Math.min(passMark, qs.length),
      seconds: Math.round((Date.now() - startedAt.current) / 1000),
      wrongIds,
    }
    recordExam(rec)
    setResult(rec)
    setPhase('done')
    window.scrollTo(0, 0)
  }, [qs, answers, answer, recordExam, passMark])

  useEffect(() => {
    if (phase !== 'running') return
    const t = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(t)
  }, [phase])

  const left = Math.max(0, endsAt - now)
  useEffect(() => {
    if (phase === 'running' && left === 0) submit()
  }, [left, phase, submit])

  // keyboard
  useEffect(() => {
    if (phase !== 'running') return
    const onKey = (e: KeyboardEvent) => {
      const q = qs[i]
      const idx = 'abcde'.indexOf(e.key.toLowerCase())
      if (idx >= 0 && q && idx < q.options.length) setAnswers((a) => ({ ...a, [i]: idx }))
      if (e.key === 'ArrowRight') setI((x) => Math.min(qs.length - 1, x + 1))
      if (e.key === 'ArrowLeft') setI((x) => Math.max(0, x - 1))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phase, qs, i])

  // warn before leaving a running exam
  useEffect(() => {
    if (phase !== 'running') return
    const h = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', h)
    return () => window.removeEventListener('beforeunload', h)
  }, [phase])

  if (phase === 'intro') return <Intro onStart={start} />

  if (phase === 'done' && result) return <Results result={result} qs={qs} answers={answers} onRetry={start} />

  const q = qs[i]
  const answered = Object.keys(answers).length
  const mm = Math.floor(left / 60000)
  const ss = Math.floor((left % 60000) / 1000)

  const trySubmit = () => {
    const unanswered = qs.length - answered
    if (unanswered === 0 || window.confirm(`You have ${unanswered} unanswered question${unanswered > 1 ? 's' : ''}. Submit anyway?`)) submit()
  }

  return (
    <div className="page narrow">
      <div className="quiz-bar stack" style={{ gap: 10 }}>
        <div className="row between">
          <span className={`timer ${left < 60_000 ? 'low' : ''}`} aria-live="off">
            <Ring value={left / (examMinutes * 60_000)} size={34} stroke={5} color={left < 60_000 ? 'var(--bad)' : 'var(--brand)'} track="var(--surface-2)" />
            {mm}:{String(ss).padStart(2, '0')}
          </span>
          <span className="faint">
            {answered}/{qs.length} answered
          </span>
          <button className="btn sm" onClick={trySubmit}>
            Submit
          </button>
        </div>
        <div className="navgrid">
          {qs.map((_, k) => (
            <button
              key={k}
              className={[answers[k] !== undefined && 'answered', k === i && 'current', flags[k] && 'flag'].filter(Boolean).join(' ')}
              onClick={() => setI(k)}
              aria-label={`Question ${k + 1}`}
            >
              {k + 1}
            </button>
          ))}
        </div>
      </div>

      <QuestionView q={q} picked={answers[i] ?? null} reveal={false} onPick={(o) => setAnswers((a) => ({ ...a, [i]: o }))} index={i} total={qs.length} hideTopic />

      <div className="row quiz-actions">
        <button className="btn secondary" onClick={() => setI(i - 1)} disabled={i === 0} aria-label="Previous">
          <Icon.back />
        </button>
        <button className={`btn ${flags[i] ? '' : 'secondary'}`} onClick={() => setFlags((f) => ({ ...f, [i]: !f[i] }))} aria-label="Flag for review">
          <Icon.flag />
        </button>
        {i < qs.length - 1 ? (
          <button className="btn grow" onClick={() => setI(i + 1)}>
            Next <Icon.arrow />
          </button>
        ) : (
          <button className="btn ok grow" onClick={trySubmit}>
            Submit exam
          </button>
        )}
      </div>
    </div>
  )
}

function Intro({ onStart }: { onStart: () => void }) {
  const { state } = useStore()
  const { examQuestions, examMinutes, passMark } = state.settings
  const recent = state.exams.slice(-8)
  return (
    <div className="page narrow">
      <section className="result-hero" style={{ textAlign: 'left', padding: 28 }}>
        <div className="stack lg" style={{ position: 'relative' }}>
          <span className="pill yellow" style={{ alignSelf: 'flex-start' }}>Exam conditions</span>
          <h1 style={{ color: '#fff' }}>Mock theory exam</h1>
          <p className="muted">Random questions from all 403, a countdown, and no answers shown until you submit. Just like the real thing.</p>
          <div className="hero-stats">
            <div>
              <b>{examQuestions}</b>
              <span>QUESTIONS</span>
            </div>
            <div>
              <b>{examMinutes} min</b>
              <span>TIME LIMIT</span>
            </div>
            <div>
              <b>
                {passMark}/{examQuestions}
              </b>
              <span>TO PASS</span>
            </div>
          </div>
          <button className="btn yellow lg" onClick={onStart} style={{ alignSelf: 'flex-start' }}>
            <Icon.play /> Start exam
          </button>
        </div>
      </section>
      <div className="card stack">
        <ul className="muted" style={{ margin: 0, paddingLeft: 18 }}>
          <li>Move between questions freely and flag the ones you want to revisit.</li>
          <li>The exam submits itself when time runs out.</li>
          <li>Your answers update your review schedule, so mistakes come back in practice.</li>
        </ul>
        <p className="faint">
          Same format as the official theory test: 20 questions in 20 minutes. You can adjust the pass mark under{' '}
          <Link to="/progress" style={{ textDecoration: 'underline' }}>
            Progress → Settings
          </Link>
          .
        </p>
      </div>
      {recent.length > 0 && (
        <div className="card stack">
          <h3>Recent attempts</h3>
          {recent
            .slice()
            .reverse()
            .map((e) => (
              <div key={e.at} className="row between">
                <span className="muted">{new Date(e.at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</span>
                <span className={`pill ${e.passed ? 'ok' : 'bad'}`}>
                  {e.score}/{e.total} {e.passed ? 'Pass' : 'Fail'}
                </span>
              </div>
            ))}
        </div>
      )}
    </div>
  )
}

function Results({ result, qs, answers, onRetry }: { result: ExamRecord; qs: Question[]; answers: Record<number, number>; onRetry: () => void }) {
  const [filter, setFilter] = useState<'wrong' | 'all'>('wrong')
  const [open, setOpen] = useState<number | null>(null)
  const list = qs.map((q, idx) => ({ q, idx, ok: answers[idx] === q.answer })).filter((x) => filter === 'all' || !x.ok)
  const mins = Math.floor(result.seconds / 60)
  return (
    <div className="page narrow">
      <div className={`result-hero stack lg ${result.passed ? 'pass' : 'fail'}`} style={{ alignItems: 'center' }}>
        {result.passed && <Confetti />}
        <span className={`pill ${result.passed ? 'ok' : 'bad'}`} style={{ fontSize: 14, padding: '6px 14px' }}>
          {result.passed ? '🎉 PASSED' : 'NOT PASSED YET'}
        </span>
        <div className="result-big">
          {result.score}
          <span style={{ fontSize: 30, color: '#7d8bab' }}>/{result.total}</span>
        </div>
        <p className="muted">
          Finished in {mins}m {result.seconds % 60}s.{' '}
          {result.passed ? 'Well done! Aim to pass 3 in a row before the real test.' : 'Review the questions below, then try again.'}
        </p>
        <div className="row wrap" style={{ justifyContent: 'center' }}>
          {result.wrongIds.length > 0 && (
            <Link className="btn dark" style={{ background: 'rgba(255,255,255,.1)' }} to={`/practice?ids=${result.wrongIds.join(',')}`}>
              Practise my {result.wrongIds.length} mistakes
            </Link>
          )}
          <button className="btn yellow" onClick={onRetry}>
            <Icon.replay /> New exam
          </button>
        </div>
      </div>

      <div className="row between">
        <h3>Review</h3>
        <div className="seg">
          <button className={filter === 'wrong' ? 'on' : ''} onClick={() => setFilter('wrong')}>
            Mistakes
          </button>
          <button className={filter === 'all' ? 'on' : ''} onClick={() => setFilter('all')}>
            All
          </button>
        </div>
      </div>
      <div className="navgrid">
        {qs.map((q, k) => (
          <button key={k} className={answers[k] === q.answer ? 'right' : 'wrongq'} onClick={() => { setFilter('all'); setOpen(k) }}>
            {k + 1}
          </button>
        ))}
      </div>
      {list.length === 0 && <div className="card empty">No mistakes. Perfect score! 🎉</div>}
      {list.map(({ q, idx, ok }) =>
        open === idx ? (
          <QuestionView key={idx} q={byId.get(q.id)!} picked={answers[idx] ?? null} reveal index={idx} total={qs.length} />
        ) : (
          <button key={idx} className="task" style={{ textAlign: 'left' }} onClick={() => setOpen(idx)}>
            <span className={`pill ${ok ? 'ok' : 'bad'}`}>{idx + 1}</span>
            <div className="grow">
              <div style={{ fontWeight: 600 }}>{q.q}</div>
              {!ok && (
                <div className="faint">{answers[idx] === undefined ? 'Not answered' : 'Tap to see the correct answer'}</div>
              )}
            </div>
          </button>
        ),
      )}
    </div>
  )
}
