import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useOrg } from '../lib/OrgContext'
import { useAuth } from '../lib/AuthContext'
import { useToast } from '../lib/ToastContext'
import { supabase } from '../lib/supabaseClient'
import { getRolePermissions, inviteMember, listMembers, updatePlayerName, updateRolePermissions } from '../lib/teamApi'
import RolePermissionsEditor from '../components/RolePermissionsEditor'

function splitName(fullName) {
  const parts = (fullName || '').trim().split(/\s+/)
  if (parts.length <= 1) return { vorname: parts[0] || '', nachname: '' }
  return { vorname: parts[0], nachname: parts.slice(1).join(' ') }
}

function MeineDaten() {
  const { t } = useTranslation()
  const { session } = useAuth()
  const { orgId, playerName } = useOrg()
  const toast = useToast()
  const [changingEmail, setChangingEmail] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [savingEmail, setSavingEmail] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)

  const initial = splitName(playerName)
  const [vorname, setVorname] = useState(initial.vorname)
  const [nachname, setNachname] = useState(initial.nachname)
  const [savingName, setSavingName] = useState(false)

  async function handleEmailChange(e) {
    e.preventDefault()
    if (!newEmail.trim()) return
    setSavingEmail(true)
    try {
      const { error } = await supabase.auth.updateUser({ email: newEmail.trim() })
      if (error) throw error
      toast(t('teamManage.confirmationSent', { email: newEmail.trim() }))
      setChangingEmail(false)
      setNewEmail('')
    } catch (err) {
      console.error(err)
      toast(t('teamManage.changeFailedWithError', { error: err.message }))
    } finally {
      setSavingEmail(false)
    }
  }

  async function handlePasswordChange(e) {
    e.preventDefault()
    if (!newPassword.trim()) return
    setSavingPassword(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword.trim() })
      if (error) throw error
      toast(t('teamManage.passwordChanged'))
      setChangingPassword(false)
      setNewPassword('')
    } catch (err) {
      console.error(err)
      toast(t('teamManage.passwordChangeFailed', { error: err.message }))
    } finally {
      setSavingPassword(false)
    }
  }

  async function handleNameSave(e) {
    e.preventDefault()
    setSavingName(true)
    try {
      await updatePlayerName(orgId, [vorname.trim(), nachname.trim()].filter(Boolean).join(' '))
      toast(t('teamManage.nameSaved'))
    } catch (err) {
      console.error(err)
      toast(t('teamManage.saveFailed'))
    } finally {
      setSavingName(false)
    }
  }

  return (
    <div className="settings-section">
      <h3>{t('teamManage.meineDatenTitle')}</h3>

      <div className="field" style={{ marginBottom: 16 }}>
        <label>{t('teamManage.loginMail')}</label>
        <div className="email-change-row">
          <span>{session?.user?.email}</span>
          {!changingEmail && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setChangingEmail(true)}>
              {t('teamManage.change')}
            </button>
          )}
        </div>
        {changingEmail && (
          <form className="email-change-form" onSubmit={handleEmailChange}>
            <div className="field" style={{ flex: 1 }}>
              <label htmlFor="new-email">{t('teamManage.newEmail')}</label>
              <input id="new-email" type="email" required value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
            </div>
            <button type="submit" className="btn btn-primary" disabled={savingEmail}>
              {savingEmail ? t('teamManage.sending') : t('teamManage.confirm')}
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setChangingEmail(false)}>
              {t('teamManage.cancel')}
            </button>
          </form>
        )}
      </div>

      <div className="field" style={{ marginBottom: 16 }}>
        <label>{t('teamManage.password')}</label>
        <div className="email-change-row">
          <span>••••••••</span>
          {!changingPassword && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setChangingPassword(true)}>
              {t('teamManage.change')}
            </button>
          )}
        </div>
        {changingPassword && (
          <form className="email-change-form" onSubmit={handlePasswordChange}>
            <div className="field" style={{ flex: 1 }}>
              <label htmlFor="new-password">{t('teamManage.newPassword')}</label>
              <input
                id="new-password"
                type="password"
                required
                minLength={6}
                placeholder={t('teamManage.newPasswordPlaceholder')}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={savingPassword}>
              {savingPassword ? t('teamManage.sending') : t('teamManage.confirm')}
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setChangingPassword(false)}>
              {t('teamManage.cancel')}
            </button>
          </form>
        )}
      </div>

      <form onSubmit={handleNameSave}>
        <p className="section-hint" style={{ margin: '0 0 10px' }}>
          {t('teamManage.playerNameHint')}
        </p>
        <div className="grid-fields" style={{ marginBottom: 12 }}>
          <div className="field">
            <label htmlFor="vorname">{t('teamManage.firstName')}</label>
            <input id="vorname" type="text" value={vorname} onChange={(e) => setVorname(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="nachname">{t('teamManage.lastName')}</label>
            <input id="nachname" type="text" value={nachname} onChange={(e) => setNachname(e.target.value)} />
          </div>
        </div>
        <button type="submit" className="btn btn-primary" disabled={savingName}>
          {savingName ? t('teamManage.saving') : t('teamManage.save')}
        </button>
      </form>
    </div>
  )
}

