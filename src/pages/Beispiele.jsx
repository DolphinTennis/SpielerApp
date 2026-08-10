import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../lib/AuthContext'
import { useOrg } from '../lib/OrgContext'
import { useToast } from '../lib/ToastContext'
import { addMediaExample, deleteMediaExample, fetchLinkPreview, listMediaExamples } from '../lib/mediaExamplesApi'
import MediaExampleCard from '../components/MediaExampleCard'

export default function Beispiele() {
  const { t } = useTranslation()
  const { session } = useAuth()
  const { orgId } = useOrg()
  const toast = useToast()

  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [url, setUrl] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    listMediaExamples(orgId)
      .then((data) => {
        if (cancelled) return
        setItems(data)
        // The mailbox is checked from the dashboard, not here — this just
        // marks whatever's currently newest as "seen" so the "neu" badge
        // on the dashboard tile clears now that someone's actually looked.
        if (data.length > 0) {
          localStorage.setItem(`beispiele-last-seen-${orgId}`, data[0].created_at)
        }
      })
      .catch((err) => {
        console.error(err)
        toast(t('beispiele.loadFailed'))
      })
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId])

  async function handleSave() {
    const trimmed = url.trim()
    if (!trimmed || !/^https?:\/\//i.test(trimmed)) {
      toast(t('beispiele.invalidLink'))
      return
    }
    setSaving(true)
    let preview = null
    try {
      preview = await fetchLinkPreview(trimmed)
    } catch (err) {
      console.error(err)
      // Preview fetch failing shouldn't block saving the raw link.
    }
    try {
      const saved = await addMediaExample({ orgId, url: trimmed, note, userLabel: session.user.email, preview })
      setItems((prev) => [saved, ...prev])
      setUrl('')
      setNote('')
      toast(t('beispiele.added'))
    } catch (err) {
      console.error(err)
      toast(t('beispiele.saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(item) {
    try {
      await deleteMediaExample(item.id)
      setItems((prev) => prev.filter((i) => i.id !== item.id))
      toast(t('beispiele.deleted'))
    } catch (err) {
      console.error(err)
      toast(t('beispiele.deleteFailed'))
    }
  }

  return (
    <div className="view">
      <h1 className="section-title">{t('beispiele.title')}</h1>
      <p className="section-sub">{t('beispiele.subtitle')}</p>

      <div className="media-example-add-form">
        <input
          type="text"
          placeholder={t('beispiele.linkPlaceholder')}
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSave()}
        />
        <input type="text" placeholder={t('beispiele.notePlaceholder')} value={note} onChange={(e) => setNote(e.target.value)} />
        <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? t('beispiele.loadingPreview') : t('beispiele.save')}
        </button>
      </div>

      {!loading && items.length === 0 && (
        <div className="empty-state">
          <div className="big-emoji">🎬</div>
          <p>
            <strong>{t('beispiele.emptyTitle')}</strong>
          </p>
          <p>{t('beispiele.emptyDesc')}</p>
        </div>
      )}

      <div className="media-example-grid">
        {items.map((item) => (
          <MediaExampleCard key={item.id} item={item} onDelete={handleDelete} />
        ))}
      </div>
    </div>
  )
}
