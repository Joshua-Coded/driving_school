import { questions, topicName } from './data'
import { plan } from './plan'
import { isDue, type State } from './store'

/** Turn URL params (?day=3, ?topic=signs, ?set=weak …) into a list of question ids. */
export function resolveSet(params: URLSearchParams, state: State): { title: string; ids: number[] } {
  const day = params.get('day')
  if (day) {
    const d = plan[Number(day) - 1]
    if (d && d.ids.length) return { title: `Day ${d.day} questions`, ids: d.ids }
  }
  const topic = params.get('topic')
  if (topic) return { title: topicName(topic), ids: questions.filter((q) => q.topic === topic).map((q) => q.id) }
  const ids = params.get('ids')
  if (ids) return { title: 'Review', ids: ids.split(',').map(Number).filter(Boolean) }

  const st = state.stats
  switch (params.get('set')) {
    case 'weak':
      return { title: 'Weak questions', ids: questions.filter((q) => st[q.id] && !st[q.id].lastOk).map((q) => q.id) }
    case 'due':
      return { title: 'Due for review', ids: questions.filter((q) => isDue(st[q.id])).map((q) => q.id) }
    case 'bookmarks':
      return { title: 'Bookmarked', ids: state.bookmarks.slice() }
    case 'new':
      return { title: 'New questions', ids: questions.filter((q) => !st[q.id]).map((q) => q.id) }
    case 'signs':
      return { title: 'Road-sign drill', ids: questions.filter((q) => q.images.length > 0 || q.options.some((o) => o.image)).map((q) => q.id) }
    case 'disputed':
      return { title: 'Answers to confirm', ids: questions.filter((q) => q.disputed).map((q) => q.id) }
    default:
      return { title: 'All questions', ids: questions.map((q) => q.id) }
  }
}

export function setLink(kind: 'study' | 'practice', query: string) {
  return `/${kind}?${query}`
}
