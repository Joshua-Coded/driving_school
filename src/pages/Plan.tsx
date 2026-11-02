import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '../components/Icons'
import { PageHead } from '../components/Visuals'
import { topicName } from '../lib/data'
import { currentDay, dayProgress, plan, PLAN_DAYS, taskProgress, type Task } from '../lib/plan'
import { DAY, useStore } from '../lib/store'

export default function PlanPage() {
  const { state, startPlan } = useStore()
  const today = currentDay(state)
  const [sel, setSel] = useState(today)
  const d = plan[sel - 1]
  const date = state.planStart ? new Date(state.planStart + (sel - 1) * DAY) : null

  return (
    <div className="page narrow">
      <PageHead
        eyebrow="14-day plan"
        title="Your road to the test"
        lede="Days 1–11 cover every question in small batches. Days 12–14 are for weak spots and full mock exams."
      />

      <div className="card stack">
        <div className="days">
          {plan.map((p) => {
            const pr = dayProgress(p, state)
            const cls = ['day-dot', p.day === today && 'today', pr >= 1 && 'complete', p.day === sel && 'selected'].filter(Boolean).join(' ')
            return (
              <button key={p.day} className={cls} onClick={() => setSel(p.day)} aria-label={`Day ${p.day}, ${Math.round(pr * 100)}% done`}>
                {pr < 1 && <i className="fill" style={{ height: `${pr * 100}%` }} />}
                <span>{p.day}</span>
              </button>
            )
          })}
        </div>
        <div className="row between faint">
          <span>{state.planStart ? `Started ${new Date(state.planStart).toLocaleDateString()}` : 'Starts when you answer your first question'}</span>
          {state.planStart && (
            <button className="btn ghost sm" onClick={() => confirmRestart() && startPlan()}>
              Restart from today
            </button>
          )}
        </div>
      </div>

      <section className="card stack">
        <div className="row between">
          <div>
            <h2>{d.title}</h2>
            <p className="faint">
              {[
                date?.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' }),
                d.ids.length > 0 ? d.focus.split(',').map(topicName).join(', ') : { weak: 'Weak spots', review: 'Review', final: 'Exam rehearsal' }[d.focus],
              ]
                .filter(Boolean)
                .join(' · ')}
            </p>
          </div>
          <span className="pill brand">{Math.round(dayProgress(d, state) * 100)}%</span>
        </div>
        <TodayTasks dayNum={sel} />
      </section>
      <p className="faint">Day {PLAN_DAYS}’s exam task only counts mock exams you pass on that day.</p>
    </div>
  )
}

function confirmRestart() {
  return window.confirm('Restart the 14-day plan from today? Your answers and scores are kept.')
}

function taskLink(t: Task, dayNum: number) {
  switch (t.kind) {
    case 'learn':
      return `/study?day=${dayNum}`
    case 'practice':
      return `/practice?day=${dayNum}`
    case 'review':
      return '/practice?set=due'
    case 'weak':
      return '/practice?set=weak'
    case 'sim':
      return `/sim/${t.id}`
    case 'exam':
      return '/exam'
  }
}

export function TodayTasks({ dayNum }: { dayNum: number }) {
  const { state } = useStore()
  const d = plan[dayNum - 1]
  return (
    <div className="stack">
      {d.tasks.map((t, i) => {
        const p = taskProgress(t, state, dayNum)
        const done = p.done >= p.total
        return (
          <Link key={i} to={taskLink(t, dayNum)} className={`task ${done ? 'done' : ''}`}>
            <span className="check">{done && <Icon.check />}</span>
            <div className="grow">
              <div style={{ fontWeight: 600 }}>{t.label}</div>
              {p.total > 1 && (
                <div className="row" style={{ gap: 8, marginTop: 6 }}>
                  <div className="bar thin ok grow">
                    <i style={{ width: `${(p.done / p.total) * 100}%` }} />
                  </div>
                  <span className="faint">
                    {p.done}/{p.total}
                  </span>
                </div>
              )}
            </div>
            <Icon.arrow />
          </Link>
        )
      })}
    </div>
  )
}
