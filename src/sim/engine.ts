/**
 * Tiny top-down traffic scene engine.
 * World is 600×600 units, north is up, traffic drives on the RIGHT.
 *   Vertical road x 240–360: northbound lane x=330, southbound x=270.
 *   Horizontal road y 240–360: eastbound lane y=330, westbound y=270.
 * Every frame is a pure function of time, so scenes can be replayed or scrubbed.
 */
export type Pt = [number, number]

export type Seg =
  | { move: Pt[]; speed: number } // drive through points (start = current position)
  | { wait: number }
  | { set: Partial<ActorProps> }

export interface ActorProps {
  lights: 'off' | 'low' | 'high'
  indicator: 'none' | 'left' | 'right' | 'hazard'
  beacon: boolean // flashing emergency / school-bus lights
  brake: boolean
}

export type Kind = 'car' | 'truck' | 'bus' | 'schoolbus' | 'ambulance' | 'ped' | 'child' | 'moto'

export interface Actor {
  id: string
  kind: Kind
  color?: string
  player?: boolean
  start: Pt
  heading?: number // degrees, 0 = north, 90 = east
  props?: Partial<ActorProps>
  intro: Seg[]
  after?: Seg[] // default outcome when a choice doesn't override this actor
}

export type Light = { at: Pt; facing: 'n' | 's' | 'e' | 'w'; program: Array<[number, 'g' | 'a' | 'r']> } // program uses scene time
export type Sign = { at: Pt; type: 'stop' | 'giveway' | 'roundabout' | 'noovertake' | 'zebra' | 'children' | 'priority' }

export interface MapDef {
  kind: 'cross' | 'straight' | 'roundabout'
  center?: 'broken' | 'continuous'
  stopLines?: Array<'s' | 'n' | 'e' | 'w'>
  giveWayLines?: Array<'s' | 'n' | 'e' | 'w'>
  zebraY?: number
  night?: boolean
  rain?: boolean
  houses?: boolean
}

export interface Choice {
  label: string
  correct: boolean
  feedback: string
  outcome: Record<string, Seg[]>
  crash?: boolean
  nearMiss?: boolean
}

export interface Scenario {
  id: string
  title: string
  brief: string
  question: string
  rule: string
  map: MapDef
  actors: Actor[]
  lights?: Light[]
  signs?: Sign[]
  introDuration: number
  choices: Choice[]
  relatedTopic: string
}

/* ---------- geometry helpers used by scenario data ---------- */
export function arc(cx: number, cy: number, r: number, fromDeg: number, toDeg: number, steps = 16): Pt[] {
  const out: Pt[] = []
  for (let i = 1; i <= steps; i++) {
    const a = ((fromDeg + ((toDeg - fromDeg) * i) / steps) * Math.PI) / 180
    out.push([cx + r * Math.cos(a), cy + r * Math.sin(a)])
  }
  return out
}

/* ---------- timeline compilation ---------- */
interface CSeg {
  t0: number
  t1: number
  pts?: Pt[]
  cum?: number[]
  set?: Partial<ActorProps>
}

export interface Compiled {
  actors: Array<{ a: Actor; segs: CSeg[]; start: Pt; heading: number }>
  duration: number
  event: null | { kind: 'crash' | 'nearmiss'; t: number; at: Pt }
}

const SIZE: Record<Kind, [number, number]> = {
  car: [24, 44],
  truck: [28, 78],
  bus: [28, 84],
  schoolbus: [28, 80],
  ambulance: [26, 50],
  ped: [12, 12],
  child: [10, 10],
  moto: [12, 28],
}

function compileSegs(start: Pt, segs: Seg[], t0: number) {
  const out: CSeg[] = []
  let t = t0
  let pos = start
  for (const s of segs) {
    if ('wait' in s) {
      out.push({ t0: t, t1: t + s.wait })
      t += s.wait
    } else if ('set' in s) {
      out.push({ t0: t, t1: t, set: s.set })
    } else {
      const pts = [pos, ...s.move]
      const cum = [0]
      for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]))
      const dur = cum[cum.length - 1] / s.speed
      out.push({ t0: t, t1: t + dur, pts, cum })
      t += dur
      pos = pts[pts.length - 1]
    }
  }
  return { segs: out, end: t, pos }
}

