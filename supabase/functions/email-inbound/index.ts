// Triggered on a schedule by pg_cron (not by a logged-in browser), so
// there's no user session to check. Instead this only accepts requests
// carrying a dedicated CRON_SECRET as the bearer token (set only in the
// pg_cron job definition and here) — deliberately not the service_role
// key itself, to avoid handing that broader credential to a scheduled job.
//
// Polls the shared mailbox via IMAP for unread mail, and for each message
// whose sender matches an active team membership's email, pulls the first
// link out of the body and saves it exactly like the "Beispiele" paste-a-
// link form does (same preview logic, same table). Unknown senders and
// mails with no link are just marked read and skipped — no bounce, so we
// don't create spam/backscatter.
import { ImapFlow } from 'npm:imapflow@1'
import { simpleParser } from 'npm:mailparser@3'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { extractFirstUrl, getLinkPreview } from '../_shared/linkPreview.ts'

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
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

          if (senderEmail) {
            const { data: membership } = await admin
              .from('memberships')
              .select('org_id, user_id, email')
              .eq('email', senderEmail)
              .eq('status', 'active')
              .maybeSingle()

            if (membership) {
              const bodyText = parsed.text || parsed.html || ''
              const url = extractFirstUrl(bodyText)
              if (url) {
                const preview = await getLinkPreview(url)
                await admin.from('media_examples').insert({
                  org_id: membership.org_id,
                  url,
                  platform: preview.platform,
                  title: preview.title,
                  thumbnail_url: preview.thumbnail_url,
                  embed_html: preview.embed_html,
                  created_by: membership.user_id,
                  created_by_label: senderEmail,
                })
                entry.saved = true
              } else {
                entry.saved = false
                entry.reason = 'no_url_found'
              }
            } else {
              entry.saved = false
              entry.reason = 'unknown_sender'
            }
          } else {
            entry.saved = false
            entry.reason = 'no_sender'
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
