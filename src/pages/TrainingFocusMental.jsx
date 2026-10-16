import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { listMentalEntries } from '../lib/trainingFocusApi'
import { formatDate } from '../lib/format'
import { useToast } from '../lib/ToastContext'
import { useOrg } from '../lib/OrgContext'

// Ablage "Mentaler Trainingsfokus": je Trainingsfokus-Eintrag Datum,
// Energie mental und die mentale Analyse untereinander. Ein Klick öffnet den
// zugehörigen Trainingsfokus.
export default function TrainingFocusMental({ onOpenEntry, onBack }) {
  const { t } = useTranslation()
  const { orgId, playerName } = useOrg()
  const toast = useToast()
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    listMentalEntries(orgId)
      .then((data) => !cancelled && setEntries(data))
      .catch((err) => {
        console.error(err)
        toast(t('trainingsfokus.loadFailed'))
      })
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId])

  return (
    <div className="view">
      <h1 className="section-title">{t('trainingsfokus.mentalTitle')}</h1>
      <p className="section-sub">{t('trainingsfokus.mentalSubtitle', { name: playerName })}</p>

      {!loading && entries.length === 0 && (
        <div className="empty-state">
          <div className="big-emoji">🧠</div>
          <p><strong>{t('trainingsfokus.mentalEmptyTitle')}</strong></p>
          <p>{t('trainingsfokus.mentalEmptyDesc')}</p>
        </div>
      )}

      <div className="mental-list">
        {entries.map((e) => (
          <div key={e.id} className="form-card mental-entry" onClick={() => onOpenEntry(e.id)}>
            <div className="mental-line"><span className="mental-label">{t('trainingsfokus.date')}</span><span>{formatDate(e.datum)}</span></div>
            <div className="mental-line"><span className="mental-label">{t('trainingsfokus.energyMental')}</span><span>{e.energie_mental ?? '–'}</span></div>
            <div className="mental-line mental-text"><span className="mental-label">{t('trainingsfokus.mentalAnalysis')}</span><span>{e.mental_analyse || '–'}</span></div>
          </div>
        ))}
      </div>

      <div className="breadcrumb-inline" style={{ marginTop: 14 }}>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onBack}>{t('trainingsfokus.backToList')}</button>
      </div>
    </div>
  )
}
