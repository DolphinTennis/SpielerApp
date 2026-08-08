import { useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '../lib/AuthContext'
import { useOrg } from '../lib/OrgContext'
import { useToast } from '../lib/ToastContext'
import { deleteYearPlanDay, deleteYearPlanDayByDate, listYearPlanDays, saveYearPlanDay } from '../lib/yearPlanApi'
import { CATEGORIES, CATEGORY_BY_KEY, MONTH_NAMES, daysInMonth } from '../config/yearPlanCategories'
import YearPlanDayPopover from '../components/YearPlanDayPopover'

const LONG_PRESS_MS = 550

function dateStr(year, monthIndex, day) {
  return `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export default function YearPlanning() {
  const { session } = useAuth()
  const { orgId, role } = useOrg()
  const toast = useToast()
  const isSpieler = role === 'spieler'

  const [year, setYear] = useState(new Date().getFullYear())
  const [days, setDays] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState(CATEGORIES[0].key)
  const [selected, setSelected] = useState(null)

  // Tracks the current press/drag gesture across pointerdown -> pointerenter
  // (drag) -> pointerup, plus the long-press timer. A ref (not state) since
  // it's mutated many times per gesture and should never trigger a render.
  const dragRef = useRef({ pressed: false, active: false, mode: 'paint', startDate: null, visited: null, timer: null, longPress: false, pointerType: null })

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    listYearPlanDays(orgId, year)
      .then((data) => {
        if (!cancelled) setDays(data)
      })
      .catch((err) => {
        console.error(err)
        toast('Jahresplanung konnte nicht geladen werden.')
      })
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, year])

  useEffect(() => {
    function resetOnStrayPointerUp() {
      const d = dragRef.current
      if (d.pressed) {
        if (d.timer) clearTimeout(d.timer)
        d.timer = null
        d.pressed = false
        d.active = false
      }
    }
    window.addEventListener('pointerup', resetOnStrayPointerUp)
    window.addEventListener('pointercancel', resetOnStrayPointerUp)
    return () => {
      window.removeEventListener('pointerup', resetOnStrayPointerUp)
      window.removeEventListener('pointercancel', resetOnStrayPointerUp)
    }
  }, [])

  const dayMap = useMemo(() => {
    const map = {}
    for (const d of days) map[d.date] = d
    return map
  }, [days])

  async function paintCell(date) {
    const existing = dayMap[date]
    try {
      const saved = await saveYearPlanDay({ orgId, date, category: activeCategory, note: existing?.note || '', userLabel: session.user.email })
      setDays((prev) => [...prev.filter((d) => d.date !== date), saved])
    } catch (err) {
      console.error(err)
      toast('Eintrag konnte nicht gespeichert werden.')
    }
  }

  async function eraseCell(date) {
    try {
      await deleteYearPlanDayByDate(orgId, date)
      setDays((prev) => prev.filter((d) => d.date !== date))
    } catch (err) {
      console.error(err)
      toast('Löschen fehlgeschlagen.')
    }
  }

  function clearLongPressTimer() {
    const d = dragRef.current
    if (d.timer) {
      clearTimeout(d.timer)
      d.timer = null
    }
  }

  function handleCellPointerDown(e, date) {
    if (loading) return
    if (e.pointerType === 'mouse' && e.button !== 0) return
    const d = dragRef.current
    d.pressed = true
    d.active = false
    d.longPress = false
    d.startDate = date
    d.mode = dayMap[date] ? 'erase' : 'paint'
    d.visited = new Set()
    d.pointerType = e.pointerType
    clearLongPressTimer()
    d.timer = setTimeout(() => {
      if (d.pressed && !d.active) {
        d.longPress = true
        setSelected({ date, entry: dayMap[date] || null })
      }
    }, LONG_PRESS_MS)
  }

  // Only mouse drags paint/erase a range — on touch, a move over the grid
  // needs to stay a scroll gesture, so touch just gets tap + long-press.
  function handleCellPointerEnter(date) {
    const d = dragRef.current
    if (!d.pressed || d.pointerType !== 'mouse' || date === d.startDate) return
    if (!d.active) {
      d.active = true
      clearLongPressTimer()
      if (!d.visited.has(d.startDate)) {
        d.visited.add(d.startDate)
        if (d.mode === 'paint') paintCell(d.startDate)
        else eraseCell(d.startDate)
      }
    }
    if (!d.visited.has(date)) {
      d.visited.add(date)
      if (d.mode === 'paint') paintCell(date)
      else eraseCell(date)
    }
  }

  function handleCellPointerUp(date) {
    const d = dragRef.current
    clearLongPressTimer()
    if (!d.pressed) return
    const wasActive = d.active
    const wasLongPress = d.longPress
    d.pressed = false
    d.active = false
    if (wasLongPress || wasActive) return
    paintCell(date)
  }

  function handleCellPointerCancel() {
    clearLongPressTimer()
    dragRef.current.pressed = false
    dragRef.current.active = false
  }

  function handleCellDoubleClick(e, date) {
    e.preventDefault()
    clearLongPressTimer()
    dragRef.current.pressed = false
    dragRef.current.active = false
    dragRef.current.longPress = false
    eraseCell(date)
  }

  async function handlePopoverSave(category, note) {
    try {
      const saved = await saveYearPlanDay({ orgId, date: selected.date, category, note, userLabel: session.user.email })
      setDays((prev) => [...prev.filter((d) => d.date !== selected.date), saved])
      setSelected(null)
      toast('Gespeichert.')
    } catch (err) {
      console.error(err)
      toast('Speichern fehlgeschlagen.')
    }
  }

  async function handlePopoverConfirm() {
    // "Bestätigen" is just re-saving unchanged as the Spieler — the DB
    // trigger sets status to confirmed based on the acting user's role.
    await handlePopoverSave(selected.entry.category, selected.entry.note || '')
  }

  async function handlePopoverDelete() {
    try {
      await deleteYearPlanDay(selected.entry.id)
      setDays((prev) => prev.filter((d) => d.date !== selected.date))
      setSelected(null)
      toast('Eintrag gelöscht.')
    } catch (err) {
      console.error(err)
      toast('Löschen fehlgeschlagen.')
    }
  }

  return (
    <div className="view">
      <h1 className="section-title">Jahresplanung</h1>
      <p className="section-sub">Übersichtsplanung mit Input von außen.</p>

      <div className="yearplan-toolbar">
        <div className="yearplan-year-switch">
          <button type="button" onClick={() => setYear((y) => y - 1)} aria-label="Vorheriges Jahr">
            ‹
          </button>
          <span className="year">{year}</span>
          <button type="button" onClick={() => setYear((y) => y + 1)} aria-label="Nächstes Jahr">
            ›
          </button>
        </div>
      </div>

      <div className="yearplan-legend">
        {CATEGORIES.map((c) => (
          <button
            key={c.key}
            type="button"
            className={activeCategory === c.key ? 'active' : ''}
            style={{ '--swatch-color': c.color }}
            onClick={() => setActiveCategory(c.key)}
          >
            <span className="swatch" />
            {c.label}
          </button>
        ))}
      </div>
      <p className="yearplan-note">
        Kategorie auswählen, dann klicken zum Markieren oder klicken-und-ziehen für einen Zeitraum (z. B. eine
        Ferienwoche) — genauso funktioniert das Ziehen über bereits markierte Tage zum Entfernen. Doppelklick löscht
        einen einzelnen Tag. Langes Drücken auf einen Tag öffnet die Detailansicht{isSpieler ? ' zum Bearbeiten oder Bestätigen' : ' zum Bearbeiten'}.
      </p>

      <div className="yearplan-scroll">
        <div className="yearplan-grid">
          <div className="yearplan-header-row">
            <div className="yearplan-month-label" />
            {Array.from({ length: 31 }, (_, i) => (
              <div className="yearplan-day-header" key={i}>
                {i + 1}
              </div>
            ))}
          </div>
          {MONTH_NAMES.map((name, monthIndex) => {
            const total = daysInMonth(year, monthIndex)
            return (
              <div className="yearplan-row" key={name}>
                <div className="yearplan-month-label">{name}</div>
                {Array.from({ length: 31 }, (_, i) => {
                  const day = i + 1
                  if (day > total) {
                    return (
                      <div className="yearplan-cell-wrap" key={i}>
                        <div className="yearplan-cell disabled" />
                      </div>
                    )
                  }
                  const date = dateStr(year, monthIndex, day)
                  const entry = dayMap[date]
                  const cat = entry ? CATEGORY_BY_KEY[entry.category] : null
                  const weekday = new Date(year, monthIndex, day).getDay()
                  const isWeekend = weekday === 0 || weekday === 6
                  return (
                    <div className="yearplan-cell-wrap" key={i}>
                      <button
                        type="button"
                        className={`yearplan-cell${isWeekend ? ' weekend' : ''}${entry ? ' filled' : ''}${entry?.status === 'proposed' ? ' proposed' : ''}`}
                        style={entry ? { background: cat.color } : undefined}
                        title={
                          entry
                            ? `${cat.label}${entry.note ? ' — ' + entry.note : ''}${entry.status === 'proposed' ? ' (Vorschlag)' : ''}`
                            : `${day}.${monthIndex + 1}.${year}`
                        }
                        disabled={loading}
                        onPointerDown={(e) => handleCellPointerDown(e, date)}
                        onPointerEnter={() => handleCellPointerEnter(date)}
                        onPointerUp={() => handleCellPointerUp(date)}
                        onPointerCancel={handleCellPointerCancel}
                        onDoubleClick={(e) => handleCellDoubleClick(e, date)}
                        onContextMenu={(e) => e.preventDefault()}
                      />
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>

      {selected && (
        <YearPlanDayPopover
          date={selected.date}
          entry={selected.entry}
          activeCategory={activeCategory}
          isSpieler={isSpieler}
          onClose={() => setSelected(null)}
          onSave={handlePopoverSave}
          onConfirm={handlePopoverConfirm}
          onDelete={handlePopoverDelete}
        />
      )}
    </div>
  )
}
