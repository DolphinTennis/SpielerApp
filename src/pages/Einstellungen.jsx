import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useOrg } from '../lib/OrgContext'
import { useToast } from '../lib/ToastContext'
import { useLanguage } from '../lib/useLanguage'
import { updateTheme } from '../lib/teamApi'

const THEMES = [
  { key: 'hardcourt', labelKey: 'einstellungen.themeHardcourt', colors: ['#1c63b7', '#f4f7fb', '#d7f23d'] },
  { key: 'gras', labelKey: 'einstellungen.themeGras', colors: ['#2e8b47', '#f3f8f1', '#d7f23d'] },
  { key: 'sand', labelKey: 'einstellungen.themeSand', colors: ['#c97a3d', '#fbf5ec', '#d7f23d'] },
]

export default function Einstellungen() {
  const { t } = useTranslation()
  const { orgId, role, theme } = useOrg()
  const { language, setLanguage } = useLanguage()
  const toast = useToast()
  const [current, setCurrent] = useState(theme)
  const [saving, setSaving] = useState(null)
  const [savingLanguage, setSavingLanguage] = useState(false)
  const canChange = role === 'spieler'

  async function handleSelect(key) {
    if (!canChange || key === current || saving) return
    setSaving(key)
    try {
      await updateTheme(orgId, key)
      setCurrent(key)
      document.documentElement.dataset.theme = key
      toast(t('einstellungen.changed'))
    } catch (err) {
      console.error(err)
      toast(t('einstellungen.changeFailed'))
    } finally {
      setSaving(null)
    }
  }

  async function handleLanguageChange(e) {
    const code = e.target.value
    setSavingLanguage(true)
    try {
      await setLanguage(code)
    } catch (err) {
      console.error(err)
      toast(t('teamManage.changeFailed'))
    } finally {
      setSavingLanguage(false)
    }
  }

  return (
    <div className="view">
      <h1 className="section-title">{t('einstellungen.title')}</h1>
      <p className="section-sub">{t('einstellungen.subtitle')}</p>

      <div className="settings-section">
        <h3>{t('einstellungen.colorSectionTitle')}</h3>
        <p className="section-hint">{canChange ? t('einstellungen.hintCanChange') : t('einstellungen.hintCannotChange')}</p>
        <div className="theme-picker">
          {THEMES.map((themeOption) => (
            <button
              key={themeOption.key}
              type="button"
              className={`theme-card${current === themeOption.key ? ' active' : ''}`}
              disabled={!canChange || saving}
              onClick={() => handleSelect(themeOption.key)}
            >
              <span className="theme-card-swatches">
                {themeOption.colors.map((c) => (
                  <span key={c} className="theme-card-swatch" style={{ background: c }} />
                ))}
              </span>
              <span className="theme-card-label">{t(themeOption.labelKey)}</span>
              {current === themeOption.key && <span className="theme-card-check">{t('einstellungen.active')}</span>}
            </button>
          ))}
        </div>
      </div>

      <div className="settings-section">
        <h3>{t('meineDaten.language')}</h3>
        <p className="section-hint">{t('meineDaten.languageHint')}</p>
        <select id="language-select" value={language} onChange={handleLanguageChange} disabled={savingLanguage} style={{ maxWidth: 220 }}>
          <option value="de">{t('meineDaten.languageDe')}</option>
          <option value="en">{t('meineDaten.languageEn')}</option>
        </select>
      </div>
    </div>
  )
}
