// Druckansicht der Punktanalyse (Formular 3 der Matchanalyse): Kennzahlen,
// Fehlerkarte, Punkte je Satz und das Protokoll wie auf dem Papierbogen.
// Bewusst mit Inline-Stilen und ohne auf Hintergrundfarben angewiesen zu sein,
// weil Browser diese beim Drucken standardmäßig weglassen.
import { buildHeaderHtml } from './matchExport'
import { derive, isOver, labels, pct, score, stats } from './pointProtocolLogic'

const CHIP_LABELS = {
  stopfehler: 'Stopfehler',
  selbstgespraech: 'Selbstgespräch',
  frust: 'Frust',
  schlaegerwurf: 'Schlägerwurf',
  positiv: 'Positiv',
  kaempft: 'Kämpft',
}

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))

const TH = 'text-align:left;font-size:10.5px;text-transform:uppercase;letter-spacing:0.4px;color:#1C63B7;border-bottom:2px solid #1C63B7;padding:5px 6px;'
const TD = 'font-size:12px;padding:5px 6px;border-bottom:1px solid #D7DEE6;vertical-align:top;'

function kpi(value, title, hint) {
  return `<td style="width:33.3%;padding:8px 10px;border:1px solid #D7DEE6;vertical-align:top;">
    <div style="font-size:24px;font-weight:700;color:#1C63B7;line-height:1.1;">${esc(value)}</div>
    <div style="font-size:11.5px;margin-top:3px;">${esc(title)}</div>
    <div style="font-size:10.5px;color:#5B6875;margin-top:3px;">${esc(hint)}</div></td>`
}

function statsHtml(m, own, other) {
  const s = stats(m)
  const e = s.err
  const inField = (f, n) => (n ? `${Math.round(((n - f) / n) * 100)} % im Feld` : '–')
  const setBars = s.perSet
    .map((p) => {
      const w = p.n ? Math.round((p.w / p.n) * 100) : 0
      return `<div style="margin-top:8px;page-break-inside:avoid;">
        <div style="display:flex;justify-content:space-between;font-size:12px;"><span><b>${p.idx + 1}. Satz</b> ${esc(p.label)}</span><span>${pct(p.w, p.n)} Punkte (${p.w} von ${p.n})</span></div>
        <div style="height:9px;border:1px solid #1C63B7;margin-top:3px;"><div style="height:100%;width:${w}%;background:#1C63B7;-webkit-print-color-adjust:exact;print-color-adjust:exact;"></div></div></div>`
    })
    .join('')
  return `
    <h2 style="font-size:17px;border-bottom:1px solid #D7DEE6;padding-bottom:4px;margin-top:22px;">Auswertung — ${s.total} gespielte Punkte</h2>
    <table style="width:100%;border-collapse:separate;border-spacing:6px;margin:0 -6px;">
      <tr>
        ${kpi(pct(s.won, s.total), 'Punkte gewonnen', `${s.won} von ${s.total}`)}
        ${kpi(pct(s.afterLostWon, s.afterLost), 'Nächster Punkt nach verlorenem Punkt gewonnen', `${s.afterLostWon} von ${s.afterLost}`)}
        ${kpi(pct(s.dzw, s.dz), 'Punkte bei Einstand / Vorteil gewonnen', `${s.dzw} von ${s.dz}`)}
      </tr>
      <tr>
        ${kpi(String(s.best), 'Längste Serie verlorener Punkte in Folge', 'Hinweis auf Einbrüche')}
        ${kpi(pct(s.ownW, s.own), 'Punkte bei eigenem Aufschlag', `Aufschlagspiele gehalten: ${s.hold} von ${s.holdN}`)}
        ${kpi(pct(s.opW, s.op), 'Punkte bei gegnerischem Aufschlag', `Breaks: ${s.brk} von ${s.brkN}`)}
      </tr>
    </table>
    <h3 style="font-size:14px;color:#1C63B7;margin:16px 0 4px;">Fehler und Winner</h3>
    <table style="width:100%;border-collapse:collapse;page-break-inside:avoid;">
      <tr><th style="${TH}"></th><th style="${TH}text-align:right;">${esc(own)}</th><th style="${TH}text-align:right;">${esc(other)}</th></tr>
      <tr><td style="${TD}">Doppelfehler</td><td style="${TD}text-align:right;"><b>${e.dfK}</b></td><td style="${TD}text-align:right;"><b>${e.dfG}</b></td></tr>
      <tr><td style="${TD}">Returnfehler</td><td style="${TD}text-align:right;"><b>${e.rfK}</b></td><td style="${TD}text-align:right;"><b>${e.rfG}</b></td></tr>
      <tr><td style="${TD}">1. Aufschlagfehler<div style="font-size:10.5px;color:#5B6875;">1. Aufschlag: ${inField(e.f1K, e.srvK)} (${esc(own)}) · ${inField(e.f1G, e.srvG)} (${esc(other)})</div></td>
        <td style="${TD}text-align:right;"><b>${e.f1K}</b> von ${e.srvK}</td><td style="${TD}text-align:right;"><b>${e.f1G}</b> von ${e.srvG}</td></tr>
      <tr><td style="${TD}">Winner</td><td style="${TD}text-align:right;"><b>${e.wK}</b></td><td style="${TD}text-align:right;"><b>${e.wG}</b></td></tr>
    </table>
    <h3 style="font-size:14px;color:#1C63B7;margin:16px 0 0;">Punkte pro Satz</h3>${setBars}`
}

