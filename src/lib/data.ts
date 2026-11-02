import raw from '../data/questions.json'

export interface Option {
  text: string
  image?: string
}

export interface Question {
  id: number
  q: string
  options: Option[]
  answer: number
  topic: string
  images: string[]
  answerImage: string | null
  explanation?: string
  disputed?: boolean
  note?: string
}

export interface Topic {
  id: string
  name: string
}

export const TOPIC_META: Record<string, { blurb: string; color: string; cover: string }> = {
  signs: { color: '#e5383b', cover: 'media/image25.png', blurb: 'Danger, prohibition, obligation and information signs' },
  markings: { color: '#7c5cff', cover: 'media/image520.png', blurb: 'Lines, arrows, lanes and crossings painted on the road' },
  priority: { color: '#ff8a00', cover: 'media/image31.png', blurb: 'Who goes first at junctions, roundabouts and lights' },
  overtaking: { color: '#0ea5e9', cover: 'media/image542.png', blurb: 'When, where and how you may overtake' },
  speed: { color: '#d61f69', cover: 'media/image30.png', blurb: 'Speed limits inside and outside built-up areas' },
  lights: { color: '#e0a100', cover: 'media/image39.png', blurb: 'Headlights, indicators, reflectors and visibility' },
  parking: { color: '#2f6bff', cover: 'media/image535.png', blurb: 'Where you may and may not stop or park' },
  vehicle: { color: '#5b6b8c', cover: 'media/image533.png', blurb: 'Dimensions, loads, brakes, equipment and documents' },
  safety: { color: '#12a560', cover: 'media/image153.png', blurb: 'Collisions, breakdowns, alcohol, phones and first aid' },
  rules: { color: '#0f766e', cover: 'media/image519.png', blurb: 'General duties of drivers and road users' },
}

export const topics: Topic[] = [...raw.topics].sort(
  (a, b) => Object.keys(TOPIC_META).indexOf(a.id) - Object.keys(TOPIC_META).indexOf(b.id),
)
export const questions: Question[] = raw.questions as Question[]
export const byId = new Map(questions.map((q) => [q.id, q]))

export function topicColor(id: string) {
  return TOPIC_META[id]?.color ?? '#2f6bff'
}

export function topicName(id: string) {
  return topics.find((t) => t.id === id)?.name ?? id
}

export function questionsForTopic(id: string) {
  return questions.filter((q) => q.topic === id)
}

export function mediaUrl(path: string) {
  return `./${path}`
}

/** Deterministic shuffle so a session keeps its order across re-renders. */
export function shuffle<T>(arr: T[], seed = Math.random() * 1e9): T[] {
  const a = arr.slice()
  let s = Math.floor(seed) || 1
  const rand = () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296
  }
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export const LETTERS = ['a', 'b', 'c', 'd', 'e', 'f']
