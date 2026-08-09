import { useEffect, useState } from 'react'
import { useAuth } from '../lib/AuthContext'
import { useOrg } from '../lib/OrgContext'
import { useToast } from '../lib/ToastContext'
import { addMediaExample, deleteMediaExample, fetchLinkPreview, listMediaExamples } from '../lib/mediaExamplesApi'
import MediaExampleCard from '../components/MediaExampleCard'

export default function Beispiele() {
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
      .then((data) => !cancelled && setItems(data))
      .catch((err) => {
        console.error(err)
        toast('Beispiele konnten nicht geladen werden.')
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
      toast('Bitte einen gültigen Link (beginnend mit http/https) angeben.')
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
      toast('Beispiel hinzugefügt.')
    } catch (err) {
      console.error(err)
      toast('Speichern fehlgeschlagen.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(item) {
    try {
      await deleteMediaExample(item.id)
      setItems((prev) => prev.filter((i) => i.id !== item.id))
      toast('Beispiel gelöscht.')
    } catch (err) {
      console.error(err)
      toast('Löschen fehlgeschlagen.')
    }
  }

  return (
    <div className="view">
      <h1 className="section-title">Beispiele</h1>
      <p className="section-sub">Geteilte Medien als Vorbilder, Hilfestellung, etc. — Link aus Instagram/YouTube/TikTok einfügen.</p>

      <div className="media-example-add-form">
        <input
          type="text"
          placeholder="Link einfügen, z. B. https://..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSave()}
        />
        <input type="text" placeholder="Notiz (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
        <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Lädt Vorschau …' : 'Speichern'}
        </button>
      </div>

      {!loading && items.length === 0 && (
        <div className="empty-state">
          <div className="big-emoji">🎬</div>
          <p>
            <strong>Noch keine Beispiele.</strong>
          </p>
          <p>Füge oben einen Link ein, um loszulegen.</p>
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
