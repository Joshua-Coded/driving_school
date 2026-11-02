// Verifies the scenario choreography: every "crash" choice really collides,
// every "nearMiss" choice gets close, and correct choices keep a safe gap.
import { compile, closestApproach } from '../src/sim/engine'
import { scenarios } from '../src/sim/scenarios'

let bad = 0
for (const sc of scenarios) {
  sc.choices.forEach((ch, i) => {
    const c = compile(sc, i)
    const best = closestApproach(c, sc.introDuration)
    const want = ch.crash ? 'crash' : ch.nearMiss ? 'near' : 'safe'
    const ok = want === 'crash' ? c.event?.kind === 'crash' : want === 'near' ? best.d > 0 && best.d < 22 : best.d >= 14
    if (!ok) bad++
    console.log(`${ok ? 'ok ' : 'BAD'} ${sc.id.padEnd(15)} #${i} ${want.padEnd(5)} gap=${best.d.toFixed(1).padStart(6)} vs ${best.other} t=${best.t.toFixed(2)} event=${c.event?.kind ?? '-'}`)
  })
  // intro must not already collide
  const intro = compile(sc, null)
  const ib = closestApproach(intro, 0)
  if (ib.d < 4) { bad++; console.log('BAD intro overlap', sc.id, ib) }
}
process.exit(bad ? 1 : 0)