export function compile(sc: Scenario, choice: number | null): Compiled {
  let duration = sc.introDuration
  const actors = sc.actors.map((a) => {
    const intro = compileSegs(a.start, a.intro, 0)
    const segs = [...intro.segs]
    if (choice !== null) {
      const ch = sc.choices[choice]
      const outSegs = ch.outcome[a.id] ?? a.after ?? []
      const start = Math.max(intro.end, sc.introDuration)
      const o = compileSegs(intro.pos, outSegs, start)
      segs.push(...o.segs)
      duration = Math.max(duration, o.end + 0.8)
    }
    return { a, segs, start: a.start, heading: a.heading ?? 0 }
  })
  const c: Compiled = { actors, duration, event: null }
  if (choice !== null) {
    const ch = sc.choices[choice]
    if (ch.crash || ch.nearMiss) c.event = findEvent(c, sc.introDuration, ch.crash ? 'crash' : 'nearmiss')
    if (c.event?.kind === 'crash') c.duration = c.event.t + 1.6
  }
  return c
}

/** Closest approach between the player and anyone else after the decision. */
export function closestApproach(c: Compiled, from: number) {
  const player = c.actors.find((x) => x.a.player)!
  let best = { d: Infinity, t: from, at: [0, 0] as Pt, other: '' }
  for (let t = from; t <= c.duration; t += 1 / 60) {
    const p = poseAt(player, t)
    for (const o of c.actors) {
      if (o === player) continue
      const q = poseAt(o, t)
      const d = gap(player.a.kind, p, o.a.kind, q)
      if (d < best.d) best = { d, t, at: [(p.x + q.x) / 2, (p.y + q.y) / 2], other: o.a.id }
    }
  }
  return best
}

function findEvent(c: Compiled, from: number, kind: 'crash' | 'nearmiss') {
  const player = c.actors.find((x) => x.a.player)!
  if (kind === 'crash') {
    for (let t = from; t <= c.duration; t += 1 / 60) {
      const p = poseAt(player, t)
      for (const o of c.actors) {
        if (o === player) continue
        const q = poseAt(o, t)
        if (gap(player.a.kind, p, o.a.kind, q) <= 0) return { kind, t, at: [(p.x + q.x) / 2, (p.y + q.y) / 2] as Pt }
      }
    }
  }
  const best = closestApproach(c, from)
  return { kind: 'nearmiss' as const, t: best.t, at: best.at }
}

/** Approximate clearance between two oriented boxes (negative = overlap). */
function gap(ka: Kind, a: Pose, kb: Kind, b: Pose) {
  const ra = SIZE[ka]
  const rb = SIZE[kb]
  // Sample along each body's long axis and use circle clearance.
  const samples = (k: Kind, p: Pose, r: [number, number]) => {
    const n = k === 'ped' || k === 'child' ? 1 : 3
    const out: Pt[] = []
    const h = (p.h * Math.PI) / 180
    for (let i = 0; i < n; i++) {
      const off = n === 1 ? 0 : (-0.5 + i / (n - 1)) * (r[1] - r[0])
      out.push([p.x + Math.sin(h) * off, p.y - Math.cos(h) * off])
    }
    return out
  }
  let best = Infinity
  for (const p of samples(ka, a, ra)) for (const q of samples(kb, b, rb)) best = Math.min(best, Math.hypot(p[0] - q[0], p[1] - q[1]) - ra[0] / 2 - rb[0] / 2)
  return best
}

export interface Pose {
  x: number
  y: number
  h: number
  moving: boolean
  props: ActorProps
}

export function poseAt(ca: Compiled['actors'][number], t: number): Pose {
  const props: ActorProps = { lights: 'off', indicator: 'none', beacon: false, brake: false, ...ca.a.props }
  let x = ca.start[0]
  let y = ca.start[1]
  let h = ca.heading
  let moving = false
  for (const s of ca.segs) {
    if (s.t0 > t) break
    if (s.set) {
      Object.assign(props, s.set)
      continue
    }
    if (!s.pts || !s.cum) continue
    if (t <= s.t0) break // not started yet: keep the previous heading
    const total = s.cum[s.cum.length - 1]
    const f = s.t1 === s.t0 ? 1 : Math.min(1, (t - s.t0) / (s.t1 - s.t0))
    const dist = f * total
    let i = 1
    while (i < s.cum.length - 1 && s.cum[i] < dist) i++
    const [ax, ay] = s.pts[i - 1]
    const [bx, by] = s.pts[i]
    const seg = s.cum[i] - s.cum[i - 1] || 1
    const k = (dist - s.cum[i - 1]) / seg
    x = ax + (bx - ax) * k
    y = ay + (by - ay) * k
    if (bx !== ax || by !== ay) h = (Math.atan2(bx - ax, -(by - ay)) * 180) / Math.PI
    moving = f < 1
  }
  return { x, y, h, moving, props }
}

