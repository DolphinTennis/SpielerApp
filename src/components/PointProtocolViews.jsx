import { useTranslation } from 'react-i18next'
import {
  derive, gameScoreParts, isOver, labels, pct, pointServer, score, stats,
} from '../lib/pointProtocolLogic'

export const CHIP_KEYS = ['stopfehler', 'selbstgespraech', 'frust', 'schlaegerwurf', 'positiv', 'kaempft']

export function playerNames(playerName, opponent, t) {
  const own = (playerName || '').trim().split(/\s+/)[0] || t('punktprotokoll.player')
  return { own, other: (opponent || '').trim() || t('punktprotokoll.opponent') }
}

export function usePlayerNames(playerName, opponent) {
  const { t } = useTranslation()
  return playerNames(playerName, opponent, t)
}

const setLabel = (s) => (s.ct ? `[${s.a}:${s.b}]` : `${s.a}:${s.b}`)

export function Scoreboard({ match, own, other }) {
  const { t } = useTranslation()
  const d = derive(match)
  const g = match.games[match.games.length - 1]
  const srv = g && !d.over ? pointServer(g) : null
  const showCur = !d.over
  const cols = d.sets.length + (showCur ? 1 : 0)
  const template = `1fr ${'auto '.repeat(cols)}auto`

  const row = (who, name) => {
    let pt = ''
    if (!d.over && g) {
      const { k, o } = score(g)
      if (g.tb) pt = who === 'k' ? k : o
      else if (k >= 3 && o >= 3) pt = k === o ? '40' : (who === 'k' ? (k > o ? 'V' : '40') : (o > k ? 'V' : '40'))
      else pt = [0, 15, 30, 40][Math.min(who === 'k' ? k : o, 3)]
    }
    return (
      <div className="pp-sb-row" style={{ gridTemplateColumns: template }}>
        <div className="pp-sb-name">
          <span className={`pp-srv${srv === who ? '' : ' off'}`} />
          {name}
        </div>
        {d.sets.map((s, i) => (
          <div key={i} className="pp-sb-n g">
            {s.ct ? '[' : ''}
            {who === 'k' ? s.a : s.b}
            {s.ct ? ']' : ''}
          </div>
        ))}
        {showCur && <div className="pp-sb-n g">{who === 'k' ? d.cur.a : d.cur.b}</div>}
        <div className="pp-sb-n p">{pt}</div>
      </div>
    )
  }

  let status = ''
  if (d.over) status = t('punktprotokoll.matchOver')
  else if (g) {
    status = g.tb === 10 ? t('punktprotokoll.champTiebreak') : g.tb === 7 ? t('punktprotokoll.tiebreak') : t('punktprotokoll.setGame', { set: d.sets.length + 1, game: d.cur.games.length })
  }

  return (
    <div className="pp-sb">
      <div className="pp-sb-head" style={{ gridTemplateColumns: template }}>
        <span style={{ textAlign: 'left', minWidth: 0 }} />
        {d.sets.map((_, i) => <span key={i}>{t('punktprotokoll.setShort', { n: i + 1 })}</span>)}
        {showCur && <span>{t('punktprotokoll.setShort', { n: d.sets.length + 1 })}</span>}
        <span>{t('punktprotokoll.points')}</span>
      </div>
      {row('k', own)}
      {row('g', other)}
      <div className="pp-sb-status">
        <span>{status}</span>
        <span>{d.over ? '' : t('punktprotokoll.serving', { name: srv === 'k' ? own : other })}</span>
      </div>
    </div>
  )
}

export function scoreText(g, own, other, t) {
  const p = gameScoreParts(g)
  if (p.tb) return `${p.k} : ${p.o}`
  if (p.deuce !== undefined) return p.deuce ? t('punktprotokoll.deuce') : t('punktprotokoll.advantage', { name: p.adv === 'k' ? own : other })
  return `${p.k} : ${p.o}`
}

function Seq({ game }) {
  const labs = labels(game)
  if (!labs.length) return <span className="pp-muted">–</span>
  return labs.map((l, i) => (
    <span key={i} className={l.cls === 'w' ? 'pp-plus' : l.cls === 'l' ? 'pp-minus' : 'pp-e'}>
      {l.txt}
      {l.sup && <sup>{l.sup}</sup>}{' '}
    </span>
  ))
}
export { Seq as GameSequence }

