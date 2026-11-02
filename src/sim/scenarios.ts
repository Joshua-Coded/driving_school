import { arc, type Scenario, type Seg } from './engine'

/** Drive a straight line while toggling headlights, so movement doesn't pause. */
function flashing(fromY: number, toY: number, x: number, speed: number, flashes: number): Seg[] {
  const out: Seg[] = []
  const step = (toY - fromY) / (flashes * 2)
  for (let i = 1; i <= flashes * 2; i++) {
    out.push({ set: { lights: i % 2 ? 'low' : 'high' } })
    out.push({ move: [[x, fromY + step * i]], speed })
  }
  return out
}

const R = 105 // roundabout circulating radius

export const scenarios: Scenario[] = [
  {
    id: 'priority-right',
    title: 'Unmarked crossroads',
    relatedTopic: 'priority',
    brief: 'You drive north into a crossroads with no signs, no lights and no markings. A car is coming from the street on your right.',
    question: 'What do you do?',
    rule: 'At a junction without signs or traffic lights, you must give way to traffic coming from your RIGHT.',
    map: { kind: 'cross', houses: true },
    introDuration: 2.6,
    actors: [
      { id: 'you', kind: 'car', player: true, color: '#2563eb', start: [330, 640], intro: [{ move: [[330, 420]], speed: 150 }] },
      { id: 'red', kind: 'car', color: '#dc2626', start: [700, 270], heading: 270, intro: [{ move: [[440, 270]], speed: 100 }], after: [{ move: [[-80, 270]], speed: 130 }] },
    ],
    choices: [
      {
        label: 'Keep going, I am driving straight on',
        correct: false,
        crash: true,
        feedback: 'Going straight does not give you priority. The car from your right had priority and you hit it side-on.',
        outcome: { you: [{ move: [[330, -80]], speed: 160 }] },
      },
      {
        label: 'Slow down and give way to the car on my right',
        correct: true,
        feedback: 'Correct. With no signs or lights, priority goes to the right. Let it cross, then continue.',
        outcome: { you: [{ set: { brake: true } }, { wait: 1.6 }, { set: { brake: false } }, { move: [[330, -80]], speed: 150 }] },
      },
      {
        label: 'Flash my lights and speed up to go first',
        correct: false,
        crash: true,
        feedback: 'Flashing your lights gives you no priority. Speeding up only made the collision worse.',
        outcome: { you: [{ set: { lights: 'high' } }, { move: [[330, -80]], speed: 220 }] },
      },
    ],
  },
  {
    id: 'amber-light',
    title: 'Light turns amber',
    relatedTopic: 'priority',
    brief: 'You are approaching traffic lights at normal speed. The light turns amber while you are still well before the stop line.',
    question: 'What is the right reaction?',
    rule: 'Amber means STOP at the line, unless you are so close that stopping would be dangerous. Never enter a junction you cannot clear.',
    map: { kind: 'cross', stopLines: ['s', 'w'], houses: true },
    introDuration: 1.3,
    lights: [
      { at: [378, 392], facing: 'n', program: [[0, 'g'], [1.0, 'a'], [2.4, 'r']] },
      { at: [214, 380], facing: 'n', program: [[0, 'r'], [2.6, 'g']] },
    ],
    actors: [
      { id: 'you', kind: 'car', player: true, color: '#2563eb', start: [330, 640], intro: [{ move: [[330, 470]], speed: 140 }] },
      { id: 'cross', kind: 'car', color: '#059669', start: [204, 330], heading: 90, intro: [], after: [{ wait: 1.3 }, { move: [[700, 330]], speed: 140 }] },
    ],
    choices: [
      {
        label: 'Brake smoothly and stop at the line',
        correct: true,
        feedback: 'Correct. You had plenty of room to stop. The cross traffic got its green and passed safely.',
        outcome: { you: [{ set: { brake: true } }, { move: [[330, 390]], speed: 60 }] },
      },
      {
        label: 'Keep going at the same speed',
        correct: false,
        nearMiss: true,
        feedback: 'You were still inside the junction when the light turned red, and the cross traffic was already moving on its green.',
        outcome: {
          you: [{ move: [[330, -80]], speed: 70 }],
          cross: [{ wait: 1.3 }, { move: [[280, 330]], speed: 110 }, { set: { brake: true } }, { wait: 1.6 }, { set: { brake: false } }, { move: [[700, 330]], speed: 120 }],
        },
      },
      {
        label: 'Carry on, then stop once I am in the junction',
        correct: false,
        nearMiss: true,
        feedback: 'Never stop inside a junction. You blocked the cross traffic, which had a green light.',
        outcome: {
          you: [{ move: [[330, 322]], speed: 100 }, { set: { brake: true } }],
          cross: [{ wait: 1.3 }, { move: [[280, 330]], speed: 110 }, { set: { brake: true } }],
        },
      },
    ],
  },
  {
    id: 'zebra',
    title: 'Pedestrian at a zebra crossing',
    relatedTopic: 'markings',
    brief: 'A pedestrian is stepping onto the zebra crossing ahead. The oncoming car has already stopped for them.',
    question: 'What do you do?',
    rule: 'Drivers must give way to pedestrians who are on, or clearly about to use, a pedestrian crossing.',
    map: { kind: 'straight', zebraY: 230, houses: true },
    signs: [{ at: [395, 270], type: 'zebra' }],
    introDuration: 1.6,
    actors: [
      { id: 'you', kind: 'car', player: true, color: '#2563eb', start: [330, 640], intro: [{ move: [[330, 430]], speed: 150 }] },
      { id: 'ped', kind: 'ped', start: [212, 230], heading: 90, intro: [{ wait: 0.6 }, { move: [[236, 230]], speed: 30 }], after: [{ move: [[392, 230], [410, 210]], speed: 45 }] },
      { id: 'onc', kind: 'car', color: '#7c3aed', start: [270, -60], heading: 180, intro: [{ move: [[270, 182]], speed: 160 }, { set: { brake: true } }], after: [{ wait: 3.4 }, { set: { brake: false } }, { move: [[270, 700]], speed: 140 }] },
    ],
    choices: [
      {
        label: 'Slow down and stop before the crossing',
        correct: true,
        feedback: 'Correct. You stopped before the stripes and let the pedestrian cross safely.',
        outcome: { you: [{ set: { brake: true } }, { move: [[330, 284]], speed: 80 }, { wait: 3 }, { set: { brake: false } }, { move: [[330, -80]], speed: 140 }] },
      },
      {
        label: 'Sound the horn and keep going, they will wait',
        correct: false,
        nearMiss: true,
        feedback: 'The pedestrian had priority. Your horn startled them in the middle of the road and you nearly hit them.',
        outcome: {
          you: [{ move: [[330, -80]], speed: 150 }],
          ped: [{ move: [[300, 230]], speed: 45 }, { wait: 0.6 }, { move: [[226, 230]], speed: 60 }],
        },
      },
      {
        label: 'Swerve into the other lane to get around them',
        correct: false,
        crash: true,
        feedback: 'The other lane was blocked by the car that had stopped for the pedestrian. Never overtake near a pedestrian crossing.',
        outcome: { you: [{ move: [[330, 360], [272, 280], [272, -80]], speed: 140 }] },
      },
    ],
  },
  {
    id: 'no-overtake',
    title: 'Slow truck, continuous line',
    relatedTopic: 'overtaking',
    brief: 'You are stuck behind a slow truck on a hill. The centre line is continuous and a "no overtaking" sign is posted. You cannot see far ahead.',
    question: 'What should you do?',
    rule: 'A continuous centre line must never be crossed. Overtaking is always done on the LEFT, and only when you can see that the road is clear.',
    map: { kind: 'straight', center: 'continuous' },
    signs: [{ at: [395, 460], type: 'noovertake' }],
    introDuration: 2,
    actors: [
      { id: 'you', kind: 'car', player: true, color: '#2563eb', start: [330, 600], intro: [{ move: [[330, 480]], speed: 60 }] },
      { id: 'truck', kind: 'truck', start: [330, 380], intro: [{ move: [[330, 300]], speed: 40 }], after: [{ move: [[330, 40]], speed: 50 }] },
      { id: 'onc', kind: 'car', color: '#dc2626', start: [270, -260], heading: 180, intro: [{ move: [[270, -150]], speed: 55 }], after: [{ move: [[270, 700]], speed: 220 }] },
    ],
    choices: [
      {
        label: 'Overtake now, the road looks clear',
        correct: false,
        crash: true,
        feedback: 'A car was hidden beyond the hill. Crossing a continuous line put you head-on with it.',
        outcome: { you: [{ move: [[300, 420], [270, 340], [270, -80]], speed: 170 }] },
      },
      {
        label: 'Stay behind the truck and keep a safe distance',
        correct: true,
        feedback: 'Correct. Be patient. You may only overtake once the line is broken and you can see that the road is clear.',
        outcome: { you: [{ move: [[330, 220]], speed: 50 }] },
      },
      {
        label: 'Overtake on the right, using the shoulder',
        correct: false,
        nearMiss: true,
        feedback: 'Overtaking on the right is forbidden and the shoulder is not part of the roadway. You squeezed past the truck with centimetres to spare.',
        outcome: { you: [{ move: [[366, 430], [366, 150], [330, 90], [330, -80]], speed: 150 }] },
      },
    ],
  },
  {
    id: 'roundabout',
    title: 'Entering a roundabout',
    relatedTopic: 'priority',
    brief: 'You arrive at a roundabout with a give-way sign. A red car is already driving around the roundabout and coming towards your entry.',
    question: 'How do you enter?',
    rule: 'At a roundabout with give-way signs, traffic already on the roundabout has priority. Go round it anticlockwise (to the right).',
    map: { kind: 'roundabout', giveWayLines: ['s'], houses: true },
    signs: [{ at: [386, 470], type: 'giveway' }, { at: [386, 510], type: 'roundabout' }],
    introDuration: 2.2,
    actors: [
      { id: 'you', kind: 'car', player: true, color: '#2563eb', start: [330, 640], intro: [{ move: [[330, 476]], speed: 140 }] },
      {
        id: 'ring',
        kind: 'car',
        color: '#dc2626',
        start: [300 + R * Math.cos((230 * Math.PI) / 180), 300 + R * Math.sin((230 * Math.PI) / 180)],
        intro: [{ move: arc(300, 300, R, 230, 170, 10), speed: 50 }],
        after: [{ move: [...arc(300, 300, R, 170, 15, 26), [430, 330], [700, 330]], speed: 120 }],
      },
    ],
    choices: [
      {
        label: 'Give way to the red car, then enter and go round to the right',
        correct: true,
        feedback: 'Correct. The red car was already on the roundabout, so it had priority. You entered behind it.',
        outcome: { you: [{ set: { brake: true } }, { wait: 2.3 }, { set: { brake: false } }, { move: [[330, 430], ...arc(300, 300, R, 70, -70, 24), [330, 160], [330, -80]], speed: 110 }] },
      },
      {
        label: 'Enter now, the car is coming from my left so I have priority',
        correct: false,
        crash: true,
        feedback: 'The give-way sign and line mean the traffic already on the roundabout has priority. "Priority to the right" does not apply here.',
        outcome: { you: [{ move: [[330, 430]], speed: 50 }, { move: [...arc(300, 300, R, 70, -70, 24), [330, -80]], speed: 110 }] },
      },
      {
        label: 'Enter and turn left, taking the short way round',
        correct: false,
        crash: true,
        feedback: 'Roundabouts are driven anticlockwise. Turning left drove you head-on into the circulating traffic.',
        outcome: { you: [{ move: [[330, 430]], speed: 80 }, { move: arc(300, 300, R, 70, 200, 20), speed: 110 }] },
      },
    ],
  },
  {
    id: 'ambulance',
    title: 'Ambulance behind you',
    relatedTopic: 'rules',
    brief: 'An ambulance with siren and flashing lights is coming up quickly behind you on a two-lane road.',
    question: 'What do you do?',
    rule: 'Give way to priority vehicles using their siren and flashing lights: signal, move over to the right and slow down or stop where it is safe.',
    map: { kind: 'straight' },
    introDuration: 2,
    actors: [
      { id: 'you', kind: 'car', player: true, color: '#2563eb', start: [330, 500], intro: [{ move: [[330, 330]], speed: 85 }] },
      { id: 'amb', kind: 'ambulance', start: [330, 760], props: { beacon: true, lights: 'low' }, intro: [{ move: [[330, 560]], speed: 100 }], after: [{ move: [[330, -150]], speed: 230 }] },
      { id: 'onc', kind: 'car', color: '#a16207', start: [270, -60], heading: 180, intro: [{ move: [[270, 40]], speed: 50 }], after: [{ move: [[270, 700]], speed: 120 }] },
    ],
    choices: [
      {
        label: 'Signal right, pull over to the right and slow down',
        correct: true,
        feedback: 'Correct. You made room without blocking anyone, and the ambulance passed in its own lane.',
        outcome: {
          you: [{ set: { indicator: 'right' } }, { move: [[356, 280], [364, 220]], speed: 90 }, { set: { brake: true } }, { wait: 2.5 }],
          amb: [{ move: [[330, 470]], speed: 120 }, { move: [[318, 380], [318, 160], [330, 60], [330, -150]], speed: 230 }],
        },
      },
      {
        label: 'Speed up to stay ahead of it',
        correct: false,
        nearMiss: true,
        feedback: 'Racing a priority vehicle is dangerous and delays it. It had to brake hard right behind you.',
        outcome: {
          you: [{ move: [[330, -400]], speed: 150 }],
          amb: [{ move: [[330, 80]], speed: 230 }, { set: { brake: true } }, { move: [[330, -150]], speed: 150 }],
        },
      },
      {
        label: 'Brake hard and stop in my lane',
        correct: false,
        nearMiss: true,
        feedback: 'Stopping in your lane forced the ambulance into the oncoming lane. Move over to the right, do not just stop.',
        outcome: {
          you: [{ set: { brake: true } }, { move: [[330, 300]], speed: 40 }, { wait: 3 }],
          amb: [{ move: [[330, 420], [290, 350], [290, 220], [330, 150], [330, -150]], speed: 200 }],
          onc: [{ move: [[270, 90]], speed: 80 }, { set: { brake: true } }, { wait: 2 }, { set: { brake: false } }, { move: [[270, 700]], speed: 120 }],
        },
      },
    ],
  },
  {
    id: 'stop-sign',
    title: 'STOP sign at a main road',
    relatedTopic: 'signs',
    brief: 'You are coming to a STOP sign where your street meets a main road. Houses block your view to the left.',
    question: 'What is the correct way to cross?',
    rule: 'At a STOP sign you must come to a complete stop at the line, then give way to all traffic on the main road.',
    map: { kind: 'cross', stopLines: ['s'], houses: true },
    signs: [{ at: [380, 392], type: 'stop' }],
    introDuration: 1.7,
    actors: [
      { id: 'you', kind: 'car', player: true, color: '#2563eb', start: [330, 640], intro: [{ move: [[330, 410]], speed: 140 }] },
      { id: 'main', kind: 'car', color: '#0891b2', start: [-260, 330], heading: 90, intro: [{ move: [[-60, 330]], speed: 120 }], after: [{ move: [[700, 330]], speed: 170 }] },
    ],
    choices: [
      {
        label: 'Roll through slowly if nothing seems to be coming',
        correct: false,
        crash: true,
        feedback: 'A STOP sign always means a full stop. A car you could not see arrived from the left.',
        outcome: { you: [{ move: [[330, -80]], speed: 40 }] },
      },
      {
        label: 'Stop completely at the line, look both ways, go when clear',
        correct: true,
        feedback: 'Correct. You stopped fully, saw the car coming from the left, and went once it had passed.',
        outcome: { you: [{ set: { brake: true } }, { move: [[330, 384]], speed: 60 }, { wait: 2.2 }, { set: { brake: false } }, { move: [[330, -80]], speed: 140 }] },
      },
      {
        label: 'Stop, then go straight away, main-road cars will slow down',
        correct: false,
        crash: true,
        feedback: 'Stopping is not enough: you must give way. Traffic on the main road does not have to slow down for you.',
        outcome: { you: [{ set: { brake: true } }, { move: [[330, 384]], speed: 60 }, { wait: 0.3 }, { set: { brake: false } }, { move: [[330, -80]], speed: 50 }] },
      },
    ],
  },
  {
    id: 'night-beam',
    title: 'High beam at night',
    relatedTopic: 'lights',
    brief: 'You are driving at night with your high beam on. A car appears in the opposite lane.',
    question: 'What do you do with your lights?',
    rule: 'Switch to dipped (low) beam when you meet oncoming traffic, and keep it dipped until the vehicle has passed.',
    map: { kind: 'straight', night: true },
    introDuration: 2,
    actors: [
      { id: 'you', kind: 'car', player: true, color: '#2563eb', start: [330, 600], props: { lights: 'high' }, intro: [{ move: [[330, 380]], speed: 110 }] },
      { id: 'onc', kind: 'car', color: '#e5e7eb', start: [270, -150], heading: 180, props: { lights: 'low' }, intro: [{ move: [[270, 60]], speed: 105 }], after: [{ move: [[270, 700]], speed: 110 }] },
    ],
    choices: [
      {
        label: 'Switch to low beam until the car has passed',
        correct: true,
        feedback: 'Correct. Neither driver was dazzled and you passed each other safely.',
        outcome: { you: [{ set: { lights: 'low' } }, { move: [[330, 0]], speed: 110 }, { set: { lights: 'high' } }, { move: [[330, -100]], speed: 110 }] },
      },
      {
        label: 'Keep high beam on, it is very dark',
        correct: false,
        nearMiss: true,
        feedback: 'You dazzled the other driver, who drifted towards the centre line and nearly hit you.',
        outcome: {
          you: [{ move: [[330, -100]], speed: 110 }],
          onc: [{ move: [[284, 200], [292, 290], [282, 360], [270, 440], [270, 700]], speed: 100 }],
        },
      },
      {
        label: 'Flash high and low beam several times to warn them',
        correct: false,
        nearMiss: true,
        feedback: 'Flashing dazzles the other driver even more. Dip your lights and keep them dipped.',
        outcome: {
          you: [...flashing(380, 60, 330, 110, 3), { move: [[330, -100]], speed: 110 }],
          onc: [{ move: [[286, 200], [296, 290], [284, 360], [270, 440], [270, 700]], speed: 100 }],
        },
      },
    ],
  },
  {
    id: 'school-bus',
    title: 'Stopped school bus',
    relatedTopic: 'safety',
    brief: 'A school bus has stopped on the other side of the road with its orange lights flashing. Children are getting off.',
    question: 'How do you pass it?',
    rule: 'Flashing orange lights on a school bus mean caution: slow right down and be ready to stop, because children may cross without looking.',
    map: { kind: 'straight', houses: true },
    signs: [{ at: [395, 380], type: 'children' }],
    introDuration: 1.4,
    actors: [
      { id: 'you', kind: 'car', player: true, color: '#2563eb', start: [330, 620], intro: [{ move: [[330, 440]], speed: 140 }] },
      { id: 'bus', kind: 'schoolbus', start: [272, 262], heading: 180, props: { beacon: true }, intro: [] },
      { id: 'kid', kind: 'child', start: [266, 302], heading: 90, intro: [], after: [{ move: [[292, 318], [410, 330]], speed: 50 }] },
      { id: 'kid2', kind: 'child', start: [214, 250], heading: 270, intro: [{ move: [[206, 240]], speed: 10 }] },
    ],
    choices: [
      {
        label: 'Slow right down and be ready to stop',
        correct: true,
        feedback: 'Correct. A child ran out from behind the bus and you stopped in plenty of time.',
        outcome: { you: [{ set: { brake: true } }, { move: [[330, 392]], speed: 70 }, { wait: 2.4 }, { set: { brake: false } }, { move: [[330, -80]], speed: 110 }] },
      },
      {
        label: 'Pass at normal speed, the bus is on the other side',
        correct: false,
        nearMiss: true,
        feedback: 'A child appeared from behind the bus. The bus being on the other side does not make it safe.',
        outcome: {
          you: [{ move: [[330, -80]], speed: 140 }],
          kid: [{ move: [[292, 318], [304, 324]], speed: 50 }, { wait: 0.8 }, { move: [[262, 304]], speed: 40 }],
        },
      },
      {
        label: 'Sound the horn so the children stay back, and keep going',
        correct: false,
        nearMiss: true,
        feedback: 'Children do not react predictably to a horn. Slowing down is the only safe option.',
        outcome: {
          you: [{ move: [[330, -80]], speed: 120 }],
          kid: [{ move: [[292, 318], [306, 324]], speed: 55 }, { wait: 0.8 }, { move: [[262, 304]], speed: 40 }],
        },
      },
    ],
  },
]