/* ---------- rendering ---------- */
const C = {
  grass: '#5d8f4e',
  grassDark: '#4f7e42',
  road: '#3b4049',
  edge: '#2c3036',
  mark: '#f2f2ee',
  yellow: '#ffc53d',
}

export function draw(ctx: CanvasRenderingContext2D, sc: Scenario, comp: Compiled, T: number, W: number, clock = T) {
  const s = W / 600
  ctx.save()
  ctx.scale(s, s)
  const frozen = comp.event?.kind === 'crash' && T > comp.event.t ? comp.event.t : T
  drawMap(ctx, sc.map, T)
  for (const sg of sc.signs ?? []) drawSign(ctx, sg)
  for (const l of sc.lights ?? []) drawLight(ctx, l, T)
  const poses = comp.actors.map((ca) => ({ ca, p: poseAt(ca, frozen) }))
  // pedestrians under vehicles
  poses.sort((a, b) => Number(!isPed(a.ca.a.kind)) - Number(!isPed(b.ca.a.kind)))
  if (sc.map.night) drawNight(ctx, poses.map((x) => ({ kind: x.ca.a.kind, p: x.p })))
  for (const { ca, p } of poses) drawActor(ctx, ca.a, p, clock)
  if (sc.map.rain) drawRain(ctx, clock)
  if (comp.event && T >= comp.event.t) drawEvent(ctx, comp.event, T - comp.event.t)
  ctx.restore()
}

const isPed = (k: Kind) => k === 'ped' || k === 'child'

