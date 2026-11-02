import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { Ring } from '../components/Ring'
import { Icon } from '../components/Icons'
import { RoadHero } from '../components/Visuals'
import { TodayTasks } from './Plan'
import { currentDay, dayProgress, plan, PLAN_DAYS } from '../lib/plan'
import { studyStreak, summarize, useStore } from '../lib/store'
import { scenarios } from '../sim/scenarios'

export default function Home() {
  const { state } = useStore()
  const s = summarize(state)
  const day = currentDay(state)
  const today = plan[day - 1]
  const streak = studyStreak(state.activity)
  const started = state.planStart !== null
  const simsDone = scenarios.filter((x) => state.sims[x.id]?.correct).length
  const verdict =
    s.streakPass && s.readiness >= 80
      ? { text: 'Exam ready', cls: 'ok' }
      : s.readiness >= 50
        ? { text: 'Getting there', cls: 'yellow' }
        : { text: started ? 'Building up' : 'Ready when you are', cls: 'glass' }
  const greet = state.settings.name ? `Welcome back, ${state.settings.name}` : started ? 'Welcome back' : 'Learn to drive smart'

  return (
    <div className="page">
      <section className="hero">
        <div className="hero-body">
          <div className="row" style={{ gap: 8 }}>
            <span className={`pill ${verdict.cls}`}>{verdict.text}</span>
            {streak > 0 && (
              <span className="pill glass">
                <Icon.fire /> {streak}-day streak
              </span>
            )}
          </div>
          <div>
            <p className="muted" style={{ fontWeight: 600 }}>
              {greet}
            </p>
            <h1 style={{ fontSize: 'clamp(28px, 4vw, 40px)', marginTop: 4 }}>
              {started ? (
                <>
                  Day {day} of {PLAN_DAYS}.<br />
                  Keep the wheels turning.
                </>
              ) : (
                <>
                  Pass your theory test
                  <br />
                  in <span style={{ color: 'var(--yellow)' }}>14 days</span>.
                </>
              )}
            </h1>
          </div>
          <div className="days-strip" aria-label="Plan progress">
            {plan.map((p) => (
              <i key={p.day} className={dayProgress(p, state) >= 1 ? 'done' : p.day === day && started ? 'today' : ''} />
            ))}
          </div>
          <div className="row wrap">
            <Link className="btn yellow lg" to={today.ids.length ? `/study?day=${day}` : '/exam'}>
              {started ? 'Continue today' : 'Start day 1'} <Icon.arrow />
            </Link>
            <Link className="btn dark lg" to="/exam" style={{ background: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.15)' }}>
              <Icon.exam /> Mock exam
            </Link>
          </div>
          <div className="hero-stats">
            <div>
              <b>{s.total}</b>
              <span>QUESTIONS</span>
            </div>
            <div>
              <b>{scenarios.length}</b>
              <span>SIMULATIONS</span>
            </div>
            <div>
              <b>20 / 20′</b>
              <span>EXAM FORMAT</span>
            </div>
          </div>
        </div>
        <div className="hero-art">
          <RoadHero />
        </div>
      </section>

      <div className="grid four stats">
        <StatCard icon={<Icon.target />} color="#2f6bff" value={`${s.readiness}%`} label="readiness">
          <Ring value={s.readiness / 100} size={44} stroke={5} color="var(--brand)" track="var(--surface-2)" />
        </StatCard>
        <StatCard icon={<Icon.award />} color="#12a560" value={`${s.mastered}`} label={`of ${s.total} mastered`} />
        <StatCard icon={<Icon.refresh />} color="#ff8a00" value={`${s.due}`} label="due for review" />
        <StatCard icon={<Icon.file />} color="#7c5cff" value={`${s.examsTaken}`} label={s.examsTaken ? `exams · avg ${Math.round(s.examAvg * 100)}%` : 'mock exams'} />
      </div>

      <div className="grid two" style={{ alignItems: 'start' }}>
        <section className="card stack">
          <div className="row between">
            <div>
              <div className="eyebrow">Today</div>
              <h2>{today.title}</h2>
            </div>
            <Link to="/plan" className="btn ghost sm">
              Full plan
            </Link>
          </div>
          <TodayTasks dayNum={day} />
        </section>

        <div className="stack">
          <ActionTile to="/sim" icon={<Icon.car />} color="#e0a100" title="Driving simulations" text={`${simsDone} of ${scenarios.length} passed · decide fast, see what happens`} />
          <ActionTile to="/practice?set=weak" icon={<Icon.target />} color="#e5383b" title="Fix weak spots" text={`${s.weak} question${s.weak === 1 ? '' : 's'} you last got wrong`} />
          <ActionTile to="/practice?set=signs" icon={<Icon.image />} color="#2f6bff" title="Picture drill" text="Every question with a sign, marking or road photo" />
          <ActionTile to="/learn" icon={<Icon.layers />} color="#12a560" title="Browse by topic" text="10 topics, from road signs to vehicle rules" />
        </div>
      </div>
    </div>
  )
}

function StatCard({ icon, color, value, label, children }: { icon: React.ReactNode; color: string; value: string; label: string; children?: React.ReactNode }) {
  return (
    <div className="card tight stat-card">
      <span className="chip" style={{ '--c': color } as CSSProperties}>
        {icon}
      </span>
      <div className="stat grow">
        <b>{value}</b>
        <span>{label}</span>
      </div>
      <span className="hide-sm">{children}</span>
    </div>
  )
}

function ActionTile({ to, icon, color, title, text }: { to: string; icon: React.ReactNode; color: string; title: string; text: string }) {
  return (
    <Link to={to} className="action-tile">
      <span className="chip" style={{ '--c': color } as CSSProperties}>
        {icon}
      </span>
      <div className="grow">
        <h3>{title}</h3>
        <p className="muted" style={{ fontSize: 14 }}>
          {text}
        </p>
      </div>
      <Icon.arrow />
    </Link>
  )
}
