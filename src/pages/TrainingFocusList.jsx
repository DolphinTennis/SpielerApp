import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import TrainingFocusRow from '../components/TrainingFocusRow'
import { deleteEntry, listEntries } from '../lib/trainingFocusApi'
import { useToast } from '../lib/ToastContext'
import { useOrg } from '../lib/OrgContext'

export default function TrainingFocusList({ onOpenEntry, onNewEntry }) {
  const { t } = useTranslation()
  const { orgId, playerName } = useOrg()
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const toast = useToast()

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    listEntries(orgId)
      .then((data) => {
        if (!cancelled) setEntries(data)
      })
      .catch((err) => {
        console.error(err)
        toast(t('trainingsfokus.loadFailed'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, toast])

  async function handleDelete(entry) {
    const label = entry.datum ? entry.datum : t('trainingsfokus.noDate')
    if (!window.confirm(t('trainingsfokus.deleteConfirm', { label }))) return
    try {
      await deleteEntry(entry.id)
      setEntries((prev) => prev.filter((e) => e.id !== entry.id))
      toast(t('trainingsfokus.deleted'))
    } catch (err) {
      console.error(err)
      toast(t('trainingsfokus.deleteFailed'))
    }
  }

  return (
    <div className="view">
      <h1 className="section-title">{t('trainingsfokus.title')}</h1>
      <p className="section-sub">{t('trainingsfokus.listSubtitle', { name: playerName })}</p>

      <div className="list-head">
        <span style={{ fontSize: 13, color: 'var(--text-soft)', fontWeight: 600 }}>
          {loading ? t('common.loading') : `${entries.length} ${entries.length === 1 ? t('trainingsfokus.countEntry') : t('trainingsfokus.countEntries')}`}
        </span>
        <button className="btn btn-primary" onClick={onNewEntry}>
          {t('trainingsfokus.newEntry')}
        </button>
      </div>

      {!loading && entries.length === 0 && (
        <div className="empty-state">
          <div className="big-emoji">🎯</div>
          <p>
            <strong>{t('trainingsfokus.emptyTitle')}</strong>
          </p>
          <p>{t('trainingsfokus.emptyDesc')}</p>
        </div>
      )}

      <div className="match-list">
        {entries.map((e) => (
          <TrainingFocusRow key={e.id} entry={e} onClick={() => onOpenEntry(e.id)} onDelete={() => handleDelete(e)} />
        ))}
      </div>
    </div>
  )
}
