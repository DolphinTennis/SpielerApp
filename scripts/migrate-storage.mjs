// Copies the contents of the `files` storage bucket from one Supabase
// project to another. The bucket itself is created by migration 003 when
// `supabase db push` runs against the new project, so only the objects need
// moving — and they must keep their exact paths, because those paths encode
// the org id that public.files rows and the storage policies both rely on.
//
// Goes through the Storage API rather than the database: uploading is what
// writes the storage.objects metadata and puts the bytes in the bucket's
// backing store. Copying storage.objects rows in SQL would produce metadata
// pointing at files that were never uploaded.
//
// Usage:
//   node --env-file=.env.migrate scripts/migrate-storage.mjs            # Probelauf
//   node --env-file=.env.migrate scripts/migrate-storage.mjs --execute  # kopiert
import { createClient } from '@supabase/supabase-js'

const BUCKET = 'files'
const PAGE = 100

const execute = process.argv.includes('--execute')

function fail(message) {
  console.error(`\n  ✗ ${message}\n`)
  process.exit(1)
}

const {
  SOURCE_SUPABASE_URL,
  SOURCE_SERVICE_ROLE_KEY,
  TARGET_SUPABASE_URL,
  TARGET_SERVICE_ROLE_KEY,
} = process.env

// service_role on both ends: the storage policies scope access to org
// members, and this script belongs to no org.
function client(url, key) {
  return createClient(url, key, { auth: { persistSession: false } })
}

// .list() is per-prefix and paginated; entries with a null id are folders.
async function listAll(supabase, prefix = '') {
  const found = []
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .list(prefix, { limit: PAGE, offset, sortBy: { column: 'name', order: 'asc' } })
    if (error) fail(`Auflisten von "${prefix || '/'}" fehlgeschlagen: ${error.message}`)
    if (!data || data.length === 0) break

    for (const entry of data) {
      const path = prefix ? `${prefix}/${entry.name}` : entry.name
      if (entry.id === null) {
        found.push(...(await listAll(supabase, path)))
      } else {
        found.push({ path, size: entry.metadata?.size ?? 0, mimetype: entry.metadata?.mimetype })
      }
    }
    if (data.length < PAGE) break
  }
  return found
}

async function main() {
  if (!SOURCE_SUPABASE_URL || !SOURCE_SERVICE_ROLE_KEY || !TARGET_SUPABASE_URL || !TARGET_SERVICE_ROLE_KEY) {
    fail('SOURCE_/TARGET_SUPABASE_URL und die zugehörigen SERVICE_ROLE_KEY fehlen. Siehe .env.migrate.example.')
  }
  if (SOURCE_SUPABASE_URL === TARGET_SUPABASE_URL) fail('Quelle und Ziel sind dasselbe Projekt.')

  const source = client(SOURCE_SUPABASE_URL, SOURCE_SERVICE_ROLE_KEY)
  const target = client(TARGET_SUPABASE_URL, TARGET_SERVICE_ROLE_KEY)

  console.log(`\n  Quelle: ${SOURCE_SUPABASE_URL}`)
  console.log(`  Ziel:   ${TARGET_SUPABASE_URL}`)
  console.log(execute ? '\n  Modus: SCHREIBEND\n' : '\n  Modus: Probelauf (kein Schreibvorgang)\n')

  const objects = await listAll(source)
  const totalBytes = objects.reduce((sum, o) => sum + o.size, 0)
  console.log(`  ${objects.length} Objekte, zusammen ${(totalBytes / 1024 / 1024).toFixed(1)} MB`)

  if (!execute) {
    for (const o of objects.slice(0, 20)) console.log(`    ${o.path}`)
    if (objects.length > 20) console.log(`    … und ${objects.length - 20} weitere`)
    console.log('\n  Probelauf beendet. Nichts geschrieben.\n')
    return
  }

  let copied = 0
  const failures = []

  for (const object of objects) {
    const { data, error: downloadError } = await source.storage.from(BUCKET).download(object.path)
    if (downloadError) {
      failures.push(`${object.path}: Herunterladen — ${downloadError.message}`)
      continue
    }

    // upsert so a re-run after an interruption overwrites the partially
    // copied tail instead of failing on everything already there.
    const { error: uploadError } = await target.storage
      .from(BUCKET)
      .upload(object.path, data, { upsert: true, contentType: object.mimetype || undefined })
    if (uploadError) {
      failures.push(`${object.path}: Hochladen — ${uploadError.message}`)
      continue
    }

    copied += 1
    if (copied % 25 === 0) console.log(`    ${copied}/${objects.length} …`)
  }

  console.log(`\n  ✓ ${copied} von ${objects.length} Objekten kopiert.`)
  if (failures.length) {
    console.log(`\n  ✗ ${failures.length} fehlgeschlagen:`)
    for (const f of failures) console.log(`    ${f}`)
    process.exitCode = 1
  }
  console.log()
}

main().catch((err) => fail(err.message))
