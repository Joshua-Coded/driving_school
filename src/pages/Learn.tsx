import { useMemo, useState, type CSSProperties } from 'react'
import { Icon, TopicIcon } from '../components/Icons'
import { PageHead } from '../components/Visuals'
import { Link } from 'react-router-dom'
import { LETTERS, mediaUrl, questions, TOPIC_META, topics } from '../lib/data'
import { isMastered, useStore } from '../lib/store'

export default function Learn() {
  const { state } = useStore()
  const [query, setQuery] = useState('')

  const results = useMemo(() => {
    const t = query.trim().toLowerCase()
    if (t.length < 2) return []
    return questions
      .filter((q) => q.q.toLowerCase().includes(t) || q.options.some((o) => o.text.toLowerCase().includes(t)) || String(q.id) === t)
      .slice(0, 30)
  }, [query])

  const disputed = questions.filter((q) => q.disputed).length

  return (
    <div className="page">
      <PageHead
        eyebrow="Learn"
        title="Master every topic"
        lede="Study first with the answers shown, then practise until each question is mastered (right 3 times in a row)."
      />

      <div className="search">
        <Icon.search />
        <input type="search" placeholder="Search all 403 questions, e.g. “roundabout” or “50 km/h”" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search questions" />
      </div>

      {query.trim().length >= 2 && (
        <section className="card stack">
          <h3>
            {results.length === 30 ? '30+' : results.length} result{results.length === 1 ? '' : 's'}
          </h3>
          {results.map((q) => (
            <Link key={q.id} to={`/study?ids=${q.id}`} className="task">
              <div className="grow">
                <div style={{ fontWeight: 600 }}>{q.q}</div>
                <div className="faint">
                  Answer {LETTERS[q.answer]}: {q.options[q.answer].image ? 'picture' : q.options[q.answer].text}
                </div>
              </div>
            </Link>
          ))}
          {results.length === 0 && <p className="muted">No question matches that search.</p>}
        </section>
      )}

      <div className="grid auto">
        {topics.map((t) => {
          const qs = questions.filter((q) => q.topic === t.id)
          const m = qs.filter((q) => isMastered(state.stats[q.id])).length
          const meta = TOPIC_META[t.id] ?? TOPIC_META.rules
          return (
            <div key={t.id} className="tile cover" style={{ '--c': meta?.color } as CSSProperties}>
              <Link to={`/study?topic=${t.id}`} className="cover-img">
                <img src={mediaUrl(meta.cover)} alt="" loading="lazy" />
                <span className="pill" style={{ background: meta.color, color: '#fff' }}>
                  <TopicIcon id={t.id} /> {qs.length} questions
                </span>
                {m === qs.length && (
                  <span className="pill ok right">
                    <Icon.check /> Mastered
                  </span>
                )}
              </Link>
              <div className="tile-body">
              <h3>{t.name}</h3>
              <p className="muted" style={{ fontSize: 14 }}>
                {meta?.blurb}
              </p>
              <div className="row" style={{ gap: 8 }}>
                <div className="bar ok grow">
                  <i style={{ width: `${(m / qs.length) * 100}%` }} />
                </div>
                <span className="faint">{Math.round((m / qs.length) * 100)}%</span>
              </div>
              <div className="row">
                <Link to={`/study?topic=${t.id}`} className="btn secondary sm grow">
                  Study
                </Link>
                <Link to={`/practice?topic=${t.id}`} className="btn sm grow" style={{ background: meta.color }}>
                  Practise
                </Link>
              </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="grid two">
        <Link to="/practice?set=bookmarks" className="action-tile">
          <span className="chip" style={{ '--c': '#e0a100' } as CSSProperties}>
            <Icon.star />
          </span>
          <div className="grow">
            <h3>Bookmarked ({state.bookmarks.length})</h3>
            <p className="muted" style={{ fontSize: 14 }}>Questions you starred to revisit.</p>
          </div>
        </Link>
        <Link to="/study?set=disputed" className="action-tile">
          <span className="chip" style={{ '--c': '#b25e00' } as CSSProperties}>
            <Icon.help />
          </span>
          <div className="grow">
            <h3>Answers to confirm ({disputed})</h3>
            <p className="muted" style={{ fontSize: 14 }}>The source document marks these differently across languages. Check them with your instructor.</p>
          </div>
        </Link>
      </div>
    </div>
  )
}
