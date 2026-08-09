import { formatDate } from './format'

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
}

function buildRow(label, val) {
  const esc = escapeHtml
  return `<div style="margin-bottom:10px;"><div style="font-weight:700;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;color:#1C63B7;">${esc(label)}</div><div style="font-size:13.5px;white-space:pre-wrap;line-height:1.5;">${esc(val) || '–'}</div></div>`
}

function buildHtml(rec) {
  const esc = escapeHtml
  const now = new Date()
  const timestamp = now.toLocaleDateString('de-DE') + ', ' + now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
  const logoHtml = `<img src="${window.location.origin}/logo.png" style="height:26px;width:auto;display:block;">`
  const fileName = 'Trainingsfokus ' + (rec.datum || '')

  return `
    <div style="font-family:Arial,sans-serif;color:#16232E;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;padding-bottom:10px;border-bottom:1px solid #D7DEE6;">
        <div style="font-size:11px;color:#5B6875;">${esc(fileName)} · ${esc(timestamp)}</div>
        ${logoHtml}
      </div>
      <h1 style="font-size:22px;margin-bottom:2px;">Trainingsfokus — ${esc(rec.spieler)}</h1>
      <p style="color:#5B6875;font-size:13px;margin-top:0;">${formatDate(rec.datum)}</p>
      ${buildRow('Energie mental (1–10)', rec.energie_mental)}
      ${buildRow('Energie physisch (1–10)', rec.energie_physisch)}
      ${buildRow('Mein Trainingsziel', rec.trainingsziel)}
      ${buildRow('Was haben wir geübt', rec.geuebt)}
      ${buildRow('Was war gut', rec.gut)}
      ${buildRow('Was kann ich verbessern', rec.verbessern)}
      ${buildRow('Einsatz (in %)', rec.einsatz_prozent != null ? rec.einsatz_prozent + ' %' : '')}
    </div>`
}

// Same in-page #print-area + window.print() mechanism as matchExport.js —
// no pop-up, closing/canceling the print dialog returns to this screen.
export function printInPage(rec) {
  const printArea = document.getElementById('print-area')
  if (!printArea) {
    throw new Error('Druckbereich konnte nicht gefunden werden.')
  }
  printArea.innerHTML = buildHtml(rec)
  window.print()
}
