import { formatDate } from './format'

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
}

export function buildPrintHtml(rec) {
  const esc = escapeHtml
  const row = (label, val) =>
    `<div style="margin-bottom:10px;"><div style="font-weight:700;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;color:#1C63B7;">${esc(label)}</div><div style="font-size:13.5px;white-space:pre-wrap;line-height:1.5;">${esc(val) || '–'}</div></div>`

  const fileName = 'Matchanalyse ' + (rec.gegner || 'Unbekannt')
  const now = new Date()
  const timestamp = now.toLocaleDateString('de-DE') + ', ' + now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
  const logoHtml = `<img src="${window.location.origin}/logo.png" style="height:26px;width:auto;display:block;">`

  return `
    <div style="font-family:Arial,sans-serif;color:#16232E;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;padding-bottom:10px;border-bottom:1px solid #D7DEE6;">
        <div style="font-size:11px;color:#5B6875;">${esc(fileName)} · ${esc(timestamp)}</div>
        ${logoHtml}
      </div>
      <h1 style="font-size:22px;margin-bottom:2px;">Matchanalyse — ${esc(rec.spieler)}</h1>
      <p style="color:#5B6875;font-size:13px;margin-top:0;">${formatDate(rec.datum)} · vs. ${esc(rec.gegner)} · ${esc(rec.turnier)} · Ergebnis: ${esc(rec.ergebnis)}</p>
      ${row('Spielverlauf', rec.verlauf)}
      <h2 style="font-size:17px;border-bottom:1px solid #D7DEE6;padding-bottom:4px;margin-top:22px;">Formular 1 — Spielreflexion</h2>
      <h3 style="font-size:14px;color:#1C63B7;">1. Ich — Allgemein</h3>
      ${row('Was hat gut funktioniert, das bereits trainiert wird?', rec.form1.allg1)}
      ${row('Was hat nicht funktioniert, obwohl es trainiert wird?', rec.form1.allg2)}
      ${row('Was hat gefehlt, das bisher noch nicht trainiert wurde?', rec.form1.allg3)}
      <h3 style="font-size:14px;color:#1C63B7;">2. Ich im Match</h3>
      ${row('Taktische Ausrichtung', rec.form1.taktik1)}
      ${row('Umsetzung der Taktik', rec.form1.taktik2)}
      ${row('Schläge (Vorhand, Rückhand, etc.)', rec.form1.schlaege)}
      ${row('Körperliches Feeling', rec.form1.feeling1)}
      ${row('Mentales Feeling', rec.form1.feeling2)}
      <h3 style="font-size:14px;color:#1C63B7;">3. Meine Gegnerin</h3>
      ${row('Spielweise der Gegnerin', rec.form1.gegner1)}
      ${row('Ihre Stärken', rec.form1.gegner2)}
      ${row('Ihre Schwächen', rec.form1.gegner3)}
      <h2 style="font-size:17px;border-bottom:1px solid #D7DEE6;padding-bottom:4px;margin-top:22px;">Formular 2 — Triple-A-Analyse</h2>
      ${row('Was lief gut?', rec.form2.gut)}
      ${row('Was lief nicht optimal?', rec.form2.nicht)}
      ${row('Warum lief es nicht optimal?', rec.form2.warum)}
      ${row('Ziel für das nächste Match', rec.form2.ziel)}
      <p style="font-size:10px;color:#5B6875;margin-top:20px;">© Stefanie Sziburies — Triple-A-Analyse</p>
    </div>`
}

export function printRecord(rec) {
  const contentHtml = buildPrintHtml(rec)
  const w = window.open('', '_blank')
  if (!w || !w.document) {
    throw new Error('Druckfenster konnte nicht geöffnet werden. Bitte Pop-ups für diese Seite erlauben.')
  }
  w.document.open()
  w.document.write(
    '<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8">' +
      '<title>Matchanalyse ' +
      escapeHtml(rec.gegner || '') +
      '</title>' +
      '<style>body{font-family:Arial,sans-serif;padding:24px;color:#16232E;} @media print{ body{padding:0;} }</style>' +
      '</head><body>' +
      contentHtml +
      '</body></html>'
  )
  w.document.close()
  w.focus()
  setTimeout(() => {
    try {
      w.print()
    } catch {
      /* pop-up blocked mid-flight; user can still print manually from the opened window */
    }
  }, 350)
}

export function buildMailBody(rec) {
  const line = (label, val) => label + ': ' + (val || '–') + '%0D%0A'
  let body = 'Matchanalyse - ' + rec.spieler + '%0D%0A'
  body += line('Datum', formatDate(rec.datum))
  body += line('Gegnerin', rec.gegner)
  body += line('Turnier', rec.turnier)
  body += line('Ergebnis', rec.ergebnis)
  body += '%0D%0A--- Formular 1: Spielreflexion ---%0D%0A'
  body += line('Gut funktioniert', rec.form1.allg1)
  body += line('Nicht funktioniert', rec.form1.allg2)
  body += line('Gefehlt', rec.form1.allg3)
  body += line('Taktische Ausrichtung', rec.form1.taktik1)
  body += line('Umsetzung', rec.form1.taktik2)
  body += line('Schläge', rec.form1.schlaege)
  body += line('Feeling körperlich', rec.form1.feeling1)
  body += line('Feeling mental', rec.form1.feeling2)
  body += line('Gegnerin - Spielweise', rec.form1.gegner1)
  body += line('Gegnerin - Stärken', rec.form1.gegner2)
  body += line('Gegnerin - Schwächen', rec.form1.gegner3)
  body += '%0D%0A--- Formular 2: Triple-A-Analyse ---%0D%0A'
  body += line('Was lief gut', rec.form2.gut)
  body += line('Was lief nicht optimal', rec.form2.nicht)
  body += line('Warum', rec.form2.warum)
  body += line('Ziel nächstes Match', rec.form2.ziel)
  return body
}
