import type { CSSProperties } from 'react'
import { LETTERS, mediaUrl, TOPIC_META, topicColor, topicName, type Question } from '../lib/data'
import { useStore } from '../lib/store'
import { Icon } from './Icons'

/**
 * A question card with its options.
 * - picked: the option the learner chose (or null)
 * - reveal: show correct / wrong colouring and the explanation panel
 */
export function QuestionView({
  q,
  picked,
  reveal,
  onPick,
  index,
  total,
  hideTopic,
}: {
  q: Question
  picked: number | null
  reveal: boolean
  onPick?: (i: number) => void
  index?: number
  total?: number
  hideTopic?: boolean
}) {
  const { state, toggleBookmark } = useStore()
  const marked = state.bookmarks.includes(q.id)
  const pics = q.options.some((o) => o.image)
  const color = hideTopic ? '#2f6bff' : topicColor(q.topic)

  return (
    <div className="card q-card fade-in" key={q.id} style={{ '--c': color } as CSSProperties}>
      <div className="q-top" />
      <div className="q-inner stack lg">
        <div className="q-head">
          <div className="row wrap" style={{ gap: 8 }}>
            {index !== undefined && total !== undefined && (
              <span className="pill brand">
                Question {index + 1} / {total}
              </span>
            )}
            {!hideTopic && (
              <span className="pill" style={{ background: `color-mix(in srgb, ${color} 14%, var(--surface))`, color }}>
                {TOPIC_META[q.topic]?.icon} {topicName(q.topic)}
              </span>
            )}
          </div>
          <button
            className={`icon-btn ${marked ? 'on' : ''}`}
            onClick={() => toggleBookmark(q.id)}
            aria-label={marked ? 'Remove bookmark' : 'Bookmark this question'}
            title={marked ? 'Remove bookmark' : 'Bookmark'}
          >
            <Icon.star filled={marked} />
          </button>
        </div>

        <p className="q-text">{q.q}</p>

        {q.images.length > 0 && (
          <div className="q-images">
            {q.images.map((src) => (
              <img key={src} src={mediaUrl(src)} alt="Question illustration" loading="lazy" />
            ))}
          </div>
        )}

        <div className={`options ${pics ? 'pics' : ''}`} role="radiogroup">
          {q.options.map((o, i) => {
            let cls = 'opt'
            if (pics) cls += ' pic'
            let mark = null
            if (reveal) {
              if (i === q.answer) {
                cls += ' correct'
                mark = <Icon.check />
              } else if (i === picked) {
                cls += ' wrong'
                mark = <Icon.close />
              }
            } else if (i === picked) cls += ' picked'
            return (
              <button key={i} className={cls} disabled={reveal || !onPick} onClick={() => onPick?.(i)} role="radio" aria-checked={picked === i}>
                <span className="letter">{LETTERS[i]}</span>
                {o.image ? <img src={mediaUrl(o.image)} alt={`Option ${LETTERS[i]}`} /> : <span>{o.text}</span>}
                {mark && !pics && <span className="mark">{mark}</span>}
              </button>
            )
          })}
        </div>

        {reveal && <Explanation q={q} picked={picked} />}
        <span className="faint">Question #{q.id} from the official question bank</span>
      </div>
    </div>
  )
}

export function Explanation({ q, picked }: { q: Question; picked: number | null }) {
  const right = picked === q.answer
  const ans = q.options[q.answer]
  const graded = picked !== null && picked !== undefined
  return (
    <div className={`explain ${graded && !right ? 'bad' : ''}`}>
      <div className="stack">
        {graded && (
          <div className="verdict" style={{ color: right ? 'var(--ok)' : 'var(--bad)' }}>
            <span className="chip" style={{ '--c': right ? 'var(--ok)' : 'var(--bad)' } as CSSProperties}>
              {right ? <Icon.check /> : <Icon.close />}
            </span>
            {right ? 'Correct!' : 'Not quite'}
          </div>
        )}
        <p>
          <b>Answer {LETTERS[q.answer].toUpperCase()}:</b> {ans.image ? '(picture)' : ans.text}
        </p>
        {q.explanation && <p className="muted">{q.explanation}</p>}
        {q.note && (
          <p className="note">
            <b>Check with your instructor:</b> {q.note}
          </p>
        )}
      </div>
      {q.answerImage && <img src={mediaUrl(q.answerImage)} alt="Illustration of the correct answer" loading="lazy" />}
    </div>
  )
}
