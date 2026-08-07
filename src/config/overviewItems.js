// `implemented` flags flip to true as each feature lands (Matchanalyse in Schritt 5,
// Liveticker in Schritt 6, Meine Dateien in Schritt 7). Until then every tile opens
// the "im Aufbau" placeholder.
export const OVERVIEW_ITEMS = [
  { key: 'turniere', icon: '🏆', title: 'Anstehende Turniere', desc: 'Nächste Wettkämpfe im Überblick.', implemented: false },
  { key: 'turnierplanung', icon: '🗺️', title: 'Turnierplanung', desc: 'Saisonplanung & Meldungen.', implemented: false },
  { key: 'trainingsplan', icon: '📋', title: 'Trainingsplan', desc: 'Wochenplan & Trainingsschwerpunkte.', implemented: false },
  { key: 'matchanalyse', icon: '🎾', title: 'Matchanalyse', desc: 'Spiele auswerten & reflektieren.', implemented: true, badge: 'ready' },
  { key: 'videos', icon: '🎬', title: 'Videos', desc: 'Match- & Trainingsaufnahmen.', implemented: false },
  { key: 'dateien', icon: '📁', title: 'Meine Dateien', desc: 'Dokumente, Statistiken, Sonstiges.', implemented: true, badge: 'ready' },
  { key: 'liveticker', icon: '📡', title: 'Liveticker aktuelles Match', desc: 'Punktestand live verfolgen.', implemented: true, badge: 'live' },
]
