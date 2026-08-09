// Triggered on a schedule by pg_cron (not by a logged-in browser), so
// there's no user session to check. Instead this only accepts requests
// carrying a dedicated CRON_SECRET as the bearer token (set only in the
// pg_cron job definition and here) — deliberately not the service_role
// key itself, to avoid handing that broader credential to a scheduled job.
//
// Polls the shared mailbox via IMAP for unread mail. Anyone can send to
// this address — instead of checking the sender's identity, a message is
// only processed if its subject or body contains a team's player's first
// name (the "Admin"/Spieler role's given name, e.g. "Naila") as a
// standalone word. Matching that word picks which team the link belongs
// to. No match → ignored (marked read, not saved, no bounce, so we don't
// create spam/backscatter).
import { ImapFlow } from 'npm:imapflow@1'
import { simpleParser } from 'npm:mailparser@3'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { extractFirstUrl, getLinkPreview } from '../_shared/linkPreview.ts'

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

function escapeRegex(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Finds an organization whose player's first name appears as a whole word
// in the given text (case-insensitive) — e.g. "Naila Wieland" matches on
// the word "Naila", not on "Nailas" or as a substring of something else.
function matchOrgByPlayerFirstName<T extends { player_name: string | null }>(orgs: T[], text: string): T | null {
  for (const org of orgs) {
    const firstName = org.player_name?.trim().split(/\s+/)[0]
    if (!firstName) continue
    const re = new RegExp(`\\b${escapeRegex(firstName)}\\b`, 'i')
    if (re.test(text)) return org
  }
  return null
}

Deno.serve(async (req) => {
  const authHeader = req.headers.get('Authorization') || ''
  if (authHeader !== `Bearer ${Deno.env.get('CRON_SECRET')!}`) {
    return json({ error: 'Nicht autorisiert.' }, 401)
  }

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const client = new ImapFlow({
    host: Deno.env.get('MAILBOX_HOST')!,
    port: Number(Deno.env.get('MAILBOX_IMAP_PORT')!),
    secure: true,
    auth: {
      user: Deno.env.get('MAILBOX_USER')!,
      pass: Deno.env.get('MAILBOX_PASSWORD')!,
    },
    logger: false,
  })

  const { data: orgs } = await admin.from('organizations').select('id, player_name')

  const results: unknown[] = []
  try {
    await client.connect()
    const lock = await client.getMailboxLock('INBOX')
    try {
      const uids = await client.search({ seen: false }, { uid: true })
      for (const uid of uids) {
        const entry: Record<string, unknown> = { uid }
        try {
          const msg = await client.fetchOne(uid, { source: true }, { uid: true })
          const parsed = await simpleParser(msg.source as Buffer)
          const senderEmail = parsed.from?.value?.[0]?.address?.toLowerCase() || null
          entry.sender = senderEmail

          const bodyText = parsed.text || parsed.html || ''
          const searchText = `${parsed.subject || ''}\n${bodyText}`
          const matchedOrg = matchOrgByPlayerFirstName(orgs || [], searchText)

          if (matchedOrg) {
            const url = extractFirstUrl(bodyText)
            if (url) {
              const preview = await getLinkPreview(url)
              await admin.from('media_examples').insert({
                org_id: matchedOrg.id,
                url,
                platform: preview.platform,
                title: preview.title,
                thumbnail_url: preview.thumbnail_url,
                embed_html: preview.embed_html,
                created_by_label: senderEmail || 'Per E-Mail geteilt',
              })
              entry.saved = true
              entry.org_id = matchedOrg.id
            } else {
              entry.saved = false
              entry.reason = 'no_url_found'
            }
          } else {
            entry.saved = false
            entry.reason = 'no_codeword_match'
          }
        } catch (err) {
          entry.saved = false
          entry.error = err instanceof Error ? err.message : String(err)
        }
        await client.messageFlagsAdd(uid, ['\\Seen'], { uid: true })
        results.push(entry)
      }
    } finally {
      lock.release()
    }
    await client.logout()
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : String(err), results }, 500)
  }

  return json({ processed: results.length, results })
})
