import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../lib/AuthContext'
import { useOrg } from '../lib/OrgContext'
import { useToast } from '../lib/ToastContext'
import { createProtocol, deleteProtocol, listProtocols } from '../lib/pointProtocolApi'
import { derive, resultText, newMatch } from '../lib/pointProtocolLogic'
import { formatDate } from '../lib/format'

function today() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function Punktprotokoll({ onOpen }) {
  const { t } = useTranslation()
  const { session } = useAuth()
  const { orgId, playerName } = useOrg()
  const toast = useToast()
  const own = (playerName || '').trim().split(/\s+/)[0] || t('punktprotokoll.player')
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState({ opponent: '', match_date: today(), place: '', first_server: 'k', mode: 'ct' })

  useEffect(() => {
    let cancelled = false
    listProtocols(orgId)
      .then((data) => !cancelled && setItems(data))
      .catch((err) => {
        console.error(err)
        toast(t('punktprotokoll.loadFailed'))
      })
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId])

  async function handleStart() {
    setBusy(true)
    try {
      const m = newMatch({ firstServer: form.first_server, mode: form.mode })
      const created = await createProtocol({ ...form, org_id: orgId, created_by: session.user.id, state: { games: m.games } })
      onOpen(created.id)
    } catch (err) {
      console.error(err)
      toast(t('punktprotokoll.createFailed'))
      setBusy(false)
    }
  }

  async function handleDelete(item) {
    const label = `${item.opponent || t('punktprotokoll.opponent')}${item.match_date ? ` (${formatDate(item.match_date)})` : ''}`
    if (!window.confirm(t('punktprotokoll.deleteConfirm', { label }))) return
    try {
      await deleteProtocol(item.id)
      setItems((prev) => prev.filter((p) => p.id !== item.id))
      toast(t('punktprotokoll.deleted'))
    } catch (err) {
      console.error(err)
      toast(t('punktprotokoll.deleteFailed'))
    }
  }

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  if (creating) {
    return (
      <div className="view pp">
        <h1 className="section-title">{t('punktprotokoll.title')}</h1>
        <p className="section-sub">{t('punktprotokoll.newSub', { name: playerName || own })}</p>
        <div className="pp-card">
          <label className="pp-l">{t('punktprotokoll.opponentLabel')}</label>
          <input className="pp-input" type="text" placeholder={t('punktprotokoll.opponentPlaceholder')} value={form.opponent} onChange={(e) => set('opponent', e.target.value)} />
          <label className="pp-l">{t('punktprotokoll.dateLabel')}</label>
          <input className="pp-input" type="date" value={form.match_date} onChange={(e) => set('match_date', e.target.value)} />
          <label className="pp-l">{t('punktprotokoll.placeLabel')}</label>
          <input className="pp-input" type="text" placeholder={t('punktprotokoll.placePlaceholder')} value={form.place} onChange={(e) => set('place', e.target.value)} />
          <label className="pp-l">{t('punktprotokoll.firstServerLabel')}</label>
          <div className="pp-seg">
            <button type="button" className={form.first_server === 'k' ? 'on' : ''} onClick={() => set('first_server', 'k')}>{own}</button>
            <button type="button" className={form.first_server === 'g' ? 'on' : ''} onClick={() => set('first_server', 'g')}>{t('punktprotokoll.opponent')}</button>
          </div>
          <label className="pp-l">{t('punktprotokoll.modeLabel')}</label>
          <div className="pp-seg">
            <button type="button" className={form.mode === 'ct' ? 'on' : ''} onClick={() => set('mode', 'ct')}>{t('punktprotokoll.modeCt')}</button>
            <button type="button" className={form.mode === 'full' ? 'on' : ''} onClick={() => set('mode', 'full')}>{t('punktprotokoll.modeFull')}</button>
          </div>
        </div>
        <button type="button" className="btn btn-primary" style={{ width: '100%' }} disabled={busy} onClick={handleStart}>{t('punktprotokoll.start')}</button>
        <button type="button" className="btn btn-ghost" style={{ width: '100%', marginTop: 10 }} onClick={() => setCreating(false)}>{t('common.cancel')}</button>
      </div>
    )
  }

  return (
    <div className="view pp">
      <h1 className="section-title">{t('punktprotokoll.title')}</h1>
      <p className="section-sub">{t('punktprotokoll.listSub')}</p>
      <div className="list-head">
        <span style={{ fontSize: 13, color: 'var(--text-soft)', fontWeight: 600 }}>{loading ? t('common.loading') : t('punktprotokoll.count', { count: items.length })}</span>
        <button type="button" className="btn btn-primary" onClick={() => setCreating(true)}>{t('punktprotokoll.newProtocol')}</button>
      </div>
      {!loading && items.length === 0 && (
        <div className="empty-state">
          <div className="big-emoji">📝</div>
          <p><strong>{t('punktprotokoll.emptyTitle')}</strong></p>
          <p>{t('punktprotokoll.emptyDesc')}</p>
        </div>
      )}
      <div className="match-list">
        {items.map((p) => {
          const m = { games: p.state?.games || [], firstServer: p.first_server, mode: p.mode }
          const res = m.games.length ? resultText(m) : ''
          const over = m.games.length ? derive(m).over : false
          return (
            <div key={p.id} className="match-row" onClick={() => onOpen(p.id)}>
              <div className="score-chip">{res || '–'}</div>
              <div className="match-meta">
                <div className="opp">vs. {p.opponent || t('punktprotokoll.opponent')}</div>
                <div className="sub">
                  <span>📅 {formatDate(p.match_date)}</span>
                  {p.place && <span>📍 {p.place}</span>}
                </div>
              </div>
              {p.match_id && <span className="filed-tag">{t('punktprotokoll.linked')}</span>}
              {!over && res && <span className="filed-tag">{t('punktprotokoll.runningTag')}</span>}
              <button type="button" className="row-delete" title={t('punktprotokoll.deleteTitle')} onClick={(e) => { e.stopPropagation(); handleDelete(p) }}>🗑️</button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
