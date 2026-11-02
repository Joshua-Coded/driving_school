import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHead } from '../components/Visuals'
import { questions, topicColor, topics } from '../lib/data'
import { DEFAULT_SETTINGS, isMastered, summarize, useStore } from '../lib/store'

export default function ProgressPage() {
  const { state, updateSettings, reset } = useStore()
  const s = summarize(state)
  const exams = state.exams.slice(-15)

  return (
    <div className="page">
      <PageHead eyebrow="Progress" title="How you're doing" lede="Mastered means answered correctly 3 times in a row. Questions you miss come back sooner." />

      <div className="grid two">
        <section className="card stack">
          <h3>Mastery by topic</h3>
          {topics.map((t) => {
            const qs = questions.filter((q) => q.topic === t.id)
            const m = qs.filter((q) => isMastered(state.stats[q.id])).length
            const seen = qs.filter((q) => state.stats[q.id]).length
            return (
              <Link to={`/practice?topic=${t.id}`} key={t.id} className="stack" style={{ gap: 4 }}>
                <div className="row between">
                  <span style={{ fontWeight: 600 }}>{t.name}</span>
                  <span className="faint">
                    {m}/{qs.length} · seen {seen}
                  </span>
                </div>
                <div className="bar">
                  <i style={{ width: `${(m / qs.length) * 100}%`, background: topicColor(t.id) }} />
                </div>
              </Link>
            )
          })}
        </section>

        <section className="card stack">
          <div className="row between">
            <h3>Mock exam scores</h3>
            <span className="faint">pass mark {state.settings.passMark}</span>
          </div>
          {exams.length === 0 ? (
            <div className="empty">
              No exams yet. <Link to="/exam" style={{ textDecoration: 'underline' }}>Take your first one</Link>.
            </div>
          ) : (
            <ExamChart exams={exams} pass={state.settings.passMark} />
          )}
          <div className="grid two">
            <div className="stat">
              <b>{s.examsTaken}</b>
              <span>exams taken</span>
            </div>
            <div className="stat">
              <b>{state.exams.filter((e) => e.passed).length}</b>
              <span>passed</span>
            </div>
          </div>
        </section>
      </div>

      <Settings
        values={state.settings}
        onSave={updateSettings}
        onReset={() => {
          if (window.confirm('Delete all progress, scores and bookmarks on this device?')) reset()
        }}
      />
    </div>
  )
}

function ExamChart({ exams, pass }: { exams: { score: number; total: number; passed: boolean; at: number }[]; pass: number }) {
  const W = 320
  const H = 140
  const bw = W / Math.max(exams.length, 8)
  const max = Math.max(...exams.map((e) => e.total), pass)
  const y = (v: number) => H - (v / max) * (H - 10)
  return (
    <svg viewBox={`0 0 ${W} ${H + 18}`} className="chart" role="img" aria-label="Mock exam scores over time">
      <line x1={0} x2={W} y1={y(pass)} y2={y(pass)} stroke="var(--warn)" strokeDasharray="4 4" />
      {exams.map((e, i) => (
        <g key={e.at}>
          <rect x={i * bw + bw * 0.18} width={bw * 0.64} y={y(e.score)} height={H - y(e.score)} rx={4} fill={e.passed ? 'var(--ok)' : 'var(--bad)'}>
            <title>
              {e.score}/{e.total} on {new Date(e.at).toLocaleDateString()}
            </title>
          </rect>
          <text x={i * bw + bw / 2} y={H + 14} fontSize={10} textAnchor="middle" fill="var(--ink-3)">
            {e.score}
          </text>
        </g>
      ))}
    </svg>
  )
}

function Settings({
  values,
  onSave,
  onReset,
}: {
  values: typeof DEFAULT_SETTINGS
  onSave: (v: Partial<typeof DEFAULT_SETTINGS>) => void
  onReset: () => void
}) {
  const [v, setV] = useState(values)
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem('driveready:theme') ?? 'auto'
    } catch {
      return 'auto'
    }
  })
  useEffect(() => {
    if (theme === 'auto') document.documentElement.removeAttribute('data-theme')
    else document.documentElement.setAttribute('data-theme', theme)
    try {
      localStorage.setItem('driveready:theme', theme)
    } catch {
      /* ignore */
    }
  }, [theme])

  const num = (k: 'examQuestions' | 'examMinutes' | 'passMark') => (e: React.ChangeEvent<HTMLInputElement>) =>
    setV({ ...v, [k]: Math.max(1, Math.min(k === 'examQuestions' ? questions.length : 180, Number(e.target.value) || 1)) })
  const dirty = JSON.stringify(v) !== JSON.stringify(values)

  return (
    <section className="card stack lg">
      <h3>Settings</h3>
      <div className="grid two">
        <label className="field">
          Your first name
          <input type="text" value={v.name} onChange={(e) => setV({ ...v, name: e.target.value.slice(0, 30) })} placeholder="Optional" />
        </label>
        <label className="field">
          Theme
          <div className="seg">
            {['auto', 'light', 'dark'].map((t) => (
              <button key={t} type="button" className={theme === t ? 'on' : ''} onClick={() => setTheme(t)}>
                {t[0].toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </label>
      </div>
      <div className="grid three">
        <label className="field">
          Exam questions
          <input type="number" value={v.examQuestions} onChange={num('examQuestions')} />
        </label>
        <label className="field">
          Time limit (minutes)
          <input type="number" value={v.examMinutes} onChange={num('examMinutes')} />
        </label>
        <label className="field">
          Pass mark
          <input type="number" value={v.passMark} onChange={num('passMark')} />
        </label>
      </div>
      <div className="row wrap between">
        <div className="row wrap">
          <button className="btn" disabled={!dirty} onClick={() => onSave({ ...v, passMark: Math.min(v.passMark, v.examQuestions) })}>
            Save settings
          </button>
          <button className="btn ghost" onClick={() => setV({ ...DEFAULT_SETTINGS, name: v.name })}>
            Default exam format
          </button>
        </div>
        <button className="btn danger" onClick={onReset}>
          Reset all progress
        </button>
      </div>
    </section>
  )
}
