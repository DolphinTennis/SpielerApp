import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation()
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
        toast(t('liveTicker.loadFailed'))
        if (!cancelled) setLiveMatch(null)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  // Shows the new score straight away — courtside that responsiveness matters —
  // but a failed save must not leave the two out of step. Previously the point
  // stayed on screen while the database never got it, so the next reload
  // quietly rolled the match back: exactly the "I couldn't click any further"
  // symptom, with points vanishing rather than any button being disabled.
  // On failure we go back to the last state known to be stored and say so,
  // including what the database actually complained about.
  async function persist(next) {
    const previous = liveMatch
    setLiveMatch(next)
    try {
      await saveLiveMatch(userId, orgId, next)
      return true
    } catch (err) {
      console.error(err)
      setLiveMatch(previous)
      toast(err?.message ? t('liveTicker.saveFailedDetail', { detail: err.message }) : t('liveTicker.saveFailed'))
      return false
    }
  }

  async function handleStart() {
    setBusy(true)
    try {
      const next = blankLiveMatch({ datum: setupDate, gegner: setupOpp, turnier: setupTourn, mode: setupMode })
      await saveLiveMatch(userId, orgId, next)
      setLiveMatch(next)
      toast(t('liveTicker.started'))
    } catch (err) {
      console.error(err)
      toast(t('liveTicker.startFailed'))
    } finally {
      setBusy(false)
    }
  }

  async function handlePoint(side) {
    if (!liveMatch || liveMatch.decided) return
    const { next, message } = addLivePoint(liveMatch, side)
    const ok = await persist(next)
    // Only announce "set over"/"tiebreak starts" once it is actually stored —
    // otherwise the message claims something the rolled-back state contradicts.
    if (ok && message) toast(message)
  }

  async function handleUndo() {
    if (!liveMatch?.snapshots?.length) return
    const next = undoLivePoint(liveMatch)
    await persist(next)
  }

  async function handleEnd() {
    if (!liveMatch) return

    // "Beenden" sits next to "Rückgängig" and is irreversible: it writes the
    // match record and clears the live state. When the match is genuinely
    // decided that is what you want, so don't nag. While a set is still
    // running, name the score being frozen — a mis-tap there costs the rest of
    // the match.
    if (!liveMatch.decided) {
      const stand = liveMatch.matchTiebreak
        ? `${liveMatch.matchTiebreak.pointsA}:${liveMatch.matchTiebreak.pointsB}`
        : liveMatch.tiebreak
          ? `${liveMatch.tiebreak.pointsA}:${liveMatch.tiebreak.pointsB}`
          : `${liveMatch.gamesA}:${liveMatch.gamesB}`
      const satz = liveMatch.sets.length + 1
      if (!window.confirm(t('liveTicker.confirmEndUnfinished', { satz, stand }))) return
    }

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
      toast(t('liveTicker.matchEnded'))
      onMatchCreated(saved.id)
    } catch (err) {
      console.error(err)
      toast(t('liveTicker.endFailed'))
    } finally {
      setBusy(false)
    }
  }

  if (liveMatch === undefined) return null

  if (!liveMatch || !liveMatch.active) {
    return (
      <div className="view">
        <h1 className="section-title">{t('liveTicker.title')}</h1>
        <p className="section-sub">{t('liveTicker.subtitle', { name: playerName })}</p>

        <div className="live-setup-card">
          <h3 style={{ fontSize: 19, color: 'var(--ink)', margin: '0 0 4px' }}>{t('liveTicker.newMatchTitle')}</h3>
          <p style={{ fontSize: 13, color: 'var(--text-soft)', margin: 0 }}>{t('liveTicker.newMatchHint')}</p>
          <div className="grid-fields">
            <div className="field">
              <label htmlFor="live-date">{t('liveTicker.matchDate')}</label>
              <input id="live-date" type="date" value={setupDate} onChange={(e) => setSetupDate(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="live-opp">{t('liveTicker.opponentName')}</label>
              <input
                id="live-opp"
                type="text"
                placeholder={t('liveTicker.opponentPlaceholder')}
                value={setupOpp}
                onChange={(e) => setSetupOpp(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="live-tourn">{t('liveTicker.tournament')}</label>
              <input
                id="live-tourn"
                type="text"
                placeholder={t('liveTicker.tournamentPlaceholder')}
                value={setupTourn}
                onChange={(e) => setSetupTourn(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="live-satzmodus">{t('liveTicker.setMode')}</label>
              <select id="live-satzmodus" value={setupMode} onChange={(e) => setSetupMode(e.target.value)}>
                <option value="bo3">{t('liveTicker.bo3')}</option>
                <option value="matchtiebreak">{t('liveTicker.matchTiebreak')}</option>
              </select>
            </div>
          </div>
          <button className="btn btn-primary" onClick={handleStart} disabled={busy}>
            {t('liveTicker.startTracking')}
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
  let caption = t('liveTicker.gamesInSet')
  if (inMatchTiebreak) {
    numA = liveMatch.matchTiebreak.pointsA
    numB = liveMatch.matchTiebreak.pointsB
    caption = t('liveTicker.pointsInMatchTiebreak')
  } else if (inTiebreak) {
    numA = liveMatch.tiebreak.pointsA
    numB = liveMatch.tiebreak.pointsB
    caption = t('liveTicker.pointsInTiebreak')
  }

  let listSource, progressTitle
  if (inMatchTiebreak) {
    listSource = liveMatch.matchTiebreak.history
    progressTitle = t('liveTicker.matchTiebreakPoints')
  } else if (inTiebreak) {
    listSource = liveMatch.tiebreak.history
    progressTitle = t('liveTicker.tiebreakPointsSet', { n: liveMatch.sets.length + 1 })
  } else {
    listSource = liveMatch.history
    progressTitle = t('liveTicker.matchProgressSet', { n: liveMatch.sets.length + (liveMatch.decided ? 0 : 1) })
  }

  const winner = liveMatch.decided
    ? liveMatch.setsWonA > liveMatch.setsWonB
      ? playerName
      : liveMatch.gegner || t('liveTicker.opponentPlaceholder')
    : null

  return (
    <div className="view">
      <h1 className="section-title">{t('liveTicker.title')}</h1>
      <p className="section-sub">{t('liveTicker.subtitle', { name: playerName })}</p>

      <div className="live-hero">
        <div className="matchup">
          {playerName} vs. {liveMatch.gegner || '—'}
          {liveMatch.turnier ? ' · ' + liveMatch.turnier : ''}
        </div>

        <div className="sets-row">
          {liveMatch.sets.map((s, i) => (
            <div className={`set-chip ${s.a > s.b ? 'won-a' : 'won-b'}`} key={i}>
              <div className="set-label">{s.matchTiebreak ? t('liveTicker.matchTiebreak') : t('liveTicker.set', { n: i + 1 })}</div>
              <div className="set-score">{formatSetScore(s)}</div>
            </div>
          ))}
          {!liveMatch.decided &&
            (inMatchTiebreak ? (
              <div className="set-chip current">
                <div className="set-label">{t('liveTicker.matchTiebreakRunning')}</div>
                <div className="set-score">
                  {liveMatch.matchTiebreak.pointsA}:{liveMatch.matchTiebreak.pointsB}
                </div>
              </div>
            ) : (
              <div className="set-chip current">
                <div className="set-label">{t('liveTicker.setRunning', { n: liveMatch.sets.length + 1 })}</div>
                <div className="set-score">
                  {liveMatch.gamesA}:{liveMatch.gamesB}
                </div>
                {inTiebreak && (
                  <div className="set-tb">
                    {t('liveTicker.tiebreakAbbrev', { a: liveMatch.tiebreak.pointsA, b: liveMatch.tiebreak.pointsB })}
                  </div>
                )}
              </div>
            ))}
        </div>

        <div className="live-score">
          <div className="side">
            <div className="label">{(playerName || t('liveTicker.playerLabelFallback')).toUpperCase()}</div>
            <div className="num">{numA}</div>
          </div>
          <div className="sep">:</div>
          <div className="side">
            <div className="label">{(liveMatch.gegner || t('liveTicker.opponentLabelFallback')).toUpperCase()}</div>
            <div className="num">{numB}</div>
          </div>
        </div>
        <div className="live-score-caption">{caption}</div>

        {inTiebreak && !liveMatch.decided && <div className="live-tiebreak-badge">{t('liveTicker.tiebreakBadge')}</div>}
        {inMatchTiebreak && !liveMatch.decided && <div className="live-tiebreak-badge">{t('liveTicker.matchTiebreakBadge')}</div>}
        {liveMatch.decided && (
          <div className="live-decided-banner">
            {t('liveTicker.decidedBanner', { winner, a: liveMatch.setsWonA, b: liveMatch.setsWonB })}
          </div>
        )}

        <div className="point-buttons">
          <button className="point-btn" disabled={liveMatch.decided} onClick={() => handlePoint('a')}>
            {pointMode ? t('liveTicker.pointFor', { name: playerName }) : t('liveTicker.gameFor', { name: playerName })}
          </button>
          <button className="point-btn opp" disabled={liveMatch.decided} onClick={() => handlePoint('b')}>
            {pointMode
              ? t('liveTicker.pointFor', { name: t('liveTicker.opponentPlaceholder') })
              : t('liveTicker.gameFor', { name: t('liveTicker.opponentPlaceholder') })}
          </button>
        </div>
        <div className="live-subtools">
          <button className="btn btn-ghost btn-sm" onClick={handleUndo}>
            {t('liveTicker.undo')}
          </button>
          <button className="btn btn-clay btn-sm" onClick={handleEnd} disabled={busy}>
            {t('liveTicker.endMatch')}
          </button>
        </div>
      </div>

      <div className="live-progress-title">{progressTitle}</div>
      <div className="live-progress-list">
        {listSource.length === 0 ? (
          <span className="live-empty-note">{pointMode ? t('liveTicker.noPointsYet') : t('liveTicker.noGamesYet')}</span>
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
