import { useTranslation } from 'react-i18next'
import { OVERVIEW_ITEMS } from '../config/overviewItems'

export default function RolePermissionsEditor({ role, value, onChange }) {
  const { t } = useTranslation()

  const ROLE_LABELS = { management: t('rolePermissions.roleManagement'), trainer: t('rolePermissions.roleTrainer') }
  const RIGHTS = [
    { key: 'manage_permissions', label: t('rolePermissions.rightManagePermissions') },
    { key: 'invite_members', label: t('rolePermissions.rightInviteMembers') },
    { key: 'year_plan_entries', label: t('rolePermissions.rightYearPlanEntries'), confirmKey: 'year_plan_auto_confirm' },
    { key: 'calendar_entries', label: t('rolePermissions.rightCalendarEntries'), confirmKey: 'calendar_auto_confirm' },
    { key: 'confirm_termine', label: t('rolePermissions.rightConfirmTermine') },
    // Unterschalter nach demselben Muster wie oben: das Hauptrecht gibt den
    // Abo-Link überhaupt frei, der Unterschalter entscheidet, ob die
    // Jahresplanung im Abonnement mitkommt.
    {
      key: 'calendar_subscribe',
      label: t('rolePermissions.rightCalendarSubscribe'),
      confirmKey: 'calendar_feed_yearplan',
      confirmLabel: t('rolePermissions.calendarYearPlanSub'),
    },
  ]

  function toggle(key) {
    const next = { ...value, [key]: !value[key] }
    if (key === 'year_plan_entries' && !next.year_plan_entries) next.year_plan_auto_confirm = false
    if (key === 'calendar_entries' && !next.calendar_entries) next.calendar_auto_confirm = false
    if (key === 'calendar_subscribe' && !next.calendar_subscribe) next.calendar_feed_yearplan = false
    onChange(next)
  }

  const visibleTiles = value.visible_tiles ?? OVERVIEW_ITEMS.map((i) => i.key)

  function toggleTile(tileKey) {
    const isVisible = visibleTiles.includes(tileKey)
    const nextTiles = isVisible ? visibleTiles.filter((k) => k !== tileKey) : [...visibleTiles, tileKey]
    onChange({ ...value, visible_tiles: nextTiles.length === OVERVIEW_ITEMS.length ? null : nextTiles })
  }

  return (
    <div className="role-permissions-card">
      <h4>{ROLE_LABELS[role]}</h4>
      {RIGHTS.map((r) => (
        <div key={r.key}>
          <label className="perm-checkbox">
            <input type="checkbox" checked={!!value[r.key]} onChange={() => toggle(r.key)} />
            {r.label}
          </label>
          {r.confirmKey && value[r.key] && (
            <label className="perm-checkbox perm-checkbox-sub">
              <input type="checkbox" checked={!!value[r.confirmKey]} onChange={() => toggle(r.confirmKey)} />
              {r.confirmLabel || t('rolePermissions.autoConfirmSub')}
            </label>
          )}
        </div>
      ))}
      <div className="perm-tiles">
        <div className="perm-tiles-label">{t('rolePermissions.visibleTiles')}</div>
        <div className="perm-tiles-grid">
          {OVERVIEW_ITEMS.map((item) => (
            <label key={item.key} className="perm-checkbox">
              <input type="checkbox" checked={visibleTiles.includes(item.key)} onChange={() => toggleTile(item.key)} />
              {item.icon} {t(item.titleKey)}
            </label>
          ))}
        </div>
      </div>
    </div>
  )
}
