import i18n from '../i18n'

// A set is won at 6 games with a 2-game lead, or 7:5. At 6:6 the set moves
// into a tiebreak instead (handled in addLivePoint).
export function isSetOver(a, b) {
  if (a >= 6 && a - b >= 2) return true
  if (b >= 6 && b - a >= 2) return true
  return false
}
// Standard set tiebreak: first to 7 points, win by 2 (continues beyond 7 if needed).
export function isTiebreakOver(a, b) {
  return (a >= 7 || b >= 7) && Math.abs(a - b) >= 2
}
// Match tiebreak (played instead of a 3rd set): first to 10 points, win by 2.
export function isMatchTiebreakOver(a, b) {
  return (a >= 10 || b >= 10) && Math.abs(a - b) >= 2
}

export function formatSetScore(s) {
  if (s.matchTiebreak) return '[' + s.a + ':' + s.b + ']'
  let str = s.a + ':' + s.b
  if (s.tiebreak) str += '(' + Math.min(s.tiebreak.a, s.tiebreak.b) + ')'
  return str
}

export function blankLiveMatch({ datum, gegner, turnier, mode }) {
  return {
    datum,
    gegner,
    turnier,
    mode,
    setsToWin: 2,
    sets: [],
    gamesA: 0,
    gamesB: 0,
    history: [],
    tiebreak: null,
    matchTiebreak: null,
    setsWonA: 0,
    setsWonB: 0,
    decided: false,
    active: true,
    snapshots: [],
  }
}

function snapshotOf(m) {
  return JSON.stringify({
    sets: m.sets,
    gamesA: m.gamesA,
    gamesB: m.gamesB,
    history: m.history,
    tiebreak: m.tiebreak,
    matchTiebreak: m.matchTiebreak,
    setsWonA: m.setsWonA,
    setsWonB: m.setsWonB,
    decided: m.decided,
  })
}

function finalizeSet(m, setEntry) {
  const setsWonA = setEntry.a > setEntry.b ? m.setsWonA + 1 : m.setsWonA
  const setsWonB = setEntry.a > setEntry.b ? m.setsWonB : m.setsWonB + 1
  let next = {
    ...m,
    sets: [...m.sets, setEntry],
    setsWonA,
    setsWonB,
    gamesA: 0,
    gamesB: 0,
    history: [],
    tiebreak: null,
  }

  let message
  if (setsWonA >= next.setsToWin || setsWonB >= next.setsToWin) {
    next = { ...next, decided: true }
    message = i18n.t('liveMatchLogic.matchDecidedInLastSet', { score: formatSetScore(setEntry) })
  } else if (next.mode === 'matchtiebreak' && next.sets.length === 2 && setsWonA === 1 && setsWonB === 1) {
    next = { ...next, matchTiebreak: { pointsA: 0, pointsB: 0, history: [] } }
    message = i18n.t('liveMatchLogic.oneOneMatchTiebreak')
  } else {
    message = i18n.t('liveMatchLogic.setOverNewSet', { score: formatSetScore(setEntry) })
  }
  return { next, message }
}

function finalizeMatchTiebreak(m) {
  const mtb = m.matchTiebreak
  const winnerIsA = mtb.pointsA > mtb.pointsB
  const setEntry = { matchTiebreak: true, a: mtb.pointsA, b: mtb.pointsB, progression: mtb.history.slice() }
  const next = {
    ...m,
    sets: [...m.sets, setEntry],
    matchTiebreak: null,
    decided: true,
    setsWonA: winnerIsA ? m.setsWonA + 1 : m.setsWonA,
    setsWonB: winnerIsA ? m.setsWonB : m.setsWonB + 1,
  }
  return { next, message: i18n.t('liveMatchLogic.decidedInMatchTiebreak', { a: mtb.pointsA, b: mtb.pointsB }) }
}

