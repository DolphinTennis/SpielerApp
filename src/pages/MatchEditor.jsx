import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import FormCard from '../components/FormCard'
import { FORM1_CARDS, FORM2_FIELDS } from '../config/matchFormFields'
import { blankMatch, createMatch, getMatch, translateMatch, updateMatch } from '../lib/matchesApi'
import { buildMailBody, printInPage } from '../lib/matchExport'
import { syncGoalsForMatch } from '../lib/trainingGoalsApi'
import { formatDate } from '../lib/format'
import { useToast } from '../lib/ToastContext'
import { useAuth } from '../lib/AuthContext'
import { useOrg } from '../lib/OrgContext'
import { useLanguage } from '../lib/useLanguage'
import AutoTextarea from "../components/AutoTextarea"

export default function MatchEditor({ matchId, onBack }) {
  const { t } = useTranslation()
  const { language } = useLanguage()
  const { session } = useAuth()
  const { orgId, playerName } = useOrg()
  const toast = useToast()
  const [record, setRecord] = useState(null)
  const [tab, setTab] = useState(1)
  const [saving, setSaving] = useState(false)
  const [translation, setTranslation] = useState(null)
  const [translating, setTranslating] = useState(false)
  const [showTranslation, setShowTranslation] = useState(false)

  useEffect(() => {
    let cancelled = false
    if (matchId) {
      getMatch(matchId)
        .then((rec) => {
          if (cancelled) return
          // Fall back to the old `ziel` key so matches saved before the
          // rename still show their existing value — new saves only ever
          // write zieleMatch going forward.
          if (rec.form2 && rec.form2.zieleMatch === undefined) {
            rec.form2 = { ...rec.form2, zieleMatch: rec.form2.ziel || '' }
          }
          setRecord(rec)
        })
        .catch((err) => {
          console.error(err)
          toast(t('matchanalyse.editor.loadFailed'))
        })
    } else {
      setRecord(blankMatch(session.user.id, orgId, playerName))
    }
    setTab(1)
    setTranslation(null)
    setShowTranslation(false)
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId, orgId, playerName])

  function updateField(key, value) {
    setRecord((r) => ({ ...r, [key]: value }))
  }
  function updateForm1(key, value) {
    setRecord((r) => ({ ...r, form1: { ...r.form1, [key]: value } }))
  }
  function updateForm2(key, value) {
    setRecord((r) => ({ ...r, form2: { ...r.form2, [key]: value } }))
  }

  async function persist(rec, silent, msg) {
    setSaving(true)
    try {
      let saved
      if (rec.id) {
        const { id, created_at, updated_at, ...patch } = rec
        // Any save can change form1/form2, so any cached translation could
        // now be stale — clear it, the next "Übersetzen" click regenerates it.
        patch.translations = {}
        saved = await updateMatch(id, patch)
      } else {
        saved = await createMatch(rec)
      }
      setRecord(saved)
      if (msg) toast(msg)
      else if (!silent) toast(t('matchanalyse.editor.saved'))
      // Keeps the checkable goal list in Terminplanung in sync — doesn't
      // block the save flow if it fails, just logs it.
      syncGoalsForMatch({
        orgId: saved.org_id,
        matchId: saved.id,
        zieleMatch: saved.form2?.zieleMatch || '',
        zieleTraining: saved.form2?.zieleTraining || '',
        userLabel: session.user.email,
      }).catch((err) => console.error(err))
      return saved
    } catch (err) {
      console.error(err)
      toast(t('matchanalyse.editor.saveFailed'))
      throw err
    } finally {
      setSaving(false)
    }
  }

  async function handleSave() {
    try {
      await persist(record, false)
    } catch {
      /* toasted in persist */
    }
  }

  async function handlePrint(formNumber) {
    try {
      const saved = await persist(record, true)
      printInPage(saved, formNumber)
      toast(t('matchanalyse.editor.printDialog'))
    } catch (err) {
      if (err?.message) toast(err.message)
    }
  }

  async function handleMail() {
    try {
      const saved = await persist(record, true)
      const subject = encodeURIComponent('Matchanalyse ' + saved.spieler + ' - ' + (saved.gegner || '') + ' (' + formatDate(saved.datum) + ')')
      window.location.href = 'mailto:?subject=' + subject + '&body=' + buildMailBody(saved)
      toast(t('matchanalyse.editor.mailOpened'))
    } catch {
      /* toasted in persist */
    }
  }

  async function handleFile() {
    const updated = { ...record, filed: !record.filed }
    setRecord(updated)
    try {
      await persist(updated, true, updated.filed ? t('matchanalyse.editor.filedMsg') : t('matchanalyse.editor.unfiledMsg'))
    } catch {
      /* toasted in persist */
    }
  }

  async function handleTranslate() {
    if (showTranslation) {
      setShowTranslation(false)
      return
    }
    if (translation) {
      setShowTranslation(true)
      return
    }
    setTranslating(true)
    try {
      const saved = await persist(record, true)
      const result = await translateMatch(saved.id, language)
      setTranslation(result)
      setShowTranslation(true)
    } catch (err) {
      console.error(err)
      toast(err?.message || t('matchanalyse.editor.translateFailed'))
    } finally {
      setTranslating(false)
    }
  }

  async function handleNewForm() {
    try {
      await persist(record, true)
      setRecord(blankMatch(session.user.id, orgId, playerName))
      setTab(1)
      toast(t('matchanalyse.editor.newFormMsg'))
    } catch {
      /* toasted in persist */
    }
  }

  if (!record) return null

  const displayForm1 = showTranslation && translation ? translation.form1 : record.form1
  const displayForm2 = showTranslation && translation ? translation.form2 : record.form2

  return (
    <div className="view">
      <h1 className="section-title">{t('matchanalyse.editor.title')}</h1>
      <p className="section-sub">{playerName}</p>
      {showTranslation && (
        <div className="aaa-note" style={{ marginBottom: 14 }}>
          {t('matchanalyse.editor.translatedBanner')}
        </div>
      )}

      <div className="editor-header">
        <div className="field">
          <label htmlFor="e-verlauf">{t('matchanalyse.editor.matchProgress')}</label>
          <AutoTextarea
            id="e-verlauf"
            placeholder={t('matchanalyse.editor.matchProgressPlaceholder')}
            style={{ minHeight: 52 }}
            value={record.verlauf || ''}
            onChange={(e) => updateField('verlauf', e.target.value)}
          />
        </div>
        <div className="grid-fields">
          <div className="field">
            <label htmlFor="e-date">{t('matchanalyse.editor.matchDate')}</label>
            <input id="e-date" type="date" value={record.datum || ''} onChange={(e) => updateField('datum', e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="e-opp">{t('matchanalyse.editor.opponentName')}</label>
            <input
              id="e-opp"
              type="text"
              placeholder={t('matchanalyse.editor.opponentPlaceholder')}
              value={record.gegner || ''}
              onChange={(e) => updateField('gegner', e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="e-result">{t('matchanalyse.editor.result')}</label>
            <input
              id="e-result"
              type="text"
              placeholder={t('matchanalyse.editor.resultPlaceholder')}
              value={record.ergebnis || ''}
              onChange={(e) => updateField('ergebnis', e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="e-tourn">{t('matchanalyse.editor.tournament')}</label>
            <input
              id="e-tourn"
              type="text"
              placeholder={t('matchanalyse.editor.tournamentPlaceholder')}
              value={record.turnier || ''}
              onChange={(e) => updateField('turnier', e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="tabs">
        <div className={`tab${tab === 1 ? ' active' : ''}`} onClick={() => setTab(1)}>
          {t('matchanalyse.editor.tab1')}
        </div>
        <div className={`tab${tab === 2 ? ' active' : ''}`} onClick={() => setTab(2)}>
          {t('matchanalyse.editor.tab2')}
        </div>
      </div>

      <div className={`form-panel${tab === 1 ? ' active' : ''}`}>
        {FORM1_CARDS.map((card) => (
          <FormCard key={card.titleKey} card={card} values={displayForm1} onChange={updateForm1} readOnly={showTranslation} />
        ))}
        <FormCard
          card={{
            titleKey: 'matchanalyse.editor.goalsCardTitle',
            num: 4,
            blocks: [
              {
                type: 'fields',
                fields: [
                  { key: 'zieleMatch', labelKey: FORM2_FIELDS.zieleMatch },
                  { key: 'zieleTraining', labelKey: FORM2_FIELDS.zieleTraining },
                ],
              },
            ],
          }}
          values={displayForm2}
          onChange={updateForm2}
          readOnly={showTranslation}
        />
      </div>

      <div className={`form-panel${tab === 2 ? ' active' : ''}`}>
        <div className="form-card">
          <h4>{t('matchanalyse.editor.tripleATitle')}</h4>
          <p className="hint">{t('matchanalyse.editor.tripleAHint')}</p>
          <div className="aaa-note">{t('matchanalyse.editor.tripleANote')}</div>
          <div className="two-col">
            <div className="qgroup">
              <label className="qlabel">{t(FORM2_FIELDS.gut)}</label>
              {showTranslation ? (
                <div className="qvalue">{displayForm2.gut || '–'}</div>
              ) : (
                <AutoTextarea style={{ minHeight: 110 }} value={record.form2.gut} onChange={(e) => updateForm2('gut', e.target.value)} />
              )}
            </div>
            <div className="qgroup">
              <label className="qlabel">{t(FORM2_FIELDS.nicht)}</label>
              {showTranslation ? (
                <div className="qvalue">{displayForm2.nicht || '–'}</div>
              ) : (
                <AutoTextarea style={{ minHeight: 110 }} value={record.form2.nicht} onChange={(e) => updateForm2('nicht', e.target.value)} />
              )}
            </div>
          </div>
          <div className="qgroup">
            <label className="qlabel">{t(FORM2_FIELDS.warum)}</label>
            {showTranslation ? (
              <div className="qvalue">{displayForm2.warum || '–'}</div>
            ) : (
              <AutoTextarea value={record.form2.warum} onChange={(e) => updateForm2('warum', e.target.value)} />
            )}
          </div>
          <div className="qgroup">
            <label className="qlabel">{t(FORM2_FIELDS.zieleMatch)}</label>
            {showTranslation ? (
              <div className="qvalue">{displayForm2.zieleMatch || '–'}</div>
            ) : (
              <AutoTextarea value={record.form2.zieleMatch} onChange={(e) => updateForm2('zieleMatch', e.target.value)} />
            )}
          </div>
          <div className="qgroup">
            <label className="qlabel">{t(FORM2_FIELDS.zieleTraining)}</label>
            {showTranslation ? (
              <div className="qvalue">{displayForm2.zieleTraining || '–'}</div>
            ) : (
              <AutoTextarea value={record.form2.zieleTraining} onChange={(e) => updateForm2('zieleTraining', e.target.value)} />
            )}
          </div>
        </div>
      </div>

      <div className="action-bar">
        <div className="left-actions">
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {t('matchanalyse.editor.save')}
          </button>
          <button className="btn btn-outline" onClick={() => handlePrint(1)} disabled={saving}>
            {t('matchanalyse.editor.printForm1')}
          </button>
          <button className="btn btn-outline" onClick={() => handlePrint(2)} disabled={saving}>
            {t('matchanalyse.editor.printForm2')}
          </button>
          <button className="btn btn-outline" onClick={handleMail} disabled={saving}>
            {t('matchanalyse.editor.sendMail')}
          </button>
          <button className="btn btn-outline" onClick={handleTranslate} disabled={saving || translating}>
            {translating ? t('matchanalyse.editor.translating') : showTranslation ? t('matchanalyse.editor.showOriginal') : t('matchanalyse.editor.translate')}
          </button>
        </div>
        <div className="right-actions">
          <button className="btn btn-ghost" onClick={handleFile} disabled={saving}>
            {t('matchanalyse.editor.file')}
          </button>
          <button className="btn btn-clay" onClick={handleNewForm} disabled={saving}>
            {t('matchanalyse.editor.newForm')}
          </button>
        </div>
      </div>

      <div className="breadcrumb-inline" style={{ marginTop: 14 }}>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onBack}>
          {t('matchanalyse.editor.backToList')}
        </button>
      </div>
    </div>
  )
}
