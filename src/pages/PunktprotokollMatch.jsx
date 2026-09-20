import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { getProtocol, saveProtocolState, updateProtocol } from '../lib/pointProtocolApi'
import { addPoint, derive, ensureGame, labels, pointServer, resultText, undoPoint, verlaufText } from '../lib/pointProtocolLogic'
import { blankMatch, createMatch } from '../lib/matchesApi'
import { useAuth } from '../lib/AuthContext'
import { useOrg } from '../lib/OrgContext'
import { useToast } from '../lib/ToastContext'
import {
  CHIP_KEYS, GameSequence, ProtocolTable, Scoreboard, StatsView, scoreText, usePlayerNames,
} from '../components/PointProtocolViews'

const SAVE_DELAY_MS = 600

function GameNoteSheet({ game, index, onChange, onClose }) {
  const { t } = useTranslation()
  const toggle = (c) => onChange({ chips: game.chips.includes(c) ? game.chips.filter((x) => x !== c) : [...game.chips, c] })
  return (
    <div className="pp-scrim" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="pp-sheet" role="dialog" aria-modal="true">
        <h3>{t('punktprotokoll.noteSheetTitle', { n: index + 1 })}</h3>
        <div className="pp-seq pp-sheet-seq"><GameSequence game={game} /></div>
        <div className="pp-chiprow">
          {CHIP_KEYS.map((c) => (
            <button key={c} type="button" className={`pp-chip${game.chips.includes(c) ? ' on' : ''}`} onClick={() => toggle(c)}>
              {t(`punktprotokoll.chips.${c}`)}
            </button>
          ))}
        </div>
        <input type="text" className="pp-input" style={{ marginTop: 12 }} placeholder={t('punktprotokoll.notePlaceholder')} value={game.note} onChange={(e) => onChange({ note: e.target.value })} />
        <button type="button" className="btn btn-primary" style={{ marginTop: 12, width: '100%' }} onClick={onClose}>{t('punktprotokoll.done')}</button>
      </div>
    </div>
  )
}