export function addLivePoint(m, side) {
  if (!m || m.decided) return { next: m, message: null }
  const snapshots = [...(m.snapshots || []), snapshotOf(m)]
  const base = { ...m, snapshots }

  if (base.matchTiebreak) {
    const mtb = { ...base.matchTiebreak }
    if (side === 'a') mtb.pointsA++
    else mtb.pointsB++
    mtb.history = [...mtb.history, { a: mtb.pointsA, b: mtb.pointsB }]
    const working = { ...base, matchTiebreak: mtb }
    if (isMatchTiebreakOver(mtb.pointsA, mtb.pointsB)) return finalizeMatchTiebreak(working)
    return { next: working, message: null }
  }

  if (base.tiebreak) {
    const tb = { ...base.tiebreak }
    if (side === 'a') tb.pointsA++
    else tb.pointsB++
    tb.history = [...tb.history, { a: tb.pointsA, b: tb.pointsB }]
    const working = { ...base, tiebreak: tb }
    if (isTiebreakOver(tb.pointsA, tb.pointsB)) {
      const winnerIsA = tb.pointsA > tb.pointsB
      return finalizeSet(working, {
        a: winnerIsA ? 7 : 6,
        b: winnerIsA ? 6 : 7,
        progression: working.history.slice(),
        tiebreak: { a: tb.pointsA, b: tb.pointsB, progression: tb.history.slice() },
      })
    }
    return { next: working, message: null }
  }

  let gamesA = base.gamesA
  let gamesB = base.gamesB
  if (side === 'a') gamesA++
  else gamesB++
  const history = [...base.history, { a: gamesA, b: gamesB }]
  const working = { ...base, gamesA, gamesB, history }

  if (gamesA === 6 && gamesB === 6) {
    return {
      next: { ...working, tiebreak: { pointsA: 0, pointsB: 0, history: [] } },
      message: i18n.t('liveMatchLogic.tiebreakStarts'),
    }
  }
  if (isSetOver(gamesA, gamesB)) {
    return finalizeSet(working, { a: gamesA, b: gamesB, progression: working.history.slice() })
  }
  return { next: working, message: null }
}

export function undoLivePoint(m) {
  if (!m || !m.snapshots || !m.snapshots.length) return m
  const snapshots = [...m.snapshots]
  const prev = JSON.parse(snapshots.pop())
  return {
    ...m,
    snapshots,
    sets: prev.sets,
    gamesA: prev.gamesA,
    gamesB: prev.gamesB,
    history: prev.history,
    tiebreak: prev.tiebreak,
    matchTiebreak: prev.matchTiebreak,
    setsWonA: prev.setsWonA,
    setsWonB: prev.setsWonB,
    decided: prev.decided,
  }
}

// Mirrors the reference app's endLiveMatch: folds in the still-open set/tiebreak
// (if any points were played) so an early-ended match still carries a result.
export function buildEndedResult(m) {
  const allSets = m.sets.slice()
  if (m.matchTiebreak && m.matchTiebreak.history.length) {
    allSets.push({
      matchTiebreak: true,
      a: m.matchTiebreak.pointsA,
      b: m.matchTiebreak.pointsB,
      progression: m.matchTiebreak.history.slice(),
      unfinished: true,
    })
  } else if (m.tiebreak && m.tiebreak.history.length) {
    allSets.push({
      a: m.gamesA,
      b: m.gamesB,
      progression: m.history.slice(),
      tiebreak: { a: m.tiebreak.pointsA, b: m.tiebreak.pointsB, progression: m.tiebreak.history.slice() },
      unfinished: true,
    })
  } else if (m.history.length) {
    allSets.push({ a: m.gamesA, b: m.gamesB, progression: m.history.slice(), unfinished: true })
  }

  const ergebnis = allSets.map((s) => formatSetScore(s)).join(', ')
  const verlauf = allSets
    .map((s, i) => {
      const label = s.matchTiebreak ? 'Match-Tiebreak' : 'Satz ' + (i + 1)
      let line = label + ': ' + s.progression.map((h) => h.a + ':' + h.b).join(', ') + ' (' + formatSetScore(s) + ')'
      if (s.tiebreak) line += ' — Tiebreak: ' + s.tiebreak.progression.map((h) => h.a + ':' + h.b).join(', ')
      return line
    })
    .join(' | ')

  return { ergebnis, verlauf }
}
