import test from 'node:test'
import assert from 'node:assert/strict'
import {
  newMatch, addPoint, undoPoint, derive, labels, stats, resultText, verlaufText, pointServer, isOver, score,
} from '../src/lib/pointProtocolLogic.js'

const play = (m, str, meta) => [...str].forEach((c, i) => addPoint(m, c === '+', meta?.[i]))
const base = (over = {}) => newMatch({ firstServer: 'k', mode: 'ct', ...over })
// Ein Spiel, das 'k' zu Null gewinnt, bzw. verliert
const winGame = (m) => play(m, '++++')
const loseGame = (m) => play(m, '----')

test('ein Spiel geht bei 4 Punkten mit 2 Vorsprung zu Ende, der Aufschläger wechselt', () => {
  const m = base()
  assert.equal(m.games.length, 1)
  winGame(m)
  assert.equal(m.games.length, 2)
  assert.equal(m.games[1].server, 'g')
  assert.equal(derive(m).cur.a, 1)
})

test('Einstand und Vorteil werden wie auf dem Papierbogen geschrieben', () => {
  const m = base()
  play(m, '+++---+-+')
  const l = labels(m.games[0]).map((x) => x.txt)
  assert.deepEqual(l, ['+', '+', '+', '−', '−', 'E', 'V+', 'E', 'V+'])
})

test('Satz bei 6:4, dann beginnt der nächste Satz', () => {
  const m = base()
  for (let i = 0; i < 6; i++) winGame(m)
  // 6:0 → Satz 1 fertig
  const d = derive(m)
  assert.equal(d.sets.length, 1)
  assert.equal(d.sk, 1)
  assert.equal(d.cur.games.length, 1)
})

test('bei 6:6 folgt ein Tiebreak bis 7, Aufschlag wechselt alle zwei Punkte', () => {
  const m = base()
  for (let i = 0; i < 6; i++) { winGame(m); loseGame(m) }
  const tb = m.games[m.games.length - 1]
  assert.equal(tb.tb, 7)
  const servers = []
  for (let i = 0; i < 5; i++) { servers.push(pointServer(m.games[m.games.length - 1])); addPoint(m, true) }
  // Erster Punkt: Aufschläger des Spiels; danach zwei-zwei-…
  assert.deepEqual(servers, [tb.server, opp(tb.server), opp(tb.server), tb.server, tb.server])
  function opp(s) { return s === 'k' ? 'g' : 'k' }
})

test('Rückgängig nimmt Punkt samt Zusatzangabe zurück und öffnet ein abgeschlossenes Spiel wieder', () => {
  const m = base()
  winGame(m)
  assert.equal(m.games.length, 2)
  undoPoint(m)
  assert.equal(m.games.length, 1)
  assert.equal(m.games[0].pts.length, 3)
  addPoint(m, false, { kind: 'rf' })
  undoPoint(m)
  assert.equal(m.games[0].meta.length, 3)
})

test('Champions-Tiebreak nach 1:1 in Sätzen nur im Modus ct, sonst 3. Satz', () => {
  const make = (mode) => {
    const m = base({ mode })
    for (let s = 0; s < 2; s++) {
      for (let i = 0; i < 6; i++) (s === 0 ? winGame : loseGame)(m)
    }
    return m
  }
  assert.equal(make('ct').games.at(-1).tb, 10)
  assert.equal(make('full').games.at(-1).tb, 0)
})

test('Winner zählt für den, der den Punkt gewinnt; Doppelfehler zählt als 1. Aufschlagfehler', () => {
  const m = base()
  addPoint(m, true, { kind: 'w' })          // Winner k
  addPoint(m, false, { kind: 'w' })         // Winner g
  addPoint(m, false, { kind: 'df', f1: true }) // k schlägt auf und verliert per Doppelfehler
  addPoint(m, true, { kind: 'rf' })         // g Returnfehler (k schlägt auf, gewinnt)
  const { err } = stats(m)
  assert.equal(err.wK, 1)
  assert.equal(err.wG, 1)
  assert.equal(err.dfK, 1)
  assert.equal(err.rfG, 1)
  assert.equal(err.f1K, 1)
  assert.equal(err.srvK, 4)
})

test('Kennzahlen: gewonnene Punkte, Serie, Halten', () => {
  const m = base()
  play(m, '++-++')  // Spiel 1 (k schlägt auf) gewonnen: 4:1
  const s = stats(m)
  assert.equal(s.total, 5)
  assert.equal(s.won, 4)
  assert.equal(s.best, 1)
  assert.equal(s.hold, 1)
  assert.equal(s.holdN, 1)
})

test('Ergebnis- und Verlaufstext im Format des Matchtickers', () => {
  const m = base()
  for (let i = 0; i < 6; i++) winGame(m)          // Satz 1: 6:0
  for (let i = 0; i < 6; i++) loseGame(m)         // Satz 2: 0:6
  play(m, '++++++++++')                            // Champions-Tiebreak 10:0
  assert.equal(derive(m).over, true)
  assert.equal(resultText(m), '6:0, 0:6, [10:0]')
  const v = verlaufText(m)
  assert.ok(v.startsWith('Satz 1: 1:0, 2:0, 3:0, 4:0, 5:0, 6:0 (6:0) | Satz 2: 0:1'))
  assert.ok(v.endsWith('Match-Tiebreak: 1:0, 2:0, 3:0, 4:0, 5:0, 6:0, 7:0, 8:0, 9:0, 10:0 ([10:0])'))
})

test('Tiebreak im Satz: 7:6(4) und Tiebreak-Verlauf im Text', () => {
  const m = base()
  for (let i = 0; i < 6; i++) { winGame(m); loseGame(m) }
  play(m, '+-+-+-+-+++')  // 7:3? → 4 Punkte für g … siehe Prüfung unten
  const d = derive(m)
  assert.equal(d.sets.length, 1)
  const { k, o } = score(m.games.find((g) => g.tb === 7))
  assert.equal(resultText(m).startsWith(`7:6(${Math.min(k, o)})`), true)
  assert.match(verlaufText(m), /— Tiebreak: 1:0, 1:1/)
})

test('beendete Spiele sind abgeschlossen, das Match endet nach zwei Satzgewinnen', () => {
  const m = base()
  for (let i = 0; i < 12; i++) winGame(m)
  assert.equal(derive(m).over, true)
  const n = m.games.length
  addPoint(m, true)
  assert.equal(m.games.length, n)
  assert.equal(isOver(m.games.at(-1)), true)
})
