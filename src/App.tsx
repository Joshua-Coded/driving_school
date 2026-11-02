import { useEffect } from 'react'
import { NavLink, Route, Routes, useLocation } from 'react-router-dom'
import { Icon } from './components/Icons'
import { Ring } from './components/Ring'
import { currentDay, PLAN_DAYS } from './lib/plan'
import { summarize, useStore } from './lib/store'
import Home from './pages/Home'
import PlanPage from './pages/Plan'
import Learn from './pages/Learn'
import Study from './pages/Study'
import Practice from './pages/Practice'
import Exam from './pages/Exam'
import Simulator from './pages/Simulator'
import SimPlayer from './pages/SimPlayer'
import ProgressPage from './pages/Progress'

const NAV = [
  { to: '/', label: 'Home', icon: Icon.home, end: true },
  { to: '/plan', label: '14-day plan', short: 'Plan', icon: Icon.plan },
  { to: '/learn', label: 'Learn', icon: Icon.learn },
  { to: '/exam', label: 'Mock exam', short: 'Exam', icon: Icon.exam },
  { to: '/sim', label: 'Driving scenarios', short: 'Drive', icon: Icon.drive },
  { to: '/progress', label: 'Progress', icon: Icon.progress, desktopOnly: true },
]

export default function App() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <img src="./icon.svg" alt="" />
          <div>
            DriveReady
            <small>Theory test in 14 days</small>
          </div>
        </div>
        {NAV.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end} className="nav-link">
            <n.icon />
            {n.label}
          </NavLink>
        ))}
        <SidebarCard />
      </aside>
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/plan" element={<PlanPage />} />
          <Route path="/learn" element={<Learn />} />
          <Route path="/study" element={<Study />} />
          <Route path="/practice" element={<Practice />} />
          <Route path="/exam" element={<Exam />} />
          <Route path="/sim" element={<Simulator />} />
          <Route path="/sim/:id" element={<SimPlayer />} />
          <Route path="/progress" element={<ProgressPage />} />
          <Route path="*" element={<Home />} />
        </Routes>
      </main>
      <nav className="bottom-nav" aria-label="Main">
        {NAV.filter((n) => !n.desktopOnly).map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end}>
            <n.icon />
            {n.short ?? n.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

function SidebarCard() {
  const { state } = useStore()
  const s = summarize(state)
  return (
    <NavLink to="/progress" className="sidebar-card row">
      <Ring value={s.readiness / 100} size={54} stroke={6} track="rgba(255,255,255,.12)">
        <span style={{ fontSize: 12, fontWeight: 800, color: '#fff' }}>{s.readiness}%</span>
      </Ring>
      <div>
        <b>Day {currentDay(state)}</b>
        of {PLAN_DAYS} · {s.mastered} mastered
      </div>
    </NavLink>
  )
}