export default function PunktprotokollMatch({ protocolId, onBack, onOpenMatch }) {
  const { t } = useTranslation()
  const { session } = useAuth()
  const { orgId, playerName } = useOrg()
  const toast = useToast()
  const [row, setRow] = useState(null)
  const [match, setMatch] = useState(null)
  const [tab, setTab] = useState('live')
  const [f1, setF1] = useState(false)
  const [sheet, setSheet] = useState(null)
  const [saveState, setSaveState] = useState('saved')
  const dirty = useRef(false)
  const latest = useRef(null)
  latest.current = match

  useEffect(() => {
    let cancelled = false
    getProtocol(protocolId)
      .then((r) => {
        if (cancelled) return
        const m = { firstServer: r.first_server, mode: r.mode, games: r.state?.games || [] }
        if (m.games.length === 0) ensureGame(m)
        setRow(r)
        setMatch(m)
      })
      .catch((err) => {
        console.error(err)
        toast(t('punktprotokoll.loadFailed'))
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [protocolId])

  const flush = useCallback(async () => {
    if (!dirty.current || !latest.current) return
    dirty.current = false
    setSaveState('saving')
    try {
      await saveProtocolState(protocolId, latest.current.games)
      setSaveState(dirty.current ? 'saving' : 'saved')
    } catch (err) {
      console.error(err)
      dirty.current = true
      setSaveState('error')
    }
  }, [protocolId])

  // Jede Änderung wird kurz gesammelt und dann gespeichert; beim Verlassen
  // der Seite oder Wegwischen des Tabs wird sofort geschrieben.
  useEffect(() => {
    if (!dirty.current) return undefined
    const id = setTimeout(flush, SAVE_DELAY_MS)
    return () => clearTimeout(id)
  }, [match, flush])
  useEffect(() => {
    const onHide = () => document.visibilityState === 'hidden' && flush()
    document.addEventListener('visibilitychange', onHide)
    return () => {
      document.removeEventListener('visibilitychange', onHide)
      flush()
    }
  }, [flush])

  function mutate(fn) {
    const next = structuredClone(latest.current)
    fn(next)
    dirty.current = true
    setSaveState('saving')
    setMatch(next)
  }

  const names = usePlayerNames(playerName, row?.opponent)
  const d = useMemo(() => (match ? derive(match) : null), [match])
  if (!row || !match) return <div className="view"><p className="section-sub">{t('common.loading')}</p></div>

  const g = match.games[match.games.length - 1]
  const server = g ? pointServer(g) : 'k'
  const serverName = server === 'k' ? names.own : names.other
  const returnerName = server === 'k' ? names.other : names.own

  function point(ownWon, meta) {
    mutate((m) => addPoint(m, ownWon, meta))
    setF1(false)
    if (navigator.vibrate) navigator.vibrate(12)
  }
  // Doppelfehler: der Aufschläger verliert. Returnfehler: der Aufschläger gewinnt.
  const doubleFault = () => point(server === 'g', { kind: 'df', f1: true })
  const returnError = () => point(server === 'k', { kind: 'rf', f1 })

  function patchGame(index, patch) {
    mutate((m) => Object.assign(m.games[index], patch))
  }

  // Legt aus dem Protokoll eine Matchanalyse an (Ergebnis und Spielverlauf im
  // gleichen Textformat wie beim Matchticker) und verknüpft beide.
  async function handleTransfer() {
    if (!window.confirm(t('punktprotokoll.transferConfirm'))) return
    try {
      await flush()
      const record = {
        ...blankMatch(session.user.id, orgId, playerName),
        datum: row.match_date || '',
        gegner: row.opponent,
        turnier: row.place,
        ergebnis: resultText(latest.current),
        verlauf: verlaufText(latest.current),
      }
      const created = await createMatch(record)
      await updateProtocol(protocolId, { match_id: created.id })
      toast(t('punktprotokoll.transferred'))
      onOpenMatch(created.id)
    } catch (err) {
      console.error(err)
      toast(t('punktprotokoll.transferFailed'))
    }
  }

  async function saveHead(patch) {
    try {
      setRow(await updateProtocol(protocolId, patch))
    } catch (err) {
      console.error(err)
      toast(t('punktprotokoll.saveFailed'))
    }
  }

  const finishBox = d.over && (
    <div className="pp-finish">
      🏁 {t('punktprotokoll.finished', { name: d.sk > d.so ? names.own : names.other })}
    </div>
  )

  const labs = g ? labels(g) : []

  return (
    <div className="view pp">
      <h1 className="section-title">{t('punktprotokoll.title')}</h1>
      <p className="section-sub">
        {names.other}
        {row.match_date ? ` · ${row.match_date.split('-').reverse().join('.')}` : ''}
        {row.place ? ` · ${row.place}` : ''}
        <span className={`pp-save pp-save--${saveState}`}>{t(`punktprotokoll.save.${saveState}`)}</span>
      </p>

      <div className="pp-tabs" role="tablist">
        {['live', 'protocol', 'stats'].map((k) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>
            <span>{{ live: '⚡', protocol: '📋', stats: '📊' }[k]}</span>
            {t(`punktprotokoll.tab.${k}`)}
          </button>
        ))}
      </div>

      {tab === 'live' && (
        <>
          {finishBox}
          <Scoreboard match={match} own={names.own} other={names.other} />
          {!d.over && g && (
            <>
              <div className="pp-gamehead"><h3>{t('punktprotokoll.currentGame')}</h3><span>{scoreText(g, names.own, names.other, t)}</span></div>
              <div className="pp-chips">
                {labs.length ? labs.map((l, i) => <div key={i} className={`pp-pt ${l.cls}`}>{l.txt}{l.sup && <sup>{l.sup}</sup>}</div>) : <div className="pp-empty">{t('punktprotokoll.noPointsYet')}</div>}
              </div>
              <div className="pp-btnrow">
                <button type="button" className="pp-pbtn win" onClick={() => point(true, f1 ? { f1: true } : {})}>
                  <span className="sign">+</span>{t('punktprotokoll.pointFor', { name: names.own })}<small>{t('punktprotokoll.pointWon')}</small>
                </button>
                <button type="button" className="pp-pbtn lose" onClick={() => point(false, f1 ? { f1: true } : {})}>
                  <span className="sign">−</span>{t('punktprotokoll.pointFor', { name: names.other })}<small>{t('punktprotokoll.pointLost')}</small>
                </button>
              </div>
              <div className="pp-card pp-detail">
                <div className="pp-cardtitle"><span>{t('punktprotokoll.detailsTitle')}</span><span>{t('punktprotokoll.optional')}</span></div>
                <button type="button" className={`pp-f1btn${f1 ? ' on' : ''}`} onClick={() => setF1((v) => !v)}>
                  <b>{f1 ? '✓ ' : ''}{t('punktprotokoll.firstServeFault')}</b>
                  <small>{t('punktprotokoll.firstServeHint', { name: serverName })}</small>
                </button>
                <div className="pp-row2">
                  <button type="button" className="pp-dbtn" onClick={doubleFault}><b>{t('punktprotokoll.doubleFault')}</b><small>{serverName} → {t('punktprotokoll.pointOf', { name: returnerName })}</small></button>
                  <button type="button" className="pp-dbtn" onClick={returnError}><b>{t('punktprotokoll.returnError')}</b><small>{returnerName} → {t('punktprotokoll.pointOf', { name: serverName })}</small></button>
                </div>
                <div className="pp-row2">
                  <button type="button" className="pp-dbtn" onClick={() => point(true, { kind: 'w', ...(f1 ? { f1: true } : {}) })}><b>{t('punktprotokoll.winner')} {names.own}</b><small>{t('punktprotokoll.winnerHint')}</small></button>
                  <button type="button" className="pp-dbtn" onClick={() => point(false, { kind: 'w', ...(f1 ? { f1: true } : {}) })}><b>{t('punktprotokoll.winner')} {names.other}</b><small>{t('punktprotokoll.winnerHint')}</small></button>
                </div>
                <p className="pp-dhint">{t('punktprotokoll.detailsHint')}</p>
              </div>
              <div className="pp-undo"><button type="button" className="btn btn-ghost" onClick={() => { mutate((m) => undoPoint(m)); setF1(false) }}>↶ {t('punktprotokoll.undo')}</button></div>
              <div className="pp-card" style={{ marginTop: 14 }}>
                <div className="pp-cardtitle"><span>{t('punktprotokoll.gameObservation')}</span><span>{t('punktprotokoll.optional')}</span></div>
                <div className="pp-chiprow">
                  {CHIP_KEYS.map((c) => (
                    <button key={c} type="button" className={`pp-chip${g.chips.includes(c) ? ' on' : ''}`} onClick={() => patchGame(match.games.length - 1, { chips: g.chips.includes(c) ? g.chips.filter((x) => x !== c) : [...g.chips, c] })}>
                      {t(`punktprotokoll.chips.${c}`)}
                    </button>
                  ))}
                </div>
                <input type="text" className="pp-input" style={{ marginTop: 10 }} placeholder={t('punktprotokoll.notePlaceholder')} value={g.note} onChange={(e) => patchGame(match.games.length - 1, { note: e.target.value })} />
              </div>
            </>
          )}
        </>
      )}

      {tab === 'protocol' && (
        <>
          <p className="pp-sub">
            <span className="pp-srvdot" /> {t('punktprotokoll.legendOwn', { name: names.own })} &nbsp; <span className="pp-srvdot o" /> {t('punktprotokoll.legendOther', { name: names.other })} · {t('punktprotokoll.tapRowHint')}
          </p>
          <ProtocolTable match={match} own={names.own} other={names.other} onEditGame={(i) => setSheet(i)} />
        </>
      )}

      {tab === 'stats' && <StatsView match={match} own={names.own} other={names.other} />}

      <details className="pp-card pp-head-edit">
        <summary>{t('punktprotokoll.editDetails')}</summary>
        <label className="pp-l">{t('punktprotokoll.opponentLabel')}</label>
        <input className="pp-input" type="text" defaultValue={row.opponent} onBlur={(e) => e.target.value !== row.opponent && saveHead({ opponent: e.target.value })} />
        <label className="pp-l">{t('punktprotokoll.dateLabel')}</label>
        <input className="pp-input" type="date" defaultValue={row.match_date || ''} onBlur={(e) => e.target.value !== (row.match_date || '') && saveHead({ match_date: e.target.value })} />
        <label className="pp-l">{t('punktprotokoll.placeLabel')}</label>
        <input className="pp-input" type="text" defaultValue={row.place} onBlur={(e) => e.target.value !== row.place && saveHead({ place: e.target.value })} />
      </details>

      <div className="pp-card pp-transfer">
        {row.match_id ? (
          <>
            <p>{t('punktprotokoll.linkedInfo')}</p>
            <button type="button" className="btn btn-outline" onClick={() => onOpenMatch(row.match_id)}>{t('punktprotokoll.openAnalysis')}</button>
          </>
        ) : (
          <>
            <p>{t('punktprotokoll.transferInfo')}</p>
            <button type="button" className="btn btn-primary" onClick={handleTransfer}>{t('punktprotokoll.transfer')}</button>
          </>
        )}
      </div>

      <div className="pp-back"><button type="button" className="btn btn-ghost" onClick={async () => { await flush(); onBack() }}>← {t('punktprotokoll.backToList')}</button></div>

      {sheet !== null && match.games[sheet] && (
        <GameNoteSheet game={match.games[sheet]} index={sheet} onChange={(patch) => patchGame(sheet, patch)} onClose={() => setSheet(null)} />
      )}
    </div>
  )
}
