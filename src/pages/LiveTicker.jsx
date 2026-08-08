import { useEffect, useState } from 'react'
import { useAuth } from '../lib/AuthContext'
import { useOrg } from '../lib/OrgContext'
import { useToast } from '../lib/ToastContext'
import { fetchLiveMatch, saveLiveMatch, clearLiveMatch } from '../lib/liveMatchApi'
import { blankMatch, createMatch } from '../lib/matchesApi'
import {
  addLivePoint,
  blankLiveMatch,
  buildEndedResult,
  formatSetScore,
  undoLivePoint,
} from '../lib/liveMatchLogic'

export default function LiveTicker({ onMatchCreated }) {
  const { session } = useAuth()
  const { orgId, playerName } = useOrg()
  const toast = useToast()
  const userId = session.user.id

  const [liveMatch, setLiveMatch] = useState(undefined) // undefined = loading, null = none active
  const [setupDate, setSetupDate] = useState('')
  const [setupOpp, setSetupOpp] = useState('')
  const [setupTourn, setSetupTourn] = useState('')
  const [setupMode, setSetupMode] = useState('bo3')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetchLiveMatch(userId)
      .then((state) => {
        if (!cancelled) setLiveMatch(state)
      })
      .catch((err) => {
        console.error(err)
        toast('Live-Match konnte nicht geladen werden.')
        if (!cancelled) setLiveMatch(null)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  async function persist(next) {
    setLiveMatch(next)
    try {
      await saveLiveMatch(userId, orgId, next)
    } catch (err) {
      console.error(err)
      toast('Fehler beim Speichern des Punktes.')
    }
  }

  async function handleStart() {
    setBusy(true)
    try {
      const next = blankLiveMatch({ datum: setupDate, gegner: setupOpp, turnier: setupTourn, mode: setupMode })
      await saveLiveMatch(userId, orgId, next)
      setLiveMatch(next)
      toast('Live-Tracking gestartet.')
    } catch (err) {
      console.error(err)
      toast('Fehler beim Starten des Live-Trackings. Bitte erneut versuchen.')
    } finally {
      setBusy(false)
    }
  }

  async function handlePoint(side) {
    if (!liveMatch || liveMatch.decided) return
    const { next, message } = addLivePoint(liveMatch, side)
    await persist(next)
    if (message) toast(message)
  }

  async function handleUndo() {
    if (!liveMatch?.snapshots?.length) return
    const next = undoLivePoint(liveMatch)
    await persist(next)
  }

  async function handleEnd() {
    if (!liveMatch) return
    setBusy(true)
    try {
      const { ergebnis, verlauf } = buildEndedResult(liveMatch)
      const record = {
        ...blankMatch(userId, orgId, playerName),
        datum: liveMatch.datum,
        gegner: liveMatch.gegner,
        turnier: liveMatch.turnier,
        ergebnis,
        verlauf,
      }
      const saved = await createMatch(record)
      await clearLiveMatch(userId, orgId)
      setLiveMatch(null)
      toast('Match beendet — Ergebnis wurde in die Matchanalyse übernommen.')
      onMatchCreated(saved.id)
    } catch (err) {
      console.error(err)
      toast('Fehler beim Beenden des Matches.')
    } finally {
      setBusy(false)
    }
  }

  if (liveMatch === undefined) return null

  if (!liveMatch || !liveMatch.active) {
    return (
      <div className="view">
        <h1 className="section-title">Matchticker</h1>
        <p className="section-sub">Verfolge das aktuelle Match von {playerName} live mit.</p>

        <div className="live-setup-card">
          <h3 style={{ fontSize: 19, color: 'var(--ink)', margin: '0 0 4px' }}>Neues Match anlegen</h3>
          <p style={{ fontSize: 13, color: 'var(--text-soft)', margin: 0 }}>
            Trage die Eckdaten ein und starte das Live-Tracking.
          </p>
          <div className="grid-fields">
            <div className="field">
              <label htmlFor="live-date">Spiel Datum</label>
              <input id="live-date" type="date" value={setupDate} onChange={(e) => setSetupDate(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="live-opp">Name Gegnerin</label>
              <input id="live-opp" type="text" placeholder="Gegnerin" value={setupOpp} onChange={(e) => setSetupOpp(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="live-tourn">Turnier</label>
              <input id="live-tourn" type="text" placeholder="Turniername" value={setupTourn} onChange={(e) => setSetupTourn(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="live-satzmodus">Satzmodus</label>
              <select id="live-satzmodus" value={setupMode} onChange={(e) => setSetupMode(e.target.value)}>
                <option value="bo3">Best of 3 (2 Gewinnsätze)</option>
                <option value="matchtiebreak">Match-Tiebreak</option>
              </select>
            </div>
          </div>
          <button className="btn btn-primary" onClick={handleStart} disabled={busy}>
            ▶ Live-Tracking starten
          </button>
        </div>
      </div>
    )
  }

  const inTiebreak = !!liveMatch.tiebreak
  const inMatchTiebreak = !!liveMatch.matchTiebreak
  const pointMode = inTiebreak || inMatchTiebreak

  let numA = liveMatch.gamesA
  let numB = liveMatch.gamesB
  let caption = 'Spiele im aktuellen Satz'
  if (inMatchTiebreak) {
    numA = liveMatch.matchTiebreak.pointsA
    numB = liveMatch.matchTiebreak.pointsB
    caption = 'Punkte im Match-Tiebreak (bis 10, 2 Punkte Vorsprung)'
  } else if (inTiebreak) {
    numA = liveMatch.tiebreak.pointsA
    numB = liveMatch.tiebreak.pointsB
    caption = 'Punkte im Tiebreak (bei 6:6)'
  }

  let listSource, progressTitle
  if (inMatchTiebreak) {
    listSource = liveMatch.matchTiebreak.history
    progressTitle = 'Match-Tiebreak-Punkte'
  } else if (inTiebreak) {
    listSource = liveMatch.tiebreak.history
    progressTitle = 'Tiebreak-Punkte · Satz ' + (liveMatch.sets.length + 1)
  } else {
    listSource = liveMatch.history
    progressTitle = 'Spielverlauf · Satz ' + (liveMatch.sets.length + (liveMatch.decided ? 0 : 1))
  }

  const winner = liveMatch.decided ? (liveMatch.setsWonA > liveMatch.setsWonB ? playerName : liveMatch.gegner || 'Gegnerin') : null

  return (
    <div className="view">
      <h1 className="section-title">Matchticker</h1>
      <p className="section-sub">Verfolge das aktuelle Match von {playerName} live mit.</p>

      <div className="live-hero">
        <div className="matchup">
          {playerName} vs. {liveMatch.gegner || '—'}
          {liveMatch.turnier ? ' · ' + liveMatch.turnier : ''}
        </div>

        <div className="sets-row">
          {liveMatch.sets.map((s, i) => (
            <div className={`set-chip ${s.a > s.b ? 'won-a' : 'won-b'}`} key={i}>
              <div className="set-label">{s.matchTiebreak ? 'Match-TB' : 'Satz ' + (i + 1)}</div>
              <div className="set-score">{formatSetScore(s)}</div>
            </div>
          ))}
          {!liveMatch.decided &&
            (inMatchTiebreak ? (
              <div className="set-chip current">
                <div className="set-label">Match-Tiebreak (läuft)</div>
                <div className="set-score">
                  {liveMatch.matchTiebreak.pointsA}:{liveMatch.matchTiebreak.pointsB}
                </div>
              </div>
            ) : (
              <div className="set-chip current">
                <div className="set-label">Satz {liveMatch.sets.length + 1} (läuft)</div>
                <div className="set-score">
                  {liveMatch.gamesA}:{liveMatch.gamesB}
                </div>
                {inTiebreak && (
                  <div className="set-tb">
                    TB {liveMatch.tiebreak.pointsA}:{liveMatch.tiebreak.pointsB}
                  </div>
                )}
              </div>
            ))}
        </div>

        <div className="live-score">
          <div className="side">
            <div className="label">{(playerName || 'SPIELER:IN').toUpperCase()}</div>
            <div className="num">{numA}</div>
          </div>
          <div className="sep">:</div>
          <div className="side">
            <div className="label">{(liveMatch.gegner || 'GEGNERIN').toUpperCase()}</div>
            <div className="num">{numB}</div>
          </div>
        </div>
        <div className="live-score-caption">{caption}</div>

        {inTiebreak && !liveMatch.decided && <div className="live-tiebreak-badge">🎾 Tiebreak bei 6:6</div>}
        {inMatchTiebreak && !liveMatch.decided && (
          <div className="live-tiebreak-badge">🎾 Match-Tiebreak entscheidet (bis 10, 2 Punkte Vorsprung)</div>
        )}
        {liveMatch.decided && (
          <div className="live-decided-banner">
            🏆 Match entschieden: {winner} gewinnt {liveMatch.setsWonA}:{liveMatch.setsWonB} nach Sätzen
          </div>
        )}

        <div className="point-buttons">
          <button className="point-btn" disabled={liveMatch.decided} onClick={() => handlePoint('a')}>
            {pointMode ? '+ Punkt ' + playerName : '+ Spiel ' + playerName}
          </button>
          <button className="point-btn opp" disabled={liveMatch.decided} onClick={() => handlePoint('b')}>
            {pointMode ? '+ Punkt Gegnerin' : '+ Spiel Gegnerin'}
          </button>
        </div>
        <div className="live-subtools">
          <button className="btn btn-ghost btn-sm" onClick={handleUndo}>
            ↩ Rückgängig
          </button>
          <button className="btn btn-clay btn-sm" onClick={handleEnd} disabled={busy}>
            ■ Match beenden
          </button>
        </div>
      </div>

      <div className="live-progress-title">{progressTitle}</div>
      <div className="live-progress-list">
        {listSource.length === 0 ? (
          <span className="live-empty-note">
            {pointMode ? 'Noch keine Punkte erfasst.' : 'Noch keine Spielstände in diesem Satz erfasst.'}
          </span>
        ) : (
          listSource.map((h, i) => (
            <span key={i} className={`live-progress-chip${h.a > h.b ? ' leading-a' : h.b > h.a ? ' leading-b' : ''}`}>
              {h.a}:{h.b}
            </span>
          ))
        )}
      </div>
    </div>
  )
}
