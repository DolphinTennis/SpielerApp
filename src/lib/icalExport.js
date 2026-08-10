function pad(n) {
  return String(n).padStart(2, '0')
}

// FullCalendar event start/end look like "2026-08-13T17:00" (or with
// seconds) — RFC 5545 wants "20260813T170000", no timezone (floating local
// time, which every calendar app interprets in the device's own zone).
function toIcsDateTime(isoLocal) {
  const [datePart, timePart] = isoLocal.split('T')
  const [y, m, d] = datePart.split('-')
  const [hh, mm, ss] = (timePart || '00:00:00').split(':')
  return `${y}${m}${d}T${pad(hh)}${pad(mm)}${pad(ss || '00')}`
}

function escapeIcsText(text) {
  return String(text || '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
}

function nowStamp() {
  const d = new Date()
  return (
    d.getUTCFullYear() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    'T' +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) +
    'Z'
  )
}

// events: FullCalendar-shaped events from expandOccurrences() in
// trainingPlanOccurrences.js — start/end as "YYYY-MM-DDTHH:MM",
// extendedProps.{location, withWhom, note}. Concrete dated events (not
// RRULE) — simpler and already handles exceptions/cancellations correctly,
// at the cost of needing a fresh export once the covered window passes.
export function buildIcs(events) {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Dolphin Tennis//Terminplanung//DE', 'CALSCALE:GREGORIAN']
  const stamp = nowStamp()
  for (const ev of events) {
    const { location, withWhom, note } = ev.extendedProps || {}
    const descriptionParts = [withWhom ? `Mit ${withWhom}` : null, note || null].filter(Boolean)
    lines.push('BEGIN:VEVENT', `UID:${ev.id}@dolphintennis`, `DTSTAMP:${stamp}`, `DTSTART:${toIcsDateTime(ev.start)}`, `DTEND:${toIcsDateTime(ev.end)}`, `SUMMARY:${escapeIcsText(ev.title)}`)
    if (location) lines.push(`LOCATION:${escapeIcsText(location)}`)
    if (descriptionParts.length) lines.push(`DESCRIPTION:${escapeIcsText(descriptionParts.join(' — '))}`)
    lines.push('END:VEVENT')
  }
  lines.push('END:VCALENDAR')
  return lines.join('\r\n')
}

export function downloadIcs(filename, content) {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
