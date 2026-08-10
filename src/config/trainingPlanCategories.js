// `textColor` is optional (default white) — light background colors
// (Tennis, Spiel) need dark text instead to stay readable. labelKey points
// into src/locales/*.json (calendar.trainingCategories.<key>).
export const CATEGORIES = [
  { key: 'tennis', labelKey: 'calendar.trainingCategories.tennis', color: '#D9A916', textColor: 'var(--ink)' },
  { key: 'kondi', labelKey: 'calendar.trainingCategories.kondi', color: '#E08E45' },
  { key: 'physio', labelKey: 'calendar.trainingCategories.physio', color: '#2FA84F' },
  { key: 'mental', labelKey: 'calendar.trainingCategories.mental', color: '#8E5FD1' },
  { key: 'spiel', labelKey: 'calendar.trainingCategories.spiel', color: '#C4A484', textColor: 'var(--ink)' },
  { key: 'turnier_national', labelKey: 'calendar.trainingCategories.turnier_national', color: '#1C63B7' },
  { key: 'turnier_international', labelKey: 'calendar.trainingCategories.turnier_international', color: '#17A2A2' },
  { key: 'sonstiges', labelKey: 'calendar.trainingCategories.sonstiges', color: '#C0392B' },
]

export const CATEGORY_BY_KEY = Object.fromEntries(CATEGORIES.map((c) => [c.key, c]))

// value = JS Date#getDay() (0=So..6=Sa); order here is display order (Mo-So).
export const WEEKDAYS = [
  { value: 1, labelKey: 'calendar.weekdaysShort.mo' },
  { value: 2, labelKey: 'calendar.weekdaysShort.di' },
  { value: 3, labelKey: 'calendar.weekdaysShort.mi' },
  { value: 4, labelKey: 'calendar.weekdaysShort.do' },
  { value: 5, labelKey: 'calendar.weekdaysShort.fr' },
  { value: 6, labelKey: 'calendar.weekdaysShort.sa' },
  { value: 0, labelKey: 'calendar.weekdaysShort.so' },
]

export const UPCOMING_COUNT_OPTIONS = [3, 6, 9, 12]
