import { formatDate } from './format'

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
}

function buildRow(label, val) {
  const esc = escapeHtml
  return `<div style="margin-bottom:10px;"><div style="font-weight:700;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;color:#1C63B7;">${esc(label)}</div><div style="font-size:13.5px;white-space:pre-wrap;line-height:1.5;">${esc(val) || '–'}</div></div>`
}

// Shared header (logo/timestamp bar, title, match meta, Spielverlauf) so both
// per-form PDFs carry the same "Stammdaten" even when printed separately.
function buildHeaderHtml(rec, fileName) {
  const esc = escapeHtml
  const now = new Date()
  const timestamp = now.toLocaleDateString('de-DE') + ', ' + now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
  const logoHtml = `<img src="${window.location.origin}/logo.png" style="height:26px;width:auto;display:block;">`

  return `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;padding-bottom:10px;border-bottom:1px solid #D7DEE6;">
      <div style="font-size:11px;color:#5B6875;">${esc(fileName)} · ${esc(timestamp)}</div>
      ${logoHtml}
    </div>
    <h1 style="font-size:22px;margin-bottom:2px;">Matchanalyse — ${esc(rec.spieler)}</h1>
    <p style="color:#5B6875;font-size:13px;margin-top:0;">${formatDate(rec.datum)} · vs. ${esc(rec.gegner)} · ${esc(rec.turnier)} · Ergebnis: ${esc(rec.ergebnis)}</p>
    ${buildRow('Spielverlauf', rec.verlauf)}`
}

export function buildForm1Html(rec) {
  const fileName = 'Matchanalyse ' + (rec.gegner || 'Unbekannt') + ' — Formular 1'
  return `
    <div style="font-family:Arial,sans-serif;color:#16232E;">
      ${buildHeaderHtml(rec, fileName)}
      <h2 style="font-size:17px;border-bottom:1px solid #D7DEE6;padding-bottom:4px;margin-top:22px;">Formular 1 — Spielreflexion</h2>
      <h3 style="font-size:14px;color:#1C63B7;">1. Ich — Allgemein</h3>
      ${buildRow('Was hat gut funktioniert, das bereits trainiert wird?', rec.form1.allg1)}
      ${buildRow('Was hat nicht funktioniert, obwohl es trainiert wird?', rec.form1.allg2)}
      ${buildRow('Was hat gefehlt, das bisher noch nicht trainiert wurde?', rec.form1.allg3)}
      <h3 style="font-size:14px;color:#1C63B7;">2. Ich im Match</h3>
      ${buildRow('Taktische Ausrichtung', rec.form1.taktik1)}
      ${buildRow('Umsetzung der Taktik', rec.form1.taktik2)}
      ${buildRow('Schläge (Vorhand, Rückhand, etc.)', rec.form1.schlaege)}
      ${buildRow('Körperliches Feeling', rec.form1.feeling1)}
      ${buildRow('Mentales Feeling', rec.form1.feeling2)}
      <h3 style="font-size:14px;color:#1C63B7;">3. Meine Gegnerin</h3>
      ${buildRow('Spielweise der Gegnerin', rec.form1.gegner1)}
      ${buildRow('Ihre Stärken', rec.form1.gegner2)}
      ${buildRow('Ihre Schwächen', rec.form1.gegner3)}
    </div>`
}

export function buildForm2Html(rec) {
  const fileName = 'Matchanalyse ' + (rec.gegner || 'Unbekannt') + ' — Formular 2'
  return `
    <div style="font-family:Arial,sans-serif;color:#16232E;">
      ${buildHeaderHtml(rec, fileName)}
      <h2 style="font-size:17px;border-bottom:1px solid #D7DEE6;padding-bottom:4px;margin-top:22px;">Formular 2 — Triple-A-Analyse</h2>
      ${buildRow('Was lief gut?', rec.form2.gut)}
      ${buildRow('Was lief nicht optimal?', rec.form2.nicht)}
      ${buildRow('Warum lief es nicht optimal?', rec.form2.warum)}
      ${buildRow('Ziele fürs nächste Match', rec.form2.zieleMatch ?? rec.form2.ziel)}
      ${buildRow('Ziele fürs nächste Training', rec.form2.zieleTraining)}
      <p style="font-size:10px;color:#5B6875;margin-top:20px;">© Stefanie Sziburies — Triple-A-Analyse</p>
    </div>`
}

// Prints in place using the #print-area element (see index.html + print.css)
// instead of window.open(): no pop-up involved at all, so there's nothing
// for a pop-up blocker to block, and the user never leaves the app — closing
// or canceling the print dialog just returns to the exact screen they were on.
// formNumber: 1 | 2 — which form to render as its own printable document.
export function printInPage(rec, formNumber) {
  const printArea = document.getElementById('print-area')
  if (!printArea) {
    throw new Error('Druckbereich konnte nicht gefunden werden.')
  }
  printArea.innerHTML = formNumber === 2 ? buildForm2Html(rec) : buildForm1Html(rec)
  window.print()
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
  body += line('Ziele fürs nächste Match', rec.form2.zieleMatch ?? rec.form2.ziel)
  body += line('Ziele fürs nächste Training', rec.form2.zieleTraining)
  return body
}
