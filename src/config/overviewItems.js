// `implemented` flags flip to true as each feature lands. Until then every
// tile opens the "im Aufbau" placeholder. Keys drive routing (AppShell.jsx /
// Placeholder.jsx) and are intentionally stable even where the display
// title was renamed (e.g. `liveticker` -> "Matchticker", `videos` ->
// "Beispiele") so no routes had to change along with the rename.
export const OVERVIEW_ITEMS = [
  { key: 'turnierplanung', icon: '🗺️', title: 'Jahresplanung', desc: 'Übersichtsplanung mit Input von außen.', implemented: true, badge: 'ready' },
  { key: 'turniere', icon: '🏆', title: 'Anstehende Turniere', desc: 'Gemeldeter Turnierplan.', implemented: false },
  { key: 'trainingsplan', icon: '📋', title: 'Trainingsplan', desc: 'Trainingszeiten und Entwicklung mit Input von außen.', implemented: false },
  { key: 'videos', icon: '🎬', title: 'Beispiele', desc: 'Geteilte Medien als Vorbilder, Hilfestellung, etc. …', implemented: false },
  { key: 'dateien', icon: '📁', title: 'Meine Dateien', desc: 'Alles was mir wichtig ist.', implemented: true, badge: 'ready' },
  { key: 'liveticker', icon: '📡', title: 'Matchticker', desc: 'Aktuelles Spiel im Blick.', implemented: true, badge: 'live' },
  { key: 'matchanalyse', icon: '🎾', title: 'Matchanalyse', desc: 'Spiele auswerten & reflektieren.', implemented: true, badge: 'ready' },
]
