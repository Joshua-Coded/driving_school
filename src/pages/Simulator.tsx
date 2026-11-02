import { Link } from 'react-router-dom'
import { Icon } from '../components/Icons'
import { Ring } from '../components/Ring'
import { PageHead, SceneThumb } from '../components/Visuals'
import { TOPIC_META, topicName } from '../lib/data'
import { useStore } from '../lib/store'
import { scenarios } from '../sim/scenarios'

export default function Simulator() {
  const { state } = useStore()
  const done = scenarios.filter((s) => state.sims[s.id]?.correct).length
  return (
    <div className="page">
      <PageHead
        eyebrow="Simulations"
        title="Real traffic, your decision"
        lede="Watch the scene from above, decide before the timer runs out, then see what your choice leads to. You are the blue car, and traffic drives on the right."
        right={
          <div className="hide-sm">
            <Ring value={done / scenarios.length} size={86} stroke={8} color="var(--ok)" track="var(--surface-2)">
              <div style={{ fontFamily: 'var(--display)', fontWeight: 800, fontSize: 18 }}>
                {done}/{scenarios.length}
              </div>
            </Ring>
          </div>
        }
      />
      <div className="grid auto">
        {scenarios.map((s, i) => {
          const r = state.sims[s.id]
          return (
            <Link key={s.id} to={`/sim/${s.id}`} className="tile cover">
              <div className="cover-img" style={{ aspectRatio: '16 / 10' }}>
                <SceneThumb sc={s} />
                <span className="pill" style={{ background: 'var(--navy)', color: '#fff' }}>
                  #{i + 1}
                </span>
                {r?.correct ? <span className="pill ok right">✓ Passed</span> : r ? <span className="pill bad right">Try again</span> : <span className="pill yellow right">New</span>}
              </div>
              <div className="tile-body">
                <h3>{s.title}</h3>
                <p className="muted" style={{ fontSize: 14 }}>
                  {s.brief}
                </p>
                <div className="row between faint" style={{ marginTop: 'auto' }}>
                  <span>
                    {TOPIC_META[s.relatedTopic]?.icon} {topicName(s.relatedTopic)}
                  </span>
                  <span className="row" style={{ gap: 4, color: 'var(--brand)', fontWeight: 700 }}>
                    Play <Icon.play />
                  </span>
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
