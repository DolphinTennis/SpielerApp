// labelKey points into src/locales/*.json (calendar.yearPlanCategories.<key>).
export const CATEGORIES = [
  { key: 'turnier_national', labelKey: 'calendar.yearPlanCategories.turnier_national', color: '#1C63B7' },
  { key: 'turnier_international', labelKey: 'calendar.yearPlanCategories.turnier_international', color: '#17A2A2' },
  { key: 'training', labelKey: 'calendar.yearPlanCategories.training', color: '#D9A916' },
  { key: 'ferien', labelKey: 'calendar.yearPlanCategories.ferien', color: '#F2ECDD' },
  { key: 'sonstiges', labelKey: 'calendar.yearPlanCategories.sonstiges', color: '#C0392B' },
]

export const CATEGORY_BY_KEY = Object.fromEntries(CATEGORIES.map((c) => [c.key, c]))

export function daysInMonth(year, monthIndex) {
  return new Date(year, monthIndex + 1, 0).getDate()
}
