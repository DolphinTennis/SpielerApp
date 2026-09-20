// Punktprotokoll: Regelwerk und Auswertung, rein rechnerisch (kein React, kein
// Supabase, keine Texte) — dadurch testbar und unabhängig von der Oberfläche.
//
// Ein Match ist { firstServer, mode, games }. Spieler 'k' ist die eigene
// Spielerin/der eigene Spieler, 'g' der Gegner. Ein Spiel ist
//   { server, tb, pts: [true|false…], meta: [{ kind?, f1? }…], chips: [], note }
// pts[i] === true heißt: 'k' hat den Punkt gewonnen. tb ist 0 (normales Spiel),
// 7 (Tiebreak im Satz) oder 10 (Champions-Tiebreak statt 3. Satz).
// meta[i].kind: 'df' Doppelfehler, 'rf' Returnfehler, 'w' Winner;
// meta[i].f1: der 1. Aufschlag war ein Fehler.

export const opp = (s) => (s === 'k' ? 'g' : 'k')

export const score = (g) => {
  let k = 0
  let o = 0
  g.pts.forEach((p) => (p ? k++ : o++))
  return { k, o }
}

export const metaAt = (g, i) => (g.meta && g.meta[i]) || {}

// Wer schlägt Punkt i eines Spiels auf (im Tiebreak wechselt der Aufschlag alle zwei Punkte)?
export const srvAt = (g, i) => (g.tb ? (Math.floor((i + 1) / 2) % 2 === 0 ? g.server : opp(g.server)) : g.server)

export const pointServer = (g) => srvAt(g, g.pts.length)

export const isOver = (g) => {
  const { k, o } = score(g)
  if (g.tb) return (k >= g.tb || o >= g.tb) && Math.abs(k - o) >= 2
  return (k >= 4 || o >= 4) && Math.abs(k - o) >= 2
}

export function derive(m) {
  const sets = []
  const setOfGame = []
  let cur = { games: [], a: 0, b: 0, done: false }
  let sk = 0
  let so = 0
  for (const g of m.games) {
    setOfGame.push(sets.length)
    cur.games.push(g)
    if (isOver(g)) {
      const { k, o } = score(g)
      const kw = k > o
      if (g.tb === 10) {
        cur.ct = true
        cur.a = k
        cur.b = o
        cur.done = true
      } else {
        if (kw) cur.a++
        else cur.b++
        if (g.tb === 7) cur.done = true
        else if ((cur.a >= 6 && cur.a - cur.b >= 2) || (cur.b >= 6 && cur.b - cur.a >= 2) || cur.a === 7 || cur.b === 7) cur.done = true
      }
      if (cur.done) {
        sets.push(cur)
        if (kw) sk++
        else so++
        cur = { games: [], a: 0, b: 0, done: false }
      }
    }
  }
  return { sets, cur, sk, so, over: sk === 2 || so === 2, setOfGame }
}

// Hängt das nächste Spiel an, sobald das letzte beendet ist (mit richtigem Aufschläger und Tiebreak-Art).
export function ensureGame(m) {
  const d = derive(m)
  if (d.over) return
  const last = m.games[m.games.length - 1]
  if (last && !isOver(last)) return
  let tb = 0
  if (d.cur.games.length && d.cur.a === 6 && d.cur.b === 6) tb = 7
  else if (!d.cur.games.length && d.sets.length === 2 && d.sk === 1 && d.so === 1 && m.mode === 'ct') tb = 10
  m.games.push({ server: last ? opp(last.server) : m.firstServer, tb, pts: [], meta: [], chips: [], note: '' })
}

export function newMatch(base) {
  const m = { ...base, games: [] }
  ensureGame(m)
  return m
}

export function addPoint(m, won, meta) {
  const g = m.games[m.games.length - 1]
  if (!g || derive(m).over) return
  if (!g.meta) g.meta = []
  g.meta.length = g.pts.length
  g.pts.push(won)
  g.meta[g.pts.length - 1] = meta || {}
  ensureGame(m)
}

export function undoPoint(m) {
  let last = m.games[m.games.length - 1]
  if (last && last.pts.length === 0) {
    m.games.pop()
    last = m.games[m.games.length - 1]
  }
  if (last && last.pts.length) {
    last.pts.pop()
    if (last.meta) last.meta.length = Math.min(last.meta.length, last.pts.length)
  }
  ensureGame(m)
}

// Punktestand im laufenden Spiel als Rohwerte; die Anzeige-Texte baut die Oberfläche.
export function gameScoreParts(g) {
  const { k, o } = score(g)
  if (g.tb) return { tb: true, k, o }
  if (k >= 3 && o >= 3) return { deuce: k === o, adv: k === o ? null : k > o ? 'k' : 'g', k, o }
  return { k: [0, 15, 30, 40][Math.min(k, 3)], o: [0, 15, 30, 40][Math.min(o, 3)] }
}

// Papier-Schreibweise: + / − je Punkt, bei Einstand/Vorteil E / V+ / V−.
export function labels(g) {
  let k = 0
  let o = 0
  const out = []
  g.pts.forEach((p, i) => {
    if (p) k++
    else o++
    const finished = i === g.pts.length - 1 && isOver(g)
    let cls = p ? 'w' : 'l'
    let txt = p ? '+' : '−'
    if (!g.tb && !finished && k >= 3 && o >= 3) {
      if (k === o) {
        cls = 'e'
        txt = 'E'
      } else if (k > o) {
        cls = 'vp'
        txt = 'V+'
      } else {
        cls = 'vm'
        txt = 'V−'
      }
    }
    out.push({ cls, txt, sup: { df: 'DF', rf: 'RF', w: 'W' }[metaAt(g, i).kind] || '' })
  })
  return out
}