function Rollenverteilung({ orgId }) {
  const { t } = useTranslation()
  const toast = useToast()
  const [perms, setPerms] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    getRolePermissions(orgId)
      .then((data) => !cancelled && setPerms(data))
      .catch((err) => {
        console.error(err)
        toast(t('teamManage.rolePermissionsLoadFailed'))
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId])

  async function handleSave() {
    setSaving(true)
    try {
      await updateRolePermissions(orgId, perms)
      toast(t('teamManage.rolePermissionsSaved'))
    } catch (err) {
      console.error(err)
      toast(t('teamManage.rolePermissionsSaveFailed'))
    } finally {
      setSaving(false)
    }
  }

  if (!perms) return null

  return (
    <div className="settings-section">
      <h3>{t('teamManage.rolesTitle')}</h3>
      <p className="section-hint">{t('teamManage.rolesHint')}</p>

      <div className="role-permissions-fixed">
        <strong>{t('teamManage.roleSpieler')}</strong> — {t('teamManage.spielerFixedNote')}
      </div>

      <div className="role-permissions-grid">
        <RolePermissionsEditor role="management" value={perms.management} onChange={(v) => setPerms((p) => ({ ...p, management: v }))} />
        <RolePermissionsEditor role="trainer" value={perms.trainer} onChange={(v) => setPerms((p) => ({ ...p, trainer: v }))} />
      </div>

      <button type="button" className="btn btn-primary" style={{ marginTop: 16 }} onClick={handleSave} disabled={saving}>
        {saving ? t('teamManage.saving') : t('teamManage.saveRoles')}
      </button>
    </div>
  )
}

export default function TeamManage() {
  const { t } = useTranslation()
  const { orgId, orgName, isAdmin, permissions } = useOrg()
  const toast = useToast()
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('trainer')
  const [inviting, setInviting] = useState(false)

  const ROLE_LABELS = { spieler: t('teamManage.roleSpieler'), management: t('teamManage.roleManagement'), trainer: t('teamManage.roleTrainer') }

  useEffect(() => {
    let cancelled = false
    listMembers(orgId)
      .then((data) => {
        if (!cancelled) setMembers(data)
      })
      .catch((err) => {
        console.error(err)
        toast(t('teamManage.membersLoadFailed'))
      })
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId])

  async function handleInvite(e) {
    e.preventDefault()
    if (!email.trim()) return
    setInviting(true)
    try {
      await inviteMember({ email: email.trim(), role, orgId })
      toast(t('teamManage.inviteSent', { email }))
      setEmail('')
      const data = await listMembers(orgId)
      setMembers(data)
    } catch (err) {
      console.error(err)
      toast(t('teamManage.inviteFailed', { error: err.message }))
    } finally {
      setInviting(false)
    }
  }

  if (!isAdmin) {
    return (
      <div className="view">
        <h1 className="section-title">{t('teamManage.title')}</h1>
        <div className="empty-state">
          <div className="big-emoji">🔒</div>
          <p>
            <strong>{t('teamManage.noAccess')}</strong>
          </p>
          <p>{t('teamManage.noAccessDesc')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="view">
      <h1 className="section-title">{t('teamManage.title')}</h1>
      <p className="section-sub">{t('teamManage.subtitle', { orgName })}</p>

      <MeineDaten />

      <div className="settings-section">
        <h3>{t('teamManage.membersTitle')}</h3>

        {permissions?.invite_members && (
          <form className="filter-bar" onSubmit={handleInvite} style={{ alignItems: 'end' }}>
            <div className="field">
              <label htmlFor="invite-email">{t('teamManage.inviteEmail')}</label>
              <input
                id="invite-email"
                type="email"
                required
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="invite-role">{t('teamManage.role')}</label>
              <select id="invite-role" value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="trainer">{t('teamManage.roleTrainer')}</option>
                <option value="management">{t('teamManage.roleManagement')}</option>
              </select>
            </div>
            <button type="submit" className="btn btn-primary" disabled={inviting}>
              {inviting ? t('common.loading') : t('teamManage.invite')}
            </button>
          </form>
        )}

        <div className="list-head">
          <span style={{ fontSize: 13, color: 'var(--text-soft)', fontWeight: 600 }}>
            {loading ? t('common.loading') : `${members.length} ${members.length === 1 ? t('teamManage.countMember') : t('teamManage.countMembers')}`}
          </span>
        </div>

        <div className="match-list">
          {members.map((m) => (
            <div className="match-row" key={m.id} style={{ cursor: 'default' }}>
              <div className="match-meta">
                <div className="opp">{m.email || t('teamManage.unknown')}</div>
                <div className="sub">
                  <span>{ROLE_LABELS[m.role] || m.role}</span>
                </div>
              </div>
              {m.status === 'invited' && <span className="filed-tag">{t('teamManage.invited')}</span>}
            </div>
          ))}
        </div>
      </div>

      {permissions?.manage_permissions && <Rollenverteilung orgId={orgId} />}
    </div>
  )
}
