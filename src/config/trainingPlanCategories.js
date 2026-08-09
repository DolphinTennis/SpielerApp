export const CATEGORIES = [
  { key: 'tennis', label: 'Tennis', color: '#1C63B7' },
  { key: 'kondi', label: 'Kondi', color: '#E08E45' },
  { key: 'physio', label: 'Physio', color: '#2FA84F' },
  { key: 'mental', label: 'Mental', color: '#8E5FD1' },
  { key: 'sonstiges', label: 'Sonstiges', color: '#7A8794' },
]

export const CATEGORY_BY_KEY = Object.fromEntries(CATEGORIES.map((c) => [c.key, c]))

// value = JS Date#getDay() (0=So..6=Sa); order here is display order (Mo-So).
export const WEEKDAYS = [
  { value: 1, label: 'Mo' },
  { value: 2, label: 'Di' },
  { value: 3, label: 'Mi' },
  { value: 4, label: 'Do' },
  { value: 5, label: 'Fr' },
  { value: 6, label: 'Sa' },
  { value: 0, label: 'So' },
]

// Indexed by JS Date#getDay().
export const WEEKDAY_FULL_NAMES = [
  'Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag',
]

export const UPCOMING_COUNT_OPTIONS = [3, 6, 9, 12]