function sequenceHtml(g) {
  const labs = labels(g)
  if (!labs.length) return '–'
  return labs
    .map((l) => {
      const color = l.cls === 'w' ? '#3f6a0a' : l.cls === 'l' ? '#c0392b' : '#1C63B7'
      return `<span style="color:${color};font-weight:700;">${l.txt}${l.sup ? `<sup style="font-size:7px;">${l.sup}</sup>` : ''}</span>`
    })
    .join(' ')
}

function protocolHtml(m, own, other) {
  const d = derive(m)
  const all = d.sets.concat(d.cur.games.some((g) => g.pts.length) ? [d.cur] : [])
  const tables = all
    .map((s, si) => {
      let a = 0
      let b = 0
      const rows = s.games
        .filter((g) => g.pts.length)
        .map((g, i) => {
          const { k, o } = score(g)
          if (isOver(g)) {
            if (k > o) a++
            else b++
          }
          const chips = (g.chips || []).map((c) => CHIP_LABELS[c] || c).join(', ')
          const obs = [chips, g.note].filter(Boolean).join(' — ')
          return `<tr style="page-break-inside:avoid;">
            <td style="${TD}">${i + 1}</td>
            <td style="${TD}text-align:center;" title="${esc(g.server === 'k' ? own : other)}">${g.server === 'k' ? '●' : '○'}</td>
            <td style="${TD}font-family:'Courier New',monospace;letter-spacing:0.5px;line-height:1.6;">${sequenceHtml(g)}</td>
            <td style="${TD}white-space:nowrap;">${s.ct ? `${k}:${o}` : isOver(g) ? `${a}:${b}` : '…'}</td>
            <td style="${TD}">${esc(obs)}</td></tr>`
        })
        .join('')
      const title = s.ct ? 'Champions-Tiebreak' : `${si + 1}. Satz`
      const result = s.done ? (s.ct ? `[${s.a}:${s.b}]` : `${s.a}:${s.b}`) : 'läuft'
      return `<div style="margin-top:14px;">
        <div style="display:flex;justify-content:space-between;font-weight:700;font-size:14px;border-bottom:2px solid #1C63B7;padding-bottom:3px;page-break-after:avoid;"><span>${title}</span><span style="color:#1C63B7;">${result}</span></div>
        <table style="width:100%;border-collapse:collapse;">
          <tr><th style="${TH}width:34px;">Sp.</th><th style="${TH}width:34px;text-align:center;">Aufs.</th><th style="${TH}">Punktverlauf</th><th style="${TH}width:48px;">Stand</th><th style="${TH}">Beobachtung</th></tr>
          ${rows}
        </table></div>`
    })
    .join('')
  return `
    <h2 style="font-size:17px;border-bottom:1px solid #D7DEE6;padding-bottom:4px;margin-top:26px;">Punktprotokoll</h2>
    <p style="font-size:11px;color:#5B6875;margin:4px 0 0;">● ${esc(own)} schlägt auf &nbsp; ○ ${esc(other)} schlägt auf &nbsp;·&nbsp; DF Doppelfehler, RF Returnfehler, W Winner</p>
    ${tables}`
}

export function buildForm3Html(rec, pointProtocol) {
  const fileName = 'Matchanalyse ' + (rec.gegner || 'Unbekannt') + ' — Punktanalyse'
  const body = pointProtocol
    ? statsHtml(pointProtocol.match, pointProtocol.own, pointProtocol.other) + protocolHtml(pointProtocol.match, pointProtocol.own, pointProtocol.other)
    : '<p style="font-size:13px;color:#5B6875;">Zu diesem Match ist kein Punktprotokoll verknüpft.</p>'
  return `
    <div style="font-family:Arial,sans-serif;color:#16232E;-webkit-print-color-adjust:exact;print-color-adjust:exact;">
      ${buildHeaderHtml(rec, fileName)}
      ${body}
    </div>`
}