export function stats(m) {
  const d = derive(m)
  const seq = []
  m.games.forEach((g, gi) => {
    let k = 0
    let o = 0
    g.pts.forEach((p, pi) => {
      const deuceBefore = !g.tb && k >= 3 && o >= 3
      seq.push({ won: p, srv: g.tb ? null : g.server, all: srvAt(g, pi), meta: metaAt(g, pi), deuce: deuceBefore, set: d.setOfGame[gi] })
      if (p) k++
      else o++
    })
  })
  const won = seq.filter((p) => p.won).length
  let afterLost = 0
  let afterLostWon = 0
  let streak = 0
  let best = 0
  seq.forEach((p, i) => {
    if (!p.won) {
      streak++
      best = Math.max(best, streak)
    } else streak = 0
    if (i > 0 && !seq[i - 1].won) {
      afterLost++
      if (p.won) afterLostWon++
    }
  })
  const dz = seq.filter((p) => p.deuce)
  const dzw = dz.filter((p) => p.won).length
  const own = seq.filter((p) => p.srv === 'k')
  const ownW = own.filter((p) => p.won).length
  const op = seq.filter((p) => p.srv === 'g')
  const opW = op.filter((p) => p.won).length
  let hold = 0
  let holdN = 0
  let brk = 0
  let brkN = 0
  m.games.forEach((g) => {
    if (g.tb || !isOver(g)) return
    const { k, o } = score(g)
    if (g.server === 'k') {
      holdN++
      if (k > o) hold++
    } else {
      brkN++
      if (k > o) brk++
    }
  })
  const perSet = d.sets.concat(d.cur.games.length ? [d.cur] : []).map((s, idx) => {
    const pp = seq.filter((p) => p.set === idx)
    const w = pp.filter((p) => p.won).length
    const lg = s.games[s.games.length - 1]
    const running = !s.done && lg && lg.tb === 10 ? `[${score(lg).k}:${score(lg).o}]` : null
    return { idx, w, n: pp.length, label: running || (s.ct ? `[${s.a}:${s.b}]` : `${s.a}:${s.b}`) }
  })
  const cnt = (fn) => seq.filter(fn).length
  const err = {
    dfK: cnt((p) => p.meta.kind === 'df' && p.all === 'k'),
    dfG: cnt((p) => p.meta.kind === 'df' && p.all === 'g'),
    rfK: cnt((p) => p.meta.kind === 'rf' && p.all === 'g'),
    rfG: cnt((p) => p.meta.kind === 'rf' && p.all === 'k'),
    f1K: cnt((p) => p.all === 'k' && (p.meta.f1 || p.meta.kind === 'df')),
    f1G: cnt((p) => p.all === 'g' && (p.meta.f1 || p.meta.kind === 'df')),
    srvK: cnt((p) => p.all === 'k'),
    srvG: cnt((p) => p.all === 'g'),
    // Winner gehört dem, der den Punkt gewonnen hat.
    wK: cnt((p) => p.meta.kind === 'w' && p.won),
    wG: cnt((p) => p.meta.kind === 'w' && !p.won),
  }
  return { err, total: seq.length, won, afterLost, afterLostWon, best, dz: dz.length, dzw, own: own.length, ownW, op: op.length, opW, hold, holdN, brk, brkN, perSet }
}

export const pct = (a, b) => (b ? Math.round((a / b) * 100) + ' %' : '–')

// ---------------------------------------------------------------------------
// Übernahme in die Matchanalyse — dieselben Textformate wie der Matchticker
// (siehe buildEndedResult in liveMatchLogic.js), damit beide Wege gleich aussehen.
// ---------------------------------------------------------------------------

function tiebreakMin(s) {
  const tbGame = s.games.find((g) => g.tb === 7)
  if (!tbGame) return null
  const { k, o } = score(tbGame)
  return Math.min(k, o)
}

function formatSet(s) {
  if (s.ct) return `[${s.a}:${s.b}]`
  const tb = tiebreakMin(s)
  return tb === null ? `${s.a}:${s.b}` : `${s.a}:${s.b}(${tb})`
}

function allSetsWithRunning(m) {
  const d = derive(m)
  const cur = d.cur.games.some((g) => g.pts.length) ? [d.cur] : []
  return d.sets.concat(cur)
}

// "6:4, 3:6, [10:7]" — wie das Ergebnis-Feld der Matchanalyse.
export function resultText(m) {
  return allSetsWithRunning(m).map(formatSet).join(', ')
}

// "Satz 1: 1:0, 1:1, … (6:4) | Satz 2: … | Match-Tiebreak: 1:0, … ([10:7])"
export function verlaufText(m) {
  return allSetsWithRunning(m)
    .map((s, i) => {
      const label = s.ct ? 'Match-Tiebreak' : `Satz ${i + 1}`
      if (s.ct) {
        const g = s.games[s.games.length - 1]
        return `${label}: ${runningPoints(g)} (${formatSet(s)})`
      }
      let a = 0
      let b = 0
      const steps = []
      for (const g of s.games) {
        if (g.tb === 7) continue
        if (!isOver(g)) continue
        const { k, o } = score(g)
        if (k > o) a++
        else b++
        steps.push(`${a}:${b}`)
      }
      let line = `${label}: ${steps.join(', ')} (${formatSet(s)})`
      const tbGame = s.games.find((g) => g.tb === 7)
      if (tbGame) line += ` — Tiebreak: ${runningPoints(tbGame)}`
      return line
    })
    .join(' | ')
}

function runningPoints(g) {
  let k = 0
  let o = 0
  return g.pts
    .map((p) => {
      if (p) k++
      else o++
      return `${k}:${o}`
    })
    .join(', ')
}
