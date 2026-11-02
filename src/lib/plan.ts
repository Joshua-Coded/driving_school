import { questions } from './data'
import { DAY, isDue, type State } from './store'
import { scenarios } from '../sim/scenarios'

export const PLAN_DAYS = 14
const LEARN_DAYS = 11
const TOPIC_ORDER = ['signs', 'markings', 'priority', 'speed', 'overtaking', 'lights', 'parking', 'safety', 'rules', 'vehicle']

export type Task =
  | { kind: 'learn'; ids: number[]; label: string }
  | { kind: 'practice'; ids: number[]; label: string }
  | { kind: 'review'; label: string }
  | { kind: 'weak'; label: string }
  | { kind: 'sim'; id: string; label: string }
  | { kind: 'exam'; count: number; label: string }

export interface PlanDay {
  day: number
  title: string
  focus: string
  ids: number[]
  tasks: Task[]
}

const ordered = [...questions].sort(
  (a, b) => TOPIC_ORDER.indexOf(a.topic) - TOPIC_ORDER.indexOf(b.topic) || a.id - b.id,
)

function batches(): number[][] {
  const out: number[][] = []
  const per = Math.ceil(ordered.length / LEARN_DAYS)
  for (let i = 0; i < LEARN_DAYS; i++) out.push(ordered.slice(i * per, (i + 1) * per).map((q) => q.id))
  return out
}

function focusOf(ids: number[]) {
  const counts = new Map<string, number>()
  for (const id of ids) {
    const t = questions.find((q) => q.id === id)!.topic
    counts.set(t, (counts.get(t) ?? 0) + 1)
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([t]) => t)
}

export const plan: PlanDay[] = (() => {
  const b = batches()
  const days: PlanDay[] = b.map((ids, i) => {
    const tasks: Task[] = [
      { kind: 'learn', ids, label: `Study ${ids.length} new questions` },
      { kind: 'practice', ids, label: 'Practise them until each one is right' },
    ]
    if (i > 0) tasks.push({ kind: 'review', label: 'Clear your spaced-repetition reviews' })
    const sim = scenarios[i % scenarios.length]
    if (i < scenarios.length) tasks.push({ kind: 'sim', id: sim.id, label: `Scenario: ${sim.title}` })
    if (i === 3 || i === 7 || i === 10) tasks.push({ kind: 'exam', count: 1, label: 'Take 1 mock exam' })
    return { day: i + 1, title: `Day ${i + 1}`, focus: '', ids, tasks }
  })
  days.forEach((d) => (d.focus = focusOf(d.ids).slice(0, 2).join(',')))
  days.push({
    day: 12,
    title: 'Day 12',
    focus: 'weak',
    ids: [],
    tasks: [
      { kind: 'weak', label: 'Fix every question you last got wrong' },
      { kind: 'review', label: 'Clear your spaced-repetition reviews' },
      { kind: 'exam', count: 2, label: 'Take 2 mock exams' },
    ],
  })
  days.push({
    day: 13,
    title: 'Day 13',
    focus: 'review',
    ids: [],
    tasks: [
      { kind: 'review', label: 'Clear your spaced-repetition reviews' },
      { kind: 'weak', label: 'Zero weak questions left' },
      { kind: 'exam', count: 2, label: 'Take 2 mock exams' },
    ],
  })
  days.push({
    day: 14,
    title: 'Day 14 · Final check',
    focus: 'final',
    ids: [],
    tasks: [
      { kind: 'exam', count: 3, label: 'Pass 3 mock exams in a row' },
      { kind: 'review', label: 'Last light review' },
    ],
  })
  return days
})()

export function currentDay(state: State, now = Date.now()) {
  if (!state.planStart) return 1
  return Math.min(PLAN_DAYS, Math.max(1, Math.floor((now - state.planStart) / DAY) + 1))
}

export function taskProgress(task: Task, state: State, dayNum: number): { done: number; total: number } {
  const st = state.stats
  // Reviews and weak-spot tasks only make sense once that day has arrived.
  const reached = state.planStart !== null && dayNum <= currentDay(state)
  if ((task.kind === 'review' || task.kind === 'weak') && !reached) return { done: 0, total: 1 }
  switch (task.kind) {
    case 'learn':
      return { done: task.ids.filter((id) => st[id]?.seen || state.studied[id]).length, total: task.ids.length }
    case 'practice':
      return { done: task.ids.filter((id) => st[id]?.lastOk).length, total: task.ids.length }
    case 'review': {
      const due = questions.filter((q) => isDue(st[q.id])).length
      return due === 0 ? { done: 1, total: 1 } : { done: 0, total: 1 }
    }
    case 'weak': {
      const weak = questions.filter((q) => st[q.id] && !st[q.id].lastOk).length
      return weak === 0 ? { done: 1, total: 1 } : { done: 0, total: 1 }
    }
    case 'sim':
      return { done: state.sims[task.id]?.correct ? 1 : 0, total: 1 }
    case 'exam': {
      const start = (state.planStart ?? Date.now()) + (dayNum - 1) * DAY
      const onDay = state.exams.filter((e) => e.at >= start && e.at < start + DAY)
      const n = dayNum === PLAN_DAYS ? onDay.filter((e) => e.passed).length : onDay.length
      return { done: Math.min(n, task.count), total: task.count }
    }
  }
}

export function dayProgress(d: PlanDay, state: State) {
  let done = 0
  let total = 0
  for (const t of d.tasks) {
    const p = taskProgress(t, state, d.day)
    done += p.done / p.total
    total += 1
  }
  return total ? done / total : 0
}
