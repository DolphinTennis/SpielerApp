export default function ConfigWarning() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        style={{
          maxWidth: 480,
          background: 'var(--paper)',
          border: '1px solid var(--line)',
          borderRadius: 'var(--radius)',
          boxShadow: 'var(--shadow)',
          padding: 24,
        }}
      >
        <h2 style={{ color: 'var(--ink)', fontSize: 22, marginBottom: 10 }}>Supabase nicht konfiguriert</h2>
        <p style={{ color: 'var(--text-soft)', fontSize: 14, lineHeight: 1.5 }}>
          Trage <code>VITE_SUPABASE_URL</code> und <code>VITE_SUPABASE_ANON_KEY</code> in die Datei{' '}
          <code>.env.local</code> im Projektstamm ein und starte den Dev-Server neu.
        </p>
      </div>
    </div>
  )
}