function drawMap(ctx: CanvasRenderingContext2D, m: MapDef, T: number) {
  ctx.fillStyle = C.grass
  ctx.fillRect(0, 0, 600, 600)
  // texture
  ctx.fillStyle = C.grassDark
  for (let i = 0; i < 70; i++) {
    const x = (i * 137) % 600
    const y = (i * 251) % 600
    ctx.fillRect(x, y, 3, 3)
  }
  if (m.houses) drawHouses(ctx)
  ctx.fillStyle = C.road
  if (m.kind === 'cross') {
    ctx.fillRect(240, 0, 120, 600)
    ctx.fillRect(0, 240, 600, 120)
    // kerbs
    ctx.strokeStyle = C.edge
    ctx.lineWidth = 3
    for (const [x0, y0, x1, y1] of [
      [240, 0, 240, 240], [360, 0, 360, 240], [240, 360, 240, 600], [360, 360, 360, 600],
      [0, 240, 240, 240], [0, 360, 240, 360], [360, 240, 600, 240], [360, 360, 600, 360],
    ]) line(ctx, x0, y0, x1, y1)
    dashed(ctx, 300, 0, 300, 225, m.center === 'continuous')
    dashed(ctx, 300, 375, 300, 600, m.center === 'continuous')
    dashed(ctx, 0, 300, 225, 300, false)
    dashed(ctx, 375, 300, 600, 300, false)
    ctx.fillStyle = C.mark
    for (const d of m.stopLines ?? []) stopLine(ctx, d, false)
    for (const d of m.giveWayLines ?? []) stopLine(ctx, d, true)
  } else if (m.kind === 'straight') {
    ctx.fillRect(240, 0, 120, 600)
    ctx.fillStyle = '#7a6f5a'
    ctx.fillRect(225, 0, 15, 600)
    ctx.fillRect(360, 0, 15, 600)
    ctx.strokeStyle = C.mark
    ctx.lineWidth = 2
    line(ctx, 244, 0, 244, 600)
    line(ctx, 356, 0, 356, 600)
    dashed(ctx, 300, -20, 300, 620, m.center === 'continuous')
  } else {
    ctx.fillRect(240, 0, 120, 600)
    ctx.fillRect(0, 240, 600, 120)
    ctx.beginPath()
    ctx.arc(300, 300, 150, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#6aa65a'
    ctx.beginPath()
    ctx.arc(300, 300, 62, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = C.mark
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.arc(300, 300, 66, 0, Math.PI * 2)
    ctx.stroke()
    ctx.fillStyle = '#e8a33a'
    ctx.beginPath()
    ctx.arc(300, 300, 18, 0, Math.PI * 2)
    ctx.fill()
    dashed(ctx, 300, 0, 300, 160, true)
    dashed(ctx, 300, 440, 300, 600, true)
    dashed(ctx, 0, 300, 160, 300, true)
    dashed(ctx, 440, 300, 600, 300, true)
    ctx.fillStyle = C.mark
    for (const d of m.giveWayLines ?? []) stopLine(ctx, d, true, 152)
  }
  if (m.zebraY !== undefined) {
    ctx.fillStyle = C.mark
    for (let x = 246; x < 356; x += 16) ctx.fillRect(x, m.zebraY - 18, 9, 36)
  }
  void T
}

function drawHouses(ctx: CanvasRenderingContext2D) {
  const roofs = ['#b5523b', '#8c6d4f', '#c97a40', '#7c8a99']
  const spots: Pt[] = [[60, 60], [150, 110], [450, 70], [520, 160], [70, 470], [150, 530], [460, 460], [530, 540], [60, 180], [520, 420]]
  spots.forEach(([x, y], i) => {
    ctx.fillStyle = 'rgba(0,0,0,.18)'
    ctx.fillRect(x - 26, y - 18, 56, 42)
    ctx.fillStyle = roofs[i % roofs.length]
    ctx.fillRect(x - 30, y - 22, 56, 42)
    ctx.strokeStyle = 'rgba(0,0,0,.25)'
    ctx.lineWidth = 2
    line(ctx, x - 30, y - 1, x + 26, y - 1)
  })
}

function line(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number) {
  ctx.beginPath()
  ctx.moveTo(x0, y0)
  ctx.lineTo(x1, y1)
  ctx.stroke()
}

function dashed(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, solid: boolean) {
  ctx.save()
  ctx.strokeStyle = C.mark
  ctx.lineWidth = solid ? 4 : 3
  if (!solid) ctx.setLineDash([22, 18])
  line(ctx, x0, y0, x1, y1)
  ctx.restore()
}

function stopLine(ctx: CanvasRenderingContext2D, d: 's' | 'n' | 'e' | 'w', giveWay: boolean, off = 240) {
  // d = approach the line is for (s = traffic coming from the south, i.e. northbound)
  const draw = (x: number, y: number, w: number, h: number) => {
    if (!giveWay) return ctx.fillRect(x, y, w, h)
    const n = 6
    const horiz = w > h
    for (let i = 0; i < n; i++) {
      if (horiz) ctx.fillRect(x + (i * w) / n, y, w / n - 4, h)
      else ctx.fillRect(x, y + (i * h) / n, w, h / n - 4)
    }
  }
  const far = 600 - off
  if (d === 's') draw(302, far, 56, 6)
  if (d === 'n') draw(242, off - 6, 56, 6)
  if (d === 'e') draw(far, 242, 6, 56)
  if (d === 'w') draw(off - 6, 302, 6, 56)
}

function drawSign(ctx: CanvasRenderingContext2D, sg: Sign) {
  const [x, y] = sg.at
  ctx.save()
  ctx.translate(x, y)
  ctx.fillStyle = '#555'
  ctx.fillRect(-1.5, 0, 3, 18)
  ctx.lineWidth = 2.5
  switch (sg.type) {
    case 'stop': {
      ctx.fillStyle = '#d62828'
      ctx.beginPath()
      for (let i = 0; i < 8; i++) {
        const a = ((i * 45 + 22.5) * Math.PI) / 180
        ctx.lineTo(Math.cos(a) * 15, Math.sin(a) * 15)
      }
      ctx.closePath()
      ctx.fill()
      ctx.strokeStyle = '#fff'
      ctx.stroke()
      ctx.fillStyle = '#fff'
      ctx.font = 'bold 8px Inter, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('STOP', 0, 3)
      break
    }
    case 'giveway':
      tri(ctx, 15, true, '#d62828', '#fff')
      break
    case 'children':
      tri(ctx, 15, false, '#d62828', '#fff')
      ctx.fillStyle = '#111'
      ctx.beginPath()
      ctx.arc(-3, -1, 2.4, 0, 7)
      ctx.arc(4, 1, 2, 0, 7)
      ctx.fill()
      break
    case 'roundabout':
      circle(ctx, 14, '#1d5fbf')
      ctx.strokeStyle = '#fff'
      ctx.beginPath()
      ctx.arc(0, 0, 7, 0.3, Math.PI * 1.8)
      ctx.stroke()
      break
    case 'noovertake':
      circle(ctx, 14, '#fff')
      ctx.strokeStyle = '#d62828'
      ctx.lineWidth = 3.5
      ctx.beginPath()
      ctx.arc(0, 0, 13, 0, 7)
      ctx.stroke()
      ctx.fillStyle = '#d62828'
      ctx.fillRect(-7, -4, 5, 8)
      ctx.fillStyle = '#111'
      ctx.fillRect(2, -4, 5, 8)
      break
    case 'zebra':
      ctx.fillStyle = '#1d5fbf'
      ctx.fillRect(-13, -13, 26, 26)
      tri(ctx, 10, false, '#fff', '#fff')
      ctx.fillStyle = '#111'
      ctx.fillRect(-1.5, -4, 3, 7)
      break
    case 'priority':
      ctx.rotate(Math.PI / 4)
      ctx.fillStyle = '#fff'
      ctx.fillRect(-11, -11, 22, 22)
      ctx.fillStyle = '#f4b400'
      ctx.fillRect(-7, -7, 14, 14)
      break
  }
  ctx.restore()
}

function tri(ctx: CanvasRenderingContext2D, r: number, down: boolean, stroke: string, fill: string) {
  const k = down ? -1 : 1
  ctx.beginPath()
  ctx.moveTo(0, -r * k)
  ctx.lineTo(r * 0.95, r * 0.7 * k)
  ctx.lineTo(-r * 0.95, r * 0.7 * k)
  ctx.closePath()
  ctx.fillStyle = fill
  ctx.fill()
  ctx.strokeStyle = stroke
  ctx.lineWidth = 3.5
  ctx.stroke()
}

function circle(ctx: CanvasRenderingContext2D, r: number, fill: string) {
  ctx.fillStyle = fill
  ctx.beginPath()
  ctx.arc(0, 0, r, 0, 7)
  ctx.fill()
}

export function lightColor(l: Light, T: number) {
  let c: 'g' | 'a' | 'r' = l.program[0][1]
  for (const [t, col] of l.program) if (T >= t) c = col
  return c
}

function drawLight(ctx: CanvasRenderingContext2D, l: Light, T: number) {
  const c = lightColor(l, T)
  ctx.save()
  ctx.translate(l.at[0], l.at[1])
  ctx.rotate({ n: 0, e: Math.PI / 2, s: Math.PI, w: -Math.PI / 2 }[l.facing])
  ctx.fillStyle = '#15171b'
  ctx.beginPath()
  ctx.roundRect(-8, -24, 16, 46, 4)
  ctx.fill()
  const cols: Array<['r' | 'a' | 'g', string]> = [['r', '#ff3b30'], ['a', '#ffb000'], ['g', '#2ee06a']]
  cols.forEach(([k, col], i) => {
    ctx.fillStyle = c === k ? col : '#33363c'
    if (c === k) {
      ctx.shadowColor = col
      ctx.shadowBlur = 14
    }
    ctx.beginPath()
    ctx.arc(0, -14 + i * 14, 5, 0, 7)
    ctx.fill()
    ctx.shadowBlur = 0
  })
  ctx.restore()
}

function drawNight(ctx: CanvasRenderingContext2D, items: Array<{ kind: Kind; p: Pose }>) {
  ctx.fillStyle = 'rgba(8,14,32,.72)'
  ctx.fillRect(0, 0, 600, 600)
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  for (const { kind, p } of items) {
    if (isPed(kind) || p.props.lights === 'off') continue
    const len = p.props.lights === 'high' ? 330 : 150
    const spread = p.props.lights === 'high' ? 0.38 : 0.5
    ctx.save()
    ctx.translate(p.x, p.y)
    ctx.rotate((p.h * Math.PI) / 180)
    const g = ctx.createRadialGradient(0, -20, 4, 0, -20, len)
    g.addColorStop(0, 'rgba(255,240,190,.55)')
    g.addColorStop(1, 'rgba(255,240,190,0)')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.moveTo(-10, -20)
    ctx.lineTo(-len * spread, -20 - len)
    ctx.lineTo(len * spread, -20 - len)
    ctx.lineTo(10, -20)
    ctx.closePath()
    ctx.fill()
    ctx.restore()
  }
  ctx.restore()
}

function drawRain(ctx: CanvasRenderingContext2D, T: number) {
  ctx.strokeStyle = 'rgba(200,220,255,.35)'
  ctx.lineWidth = 1.2
  for (let i = 0; i < 120; i++) {
    const x = (i * 97 + T * 80) % 620
    const y = (i * 53 + T * 700) % 620
    line(ctx, x, y, x - 4, y + 12)
  }
}

function drawActor(ctx: CanvasRenderingContext2D, a: Actor, p: Pose, T: number) {
  const [w, h] = SIZE[a.kind]
  const blink = Math.floor(T * 3) % 2 === 0
  ctx.save()
  ctx.translate(p.x, p.y)
  if (a.player) {
    ctx.save()
    ctx.strokeStyle = 'rgba(255,197,61,.9)'
    ctx.lineWidth = 3
    ctx.setLineDash([6, 5])
    ctx.beginPath()
    ctx.arc(0, 0, h / 2 + 10, 0, 7)
    ctx.stroke()
    ctx.restore()
  }
  ctx.rotate((p.h * Math.PI) / 180)
  if (isPed(a.kind)) {
    ctx.fillStyle = a.color ?? '#f5d0a9'
    ctx.beginPath()
    ctx.arc(0, 0, w / 2 + 1, 0, 7)
    ctx.fill()
    ctx.fillStyle = a.kind === 'child' ? '#ffcc00' : '#2b59c3'
    ctx.beginPath()
    ctx.ellipse(0, 1, w / 2 + 3, w / 2 - 1, 0, 0, 7)
    ctx.fill()
    ctx.fillStyle = '#3a2a1a'
    ctx.beginPath()
    ctx.arc(0, 0, w / 2 - 2, 0, 7)
    ctx.fill()
    ctx.restore()
    return
  }
  const body: Record<string, string> = {
    car: a.color ?? '#3b82f6',
    truck: a.color ?? '#9ca3af',
    bus: a.color ?? '#16a34a',
    schoolbus: '#f5b400',
    ambulance: '#f8fafc',
    moto: a.color ?? '#ef4444',
  }
  // shadow
  ctx.fillStyle = 'rgba(0,0,0,.28)'
  ctx.beginPath()
  ctx.roundRect(-w / 2 + 3, -h / 2 + 4, w, h, 6)
  ctx.fill()
  ctx.fillStyle = body[a.kind]
  ctx.beginPath()
  ctx.roundRect(-w / 2, -h / 2, w, h, a.kind === 'moto' ? 6 : 7)
  ctx.fill()
  ctx.strokeStyle = 'rgba(0,0,0,.35)'
  ctx.lineWidth = 1.2
  ctx.stroke()
  // windows
  ctx.fillStyle = 'rgba(20,30,45,.85)'
  if (a.kind === 'car' || a.kind === 'ambulance') {
    ctx.beginPath()
    ctx.roundRect(-w / 2 + 3, -h / 2 + 9, w - 6, 9, 3)
    ctx.fill()
    ctx.beginPath()
    ctx.roundRect(-w / 2 + 3, h / 2 - 12, w - 6, 6, 2)
    ctx.fill()
  } else if (a.kind === 'truck') {
    ctx.fillStyle = '#e5e7eb'
    ctx.fillRect(-w / 2, -h / 2 + 18, w, h - 18)
    ctx.fillStyle = 'rgba(20,30,45,.85)'
    ctx.fillRect(-w / 2 + 3, -h / 2 + 3, w - 6, 7)
  } else if (a.kind === 'bus' || a.kind === 'schoolbus') {
    ctx.fillRect(-w / 2 + 3, -h / 2 + 3, w - 6, 7)
    for (let i = 0; i < 5; i++) ctx.fillRect(-w / 2 + 2, -h / 2 + 16 + i * 12, 3, 8)
    for (let i = 0; i < 5; i++) ctx.fillRect(w / 2 - 5, -h / 2 + 16 + i * 12, 3, 8)
  } else if (a.kind === 'moto') {
    ctx.fillStyle = '#111'
    ctx.beginPath()
    ctx.arc(0, 2, 5, 0, 7)
    ctx.fill()
  }
  if (a.kind === 'ambulance') {
    ctx.fillStyle = '#e11d48'
    ctx.fillRect(-2, 0, 4, 14)
    ctx.fillRect(-7, 5, 14, 4)
  }
  // head & tail lights
  ctx.fillStyle = p.props.lights !== 'off' ? '#fff7cc' : '#e5e7eb'
  ctx.fillRect(-w / 2 + 2, -h / 2, 5, 3)
  ctx.fillRect(w / 2 - 7, -h / 2, 5, 3)
  ctx.fillStyle = p.props.brake ? '#ff2d2d' : '#9f1d1d'
  if (p.props.brake) {
    ctx.shadowColor = '#ff2d2d'
    ctx.shadowBlur = 10
  }
  ctx.fillRect(-w / 2 + 2, h / 2 - 3, 5, 3)
  ctx.fillRect(w / 2 - 7, h / 2 - 3, 5, 3)
  ctx.shadowBlur = 0
  // indicators
  const ind = p.props.indicator
  if (ind !== 'none' && blink) {
    ctx.fillStyle = '#ffb000'
    ctx.shadowColor = '#ffb000'
    ctx.shadowBlur = 10
    if (ind === 'left' || ind === 'hazard') {
      ctx.fillRect(-w / 2 - 2, -h / 2 - 1, 5, 5)
      ctx.fillRect(-w / 2 - 2, h / 2 - 4, 5, 5)
    }
    if (ind === 'right' || ind === 'hazard') {
      ctx.fillRect(w / 2 - 3, -h / 2 - 1, 5, 5)
      ctx.fillRect(w / 2 - 3, h / 2 - 4, 5, 5)
    }
    ctx.shadowBlur = 0
  }
  if (p.props.beacon) {
    const on = Math.floor(T * 6) % 2 === 0
    const col = a.kind === 'schoolbus' ? '#ff8c00' : on ? '#3b82f6' : '#ef4444'
    ctx.fillStyle = col
    ctx.shadowColor = col
    ctx.shadowBlur = on ? 22 : 8
    if (a.kind === 'schoolbus') {
      if (on) {
        ctx.fillRect(-w / 2 + 2, -h / 2 - 2, 6, 4)
        ctx.fillRect(w / 2 - 8, h / 2 - 2, 6, 4)
      }
    } else {
      ctx.fillRect(-8, -h / 2 + 20, 16, 5)
    }
    ctx.shadowBlur = 0
  }
  ctx.restore()
  if (a.player) {
    ctx.save()
    ctx.font = '700 12px Inter, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillStyle = '#0f1b2d'
    const lx = p.x
    const ly = p.y + h / 2 + 26
    ctx.beginPath()
    ctx.roundRect(lx - 18, ly - 11, 36, 16, 8)
    ctx.fillStyle = '#ffc53d'
    ctx.fill()
    ctx.fillStyle = '#0f1b2d'
    ctx.fillText('YOU', lx, ly + 1)
    ctx.restore()
  }
}

function drawEvent(ctx: CanvasRenderingContext2D, e: NonNullable<Compiled['event']>, dt: number) {
  const [x, y] = e.at
  if (e.kind === 'crash') {
    const r = 20 + Math.min(1, dt * 3) * 40
    ctx.save()
    ctx.fillStyle = `rgba(255,${120 - Math.min(80, dt * 60)},40,${Math.max(0.25, 0.85 - dt * 0.4)})`
    ctx.beginPath()
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2
      const rr = i % 2 ? r : r * 0.55
      ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr)
    }
    ctx.closePath()
    ctx.fill()
    ctx.restore()
    label(ctx, 'CRASH', x, y - r - 8, '#e11d48')
  } else if (dt < 2.2) {
    ctx.save()
    ctx.strokeStyle = `rgba(255,176,0,${1 - dt / 2.2})`
    ctx.lineWidth = 4
    ctx.beginPath()
    ctx.arc(x, y, 30 + dt * 30, 0, 7)
    ctx.stroke()
    ctx.restore()
    label(ctx, 'NEAR MISS', x, y - 50, '#d97706')
  }
}

function label(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, bg: string) {
  ctx.save()
  ctx.font = '800 15px Inter, sans-serif'
  const w = ctx.measureText(text).width + 18
  const cx = Math.max(w / 2 + 6, Math.min(600 - w / 2 - 6, x))
  const cy = Math.max(20, y)
  ctx.fillStyle = bg
  ctx.beginPath()
  ctx.roundRect(cx - w / 2, cy - 14, w, 24, 6)
  ctx.fill()
  ctx.fillStyle = '#fff'
  ctx.textAlign = 'center'
  ctx.fillText(text, cx, cy + 3)
  ctx.restore()
}