// Punktprotokoll wie der Papierbogen: je Satz eine Tabelle, je Spiel eine Zeile.
export function ProtocolTable({ match, own, other, onEditGame }) {
  const { t } = useTranslation()
  const d = derive(match)
  const all = d.sets.concat(d.cur.games.length ? [d.cur] : [])
  return all.map((s, si) => {
    let a = 0
    let b = 0
    return (
      <div key={si}>
        <div className="pp-setcap">
          {s.ct ? t('punktprotokoll.champTiebreak') : t('punktprotokoll.setN', { n: si + 1 })}
          <span>{s.done ? setLabel(s) : t('punktprotokoll.running')}</span>
        </div>
        <table className="pp-tbl">
          <thead>
            <tr>
              <th>{t('punktprotokoll.colGame')}</th>
              <th>{t('punktprotokoll.colServe')}</th>
              <th>{t('punktprotokoll.colPoints')}</th>
              <th>{t('punktprotokoll.colScore')}</th>
              <th>{t('punktprotokoll.colNotes')}</th>
            </tr>
          </thead>
          <tbody>
            {s.games.map((g, i) => {
              if (isOver(g)) {
                const { k, o } = score(g)
                if (k > o) a++
                else b++
              }
              const { k, o } = score(g)
              return (
                <tr key={i} className={onEditGame ? 'click' : ''} onClick={onEditGame ? () => onEditGame(match.games.indexOf(g)) : undefined}>
                  <td>{i + 1}</td>
                  <td><span className={`pp-srvdot${g.server === 'k' ? '' : ' o'}`} title={g.server === 'k' ? own : other} /></td>
                  <td className="pp-seq"><Seq game={g} /></td>
                  <td>{s.ct ? `${k}:${o}` : isOver(g) ? `${a}:${b}` : '…'}</td>
                  <td>
                    {(g.chips || []).map((c) => <span key={c} className="pp-tag">{t(`punktprotokoll.chips.${c}`)}</span>)}
                    {g.note}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    )
  })
}

export function ErrorCard({ s, own, other }) {
  const { t } = useTranslation()
  const e = s.err
  const inField = (f, n) => (n ? t('punktprotokoll.inField', { pct: Math.round(((n - f) / n) * 100) }) : '–')
  return (
    <div className="pp-card">
      <div className="pp-cardtitle"><span>{t('punktprotokoll.errorsTitle')}</span><span>{own} · {other}</span></div>
      <table className="pp-errtbl">
        <thead><tr><th /><th>{own}</th><th>{other}</th></tr></thead>
        <tbody>
          <tr><td>{t('punktprotokoll.doubleFault')}</td><td><b>{e.dfK}</b></td><td><b>{e.dfG}</b></td></tr>
          <tr><td>{t('punktprotokoll.returnError')}</td><td><b>{e.rfK}</b></td><td><b>{e.rfG}</b></td></tr>
          <tr>
            <td>
              {t('punktprotokoll.firstServeFault')}
              <small>{t('punktprotokoll.firstServeIn')}: {inField(e.f1K, e.srvK)} ({own}) · {inField(e.f1G, e.srvG)} ({other})</small>
            </td>
            <td><b>{e.f1K}</b><small>{t('punktprotokoll.ofN', { n: e.srvK })}</small></td>
            <td><b>{e.f1G}</b><small>{t('punktprotokoll.ofN', { n: e.srvG })}</small></td>
          </tr>
          <tr><td>{t('punktprotokoll.winner')}</td><td><b>{e.wK}</b></td><td><b>{e.wG}</b></td></tr>
        </tbody>
      </table>
    </div>
  )
}

// Die Auswertung mit den sechs Prozent-Kennzahlen, Fehlerkarte und Punkten je Satz.
export function StatsView({ match, own, other }) {
  const { t } = useTranslation()
  const s = stats(match)
  const d = derive(match)
  return (
    <>
      <p className="pp-sub">
        {t('punktprotokoll.statsSub', { count: s.total })}
        {d.over ? '' : ` ${t('punktprotokoll.stillRunning')}`}
      </p>
      <div className="pp-kpis">
        <div className="pp-kpi"><div className="v">{pct(s.won, s.total)}</div><div className="t">{t('punktprotokoll.kpiWon')}</div><div className="h">{t('punktprotokoll.ofTotal', { a: s.won, b: s.total })}</div></div>
        <div className="pp-kpi"><div className="v">{pct(s.afterLostWon, s.afterLost)}</div><div className="t">{t('punktprotokoll.kpiAfterLost')}</div><div className="h">{t('punktprotokoll.ofTotal', { a: s.afterLostWon, b: s.afterLost })} · {t('punktprotokoll.kpiAfterLostHint')}</div></div>
        <div className="pp-kpi"><div className="v">{pct(s.dzw, s.dz)}</div><div className="t">{t('punktprotokoll.kpiDeuce')}</div><div className="h">{t('punktprotokoll.ofTotal', { a: s.dzw, b: s.dz })} · {t('punktprotokoll.kpiDeuceHint')}</div></div>
        <div className="pp-kpi"><div className="v">{s.best}</div><div className="t">{t('punktprotokoll.kpiStreak')}</div><div className="h">{t('punktprotokoll.kpiStreakHint')}</div></div>
        <div className="pp-kpi"><div className="v">{pct(s.ownW, s.own)}</div><div className="t">{t('punktprotokoll.kpiOwnServe')}</div><div className="h">{t('punktprotokoll.holdLine', { a: s.hold, b: s.holdN })}</div></div>
        <div className="pp-kpi"><div className="v">{pct(s.opW, s.op)}</div><div className="t">{t('punktprotokoll.kpiOppServe')}</div><div className="h">{t('punktprotokoll.breakLine', { a: s.brk, b: s.brkN })}</div></div>
      </div>
      <ErrorCard s={s} own={own} other={other} />
      <div className="pp-card">
        <div className="pp-cardtitle"><span>{t('punktprotokoll.pointsPerSet')}</span></div>
        {s.perSet.map((p) => (
          <div key={p.idx}>
            <div className="pp-sethdr"><span><b>{t('punktprotokoll.setN', { n: p.idx + 1 })}</b> {p.label}</span><span>{pct(p.w, p.n)} {t('punktprotokoll.pointsWord')}</span></div>
            <div className="pp-bar"><i style={{ width: `${p.n ? Math.round((p.w / p.n) * 100) : 0}%` }} /></div>
          </div>
        ))}
      </div>
    </>
  )
}
