import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../lib/AuthContext'
import { useOrg } from '../lib/OrgContext'
import { useToast } from '../lib/ToastContext'
import { deleteYearPlanDay, listYearPlanDays, saveYearPlanDay } from '../lib/yearPlanApi'
import { CATEGORIES, CATEGORY_BY_KEY, MONTH_NAMES, daysInMonth } from '../config/yearPlanCategories'
import YearPlanDayPopover from '../components/YearPlanDayPopover'

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

  const dayMap = useMemo(() => {
    const map = {}
    for (const d of days) map[d.date] = d
    return map
  }, [days])

  async function handleCellClick(monthIndex, day) {
    const date = dateStr(year, monthIndex, day)
    const entry = dayMap[date]
    if (entry) {
      setSelected({ date, entry })
      return
    }
    try {
      const saved = await saveYearPlanDay({ orgId, date, category: activeCategory, note: '', userLabel: session.user.email })
      setDays((prev) => [...prev, saved])
    } catch (err) {
      console.error(err)
      toast('Eintrag konnte nicht gespeichert werden.')
    }
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
        Kategorie auswählen, dann einen leeren Tag antippen, um ihn zu markieren. Auf einen markierten Tag tippen, um
        ihn zu bearbeiten{isSpieler ? ' oder einen Vorschlag zu bestätigen' : ''}.
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
                  return (
                    <div className="yearplan-cell-wrap" key={i}>
                      <button
                        type="button"
                        className={`yearplan-cell${entry ? ' filled' : ''}${entry?.status === 'proposed' ? ' proposed' : ''}`}
                        style={entry ? { background: cat.color } : undefined}
                        title={
                          entry
                            ? `${cat.label}${entry.note ? ' — ' + entry.note : ''}${entry.status === 'proposed' ? ' (Vorschlag)' : ''}`
                            : `${day}.${monthIndex + 1}.${year}`
                        }
                        onClick={() => handleCellClick(monthIndex, day)}
                        disabled={loading}
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
