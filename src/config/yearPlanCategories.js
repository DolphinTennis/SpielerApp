export const CATEGORIES = [
  { key: 'turnier_national', label: 'Turnier national', color: '#1C63B7' },
  { key: 'turnier_international', label: 'Turnier international', color: '#17A2A2' },
  { key: 'training', label: 'Training', color: '#D9A916' },
  { key: 'ferien', label: 'Ferien', color: '#F2ECDD' },
  { key: 'sonstiges', label: 'Sonstiges', color: '#C0392B' },
]

export const CATEGORY_BY_KEY = Object.fromEntries(CATEGORIES.map((c) => [c.key, c]))

export const MONTH_NAMES = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
]

export function daysInMonth(year, monthIndex) {
  return new Date(year, monthIndex + 1, 0).getDate()
}
