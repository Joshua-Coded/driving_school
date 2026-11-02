import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { questions } from './data'

/**
 * Progress is kept on the device (localStorage). Each question sits in a
 * Leitner box 0–5: a correct answer moves it up, a wrong answer sends it back to 1.
 * Higher boxes come back for review less often.
 */
export interface QStat {
  box: number
  seen: number
  correct: number
  wrong: number
  last: number // epoch ms of last answer
  lastOk: boolean
}

export interface ExamRecord {
  at: number
  score: number
  total: number
  passed: boolean
  seconds: number
  wrongIds: number[]
}

export interface SimRecord {
  at: number
  correct: boolean
}

export interface Settings {
  examQuestions: number
  examMinutes: number
  passMark: number
  name: string
}

export interface State {
  stats: Record<number, QStat>
  exams: ExamRecord[]
  sims: Record<string, SimRecord>
  bookmarks: number[]
  studied: Record<number, 1>
  planStart: number | null
  activity: Record<string, number> // yyyy-mm-dd -> answers given that day
  settings: Settings
}

const KEY = 'driveready:v1'
export const DAY = 86_400_000
const INTERVAL_DAYS = [0, 0, 1, 2, 4, 7]

export const DEFAULT_SETTINGS: Settings = { examQuestions: 20, examMinutes: 20, passMark: 12, name: '' }

const empty = (): State => ({
  stats: {},
  exams: [],
  sims: {},
  bookmarks: [],
  studied: {},
  planStart: null,
  activity: {},
  settings: DEFAULT_SETTINGS,
})

function load(): State {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return empty()
    const s = JSON.parse(raw)
    return { ...empty(), ...s, settings: { ...DEFAULT_SETTINGS, ...s.settings } }
  } catch {
    return empty()
  }
}

export function dayKey(t = Date.now()) {
  const d = new Date(t)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function startOfDay(t = Date.now()) {
  const d = new Date(t)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

export function isDue(s: QStat | undefined, now = Date.now()) {
  if (!s || s.seen === 0 || s.box >= 5) return false
  return startOfDay(s.last) + INTERVAL_DAYS[s.box] * DAY <= now
}

export const isMastered = (s?: QStat) => !!s && s.box >= 3 && s.lastOk

interface Ctx {
  state: State
  answer: (id: number, ok: boolean) => void
  recordExam: (r: ExamRecord) => void
  recordSim: (id: string, correct: boolean) => void
  toggleBookmark: (id: number) => void
  markStudied: (id: number) => void
  startPlan: (at?: number) => void
  updateSettings: (s: Partial<Settings>) => void
  reset: () => void
}

const StoreCtx = createContext<Ctx | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>(load)

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state))
    } catch {
      /* storage full or blocked: progress just won't persist */
    }
  }, [state])

  const answer = useCallback((id: number, ok: boolean) => {
    setState((s) => {
      const prev = s.stats[id] ?? { box: 0, seen: 0, correct: 0, wrong: 0, last: 0, lastOk: false }
      const next: QStat = {
        box: ok ? Math.min(5, prev.box + 1) : 1,
        seen: prev.seen + 1,
        correct: prev.correct + (ok ? 1 : 0),
        wrong: prev.wrong + (ok ? 0 : 1),
        last: Date.now(),
        lastOk: ok,
      }
      const k = dayKey()
      return {
        ...s,
        stats: { ...s.stats, [id]: next },
        activity: { ...s.activity, [k]: (s.activity[k] ?? 0) + 1 },
        planStart: s.planStart ?? startOfDay(),
      }
    })
  }, [])

  const value = useMemo<Ctx>(
    () => ({
      state,
      answer,
      recordExam: (r) => setState((s) => ({ ...s, exams: [...s.exams, r] })),
      recordSim: (id, correct) =>
        setState((s) => ({
          ...s,
          sims: { ...s.sims, [id]: { at: Date.now(), correct: correct || !!s.sims[id]?.correct } },
        })),
      toggleBookmark: (id) =>
        setState((s) => ({
          ...s,
          bookmarks: s.bookmarks.includes(id) ? s.bookmarks.filter((b) => b !== id) : [...s.bookmarks, id],
        })),
      markStudied: (id) =>
        setState((s) => (s.studied[id] ? s : { ...s, studied: { ...s.studied, [id]: 1 }, planStart: s.planStart ?? startOfDay() })),
      startPlan: (at) => setState((s) => ({ ...s, planStart: startOfDay(at ?? Date.now()) })),
      updateSettings: (p) => setState((s) => ({ ...s, settings: { ...s.settings, ...p } })),
      reset: () => setState(empty()),
    }),
    [state, answer],
  )

  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>
}

export function useStore() {
  const c = useContext(StoreCtx)
  if (!c) throw new Error('useStore outside provider')
  return c
}

/** Headline numbers used across the app. */
export function summarize(state: State) {
  const total = questions.length
  let seen = 0
  let mastered = 0
  let due = 0
  let weak = 0
  for (const q of questions) {
    const s = state.stats[q.id]
    if (!s) continue
    seen++
    if (isMastered(s)) mastered++
    if (isDue(s)) due++
    if (!s.lastOk) weak++
  }
  const recent = state.exams.slice(-5)
  const examAvg = recent.length ? recent.reduce((a, e) => a + e.score / e.total, 0) / recent.length : 0
  const lastThree = state.exams.slice(-3)
  const streakPass = lastThree.length === 3 && lastThree.every((e) => e.passed)
  // Readiness: 60% knowledge coverage, 40% recent exam performance.
  const readiness = Math.round(100 * (0.6 * (mastered / total) + 0.4 * examAvg))
  return { total, seen, mastered, due, weak, examAvg, streakPass, readiness, examsTaken: state.exams.length }
}

export function studyStreak(activity: Record<string, number>) {
  let streak = 0
  let t = Date.now()
  if (!activity[dayKey(t)]) t -= DAY // today not started yet doesn't break the streak
  while (activity[dayKey(t)]) {
    streak++
    t -= DAY
  }
  return streak
}
