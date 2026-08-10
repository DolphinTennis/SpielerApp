// `implemented` flags flip to true as each feature lands. Until then every
// tile opens the "im Aufbau" placeholder. Keys drive routing (AppShell.jsx /
// Placeholder.jsx) and are intentionally stable even where the display
// title was renamed (e.g. `liveticker` -> "Matchticker", `videos` ->
// "Beispiele") so no routes had to change along with the rename.
// titleKey/descKey point into src/locales/*.json under overview.items.<key> —
// actual display text lives there, not here, so it can be translated.
export const OVERVIEW_ITEMS = [
  { key: 'turnierplanung', icon: '🗺️', titleKey: 'overview.items.turnierplanung.title', descKey: 'overview.items.turnierplanung.desc', implemented: true, badge: 'ready' },
  { key: 'trainingsplan', icon: '📋', titleKey: 'overview.items.trainingsplan.title', descKey: 'overview.items.trainingsplan.desc', implemented: true, badge: 'ready' },
  { key: 'trainingsfokus', icon: '🎯', titleKey: 'overview.items.trainingsfokus.title', descKey: 'overview.items.trainingsfokus.desc', implemented: true, badge: 'ready' },
  { key: 'videos', icon: '🎬', titleKey: 'overview.items.videos.title', descKey: 'overview.items.videos.desc', implemented: true, badge: 'ready' },
  { key: 'dateien', icon: '📁', titleKey: 'overview.items.dateien.title', descKey: 'overview.items.dateien.desc', implemented: true, badge: 'ready' },
  { key: 'liveticker', icon: '📡', titleKey: 'overview.items.liveticker.title', descKey: 'overview.items.liveticker.desc', implemented: true, badge: 'live' },
  { key: 'matchanalyse', icon: '🎾', titleKey: 'overview.items.matchanalyse.title', descKey: 'overview.items.matchanalyse.desc', implemented: true, badge: 'ready' },
]
