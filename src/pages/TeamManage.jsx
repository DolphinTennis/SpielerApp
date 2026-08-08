import { useEffect, useState } from 'react'
import { useOrg } from '../lib/OrgContext'
import { useToast } from '../lib/ToastContext'
import { inviteMember, listMembers } from '../lib/teamApi'

const ROLE_LABELS = { spieler: 'Spieler:in', management: 'Management / Eltern', trainer: 'Trainer' }

export default function TeamManage() {
  const { orgId, orgName, isAdmin } = useOrg()
  const toast = useToast()
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('trainer')
  const [inviting, setInviting] = useState(false)

  useEffect(() => {
    let cancelled = false
    listMembers(orgId)
      .then((data) => {
        if (!cancelled) setMembers(data)
      })
      .catch((err) => {
        console.error(err)
        toast('Team-Mitglieder konnten nicht geladen werden.')
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
      toast('Einladung an „' + email + '" verschickt.')
      setEmail('')
      const data = await listMembers(orgId)
      setMembers(data)
    } catch (err) {
      console.error(err)
      toast('Einladung fehlgeschlagen: ' + err.message)
    } finally {
      setInviting(false)
    }
  }

  if (!isAdmin) {
    return (
      <div className="view">
        <h1 className="section-title">Team verwalten</h1>
        <div className="empty-state">
          <div className="big-emoji">🔒</div>
          <p>
            <strong>Kein Zugriff.</strong>
          </p>
          <p>Nur Spieler:in und Management können das Team verwalten.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="view">
      <h1 className="section-title">Team verwalten</h1>
      <p className="section-sub">{orgName} — Mitglieder und Einladungen.</p>

      <form className="filter-bar" onSubmit={handleInvite} style={{ alignItems: 'end' }}>
        <div className="field">
          <label htmlFor="invite-email">E-Mail einladen</label>
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
          <label htmlFor="invite-role">Rolle</label>
          <select id="invite-role" value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="trainer">Trainer</option>
            <option value="management">Management / Eltern</option>
          </select>
        </div>
        <button type="submit" className="btn btn-primary" disabled={inviting}>
          {inviting ? 'Lädt …' : '+ Einladen'}
        </button>
      </form>

      <div className="list-head">
        <span style={{ fontSize: 13, color: 'var(--text-soft)', fontWeight: 600 }}>
          {loading ? 'Lädt …' : `${members.length} ${members.length === 1 ? 'Mitglied' : 'Mitglieder'}`}
        </span>
      </div>

      <div className="match-list">
        {members.map((m) => (
          <div className="match-row" key={m.id} style={{ cursor: 'default' }}>
            <div className="match-meta">
              <div className="opp">{m.email || 'Unbekannt'}</div>
              <div className="sub">
                <span>{ROLE_LABELS[m.role] || m.role}</span>
              </div>
            </div>
            {m.status === 'invited' && <span className="filed-tag">Eingeladen</span>}
          </div>
        ))}
      </div>
    </div>
  )
}
