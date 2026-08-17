// Copies table data from one Supabase project's Postgres to another —
// the data half of a project move. The *schema* half is not this script's
// job: `supabase db push` replays the migrations in supabase/migrations/
// against the new project and recreates every table, policy, function,
// trigger and the storage bucket. Only rows need carrying over.
//
// Usage (see docs/datenbank-umzug.md for the full runbook):
//   node --env-file=.env.migrate scripts/migrate-data.mjs            # Probelauf
//   node --env-file=.env.migrate scripts/migrate-data.mjs --execute  # schreibt
//
// Deliberately dry-run by default: this writes into auth.users of a live
// project, and a mistyped connection string should cost nothing.
import pg from 'pg'

const SOURCE_URL = process.env.SOURCE_DB_URL
const TARGET_URL = process.env.TARGET_DB_URL

const execute = process.argv.includes('--execute')
const force = process.argv.includes('--force')

// Order matters — foreign keys. auth.users first (everything hangs off it),
// then organizations/memberships, then the org-scoped tables. Within
// public, folders precedes files (files.folder_id), training_sessions
// precedes its exceptions, matches precedes training_goals.
const TABLES = [
  'auth.users',
  'auth.identities',
  'public.organizations',
  'public.memberships',
  'public.folders',
  'public.matches',
  'public.files',
  'public.live_matches',
  'public.year_plan_days',
  'public.training_sessions',
  'public.training_session_exceptions',
  'public.training_goals',
  'public.training_focus_entries',
  'public.media_examples',
]

// Postgres accepts at most 65535 bind parameters per statement, and one
// batch spends (rows × columns) of them. auth.users alone is around 35
// columns wide, so the batch size has to follow the table rather than be a
// fixed number.
const MAX_ROWS_PER_BATCH = 500
const MAX_BIND_PARAMS = 60000

function batchSize(columnCount) {
  return Math.max(1, Math.min(MAX_ROWS_PER_BATCH, Math.floor(MAX_BIND_PARAMS / columnCount)))
}

function fail(message) {
  console.error(`\n  ✗ ${message}\n`)
  process.exit(1)
}

// Both sides run their own GoTrue/Postgres version, and auth.users in
// particular gains columns between releases. Copying the intersection keeps
// a version gap from turning into a failed insert halfway through.
async function sharedColumns(source, target, schema, table) {
  const query = `
    select column_name
    from information_schema.columns
    where table_schema = $1 and table_name = $2
      and is_generated = 'NEVER' and identity_generation is null
    order by ordinal_position
  `
  const [a, b] = await Promise.all([
    source.query(query, [schema, table]),
    target.query(query, [schema, table]),
  ])
  const inTarget = new Set(b.rows.map((r) => r.column_name))
  const shared = a.rows.map((r) => r.column_name).filter((c) => inTarget.has(c))
  const onlySource = a.rows.map((r) => r.column_name).filter((c) => !inTarget.has(c))
  return { shared, onlySource }
}

async function copyTable(source, target, qualified) {
  const [schema, table] = qualified.split('.')

  const { shared, onlySource } = await sharedColumns(source, target, schema, table)
  if (shared.length === 0) fail(`${qualified}: keine gemeinsamen Spalten — existiert die Tabelle im Ziel?`)

  const { rows: [{ count: sourceCount }] } = await source.query(`select count(*)::int as count from ${qualified}`)
  const { rows: [{ count: targetCount }] } = await target.query(`select count(*)::int as count from ${qualified}`)

  const note = onlySource.length ? `  (übersprungen, fehlen im Ziel: ${onlySource.join(', ')})` : ''
  console.log(`  ${qualified.padEnd(34)} Quelle ${String(sourceCount).padStart(6)}   Ziel ${String(targetCount).padStart(6)}${note}`)

  if (targetCount > 0 && !force) {
    fail(`${qualified} ist im Ziel nicht leer (${targetCount} Zeilen). Erst leeren, oder --force setzen.`)
  }
  if (!execute || sourceCount === 0) return { table: qualified, copied: 0 }

  const columnList = shared.map((c) => `"${c}"`).join(', ')
  const batch = batchSize(shared.length)
  let copied = 0

  for (let offset = 0; offset < sourceCount; offset += batch) {
    // Ordered by ctid so paging is stable — these tables have no single
    // shared sort key, and an unordered LIMIT/OFFSET may repeat or skip rows.
    const { rows } = await source.query(
      `select ${columnList} from ${qualified} order by ctid limit ${batch} offset ${offset}`
    )
    if (rows.length === 0) break

    const values = []
    const tuples = rows.map((row) => {
      const placeholders = shared.map((c) => {
        values.push(row[c])
        return `$${values.length}`
      })
      return `(${placeholders.join(', ')})`
    })

    // on conflict do nothing so a re-run after a partial failure resumes
    // instead of aborting on the rows that already made it across.
    await target.query(
      `insert into ${qualified} (${columnList}) values ${tuples.join(', ')} on conflict do nothing`,
      values
    )
    copied += rows.length
  }

  return { table: qualified, copied }
}

async function main() {
  if (!SOURCE_URL || !TARGET_URL) {
    fail('SOURCE_DB_URL und TARGET_DB_URL fehlen. Siehe .env.migrate.example.')
  }
  if (SOURCE_URL === TARGET_URL) {
    fail('SOURCE_DB_URL und TARGET_DB_URL sind identisch.')
  }

  const source = new pg.Client({ connectionString: SOURCE_URL, ssl: { rejectUnauthorized: false } })
  const target = new pg.Client({ connectionString: TARGET_URL, ssl: { rejectUnauthorized: false } })
  await source.connect()
  await target.connect()

  const [{ rows: [src] }, { rows: [tgt] }] = await Promise.all([
    source.query('select current_database() as db, inet_server_addr()::text as host'),
    target.query('select current_database() as db, inet_server_addr()::text as host'),
  ])
  console.log(`\n  Quelle: ${src.db} @ ${src.host}`)
  console.log(`  Ziel:   ${tgt.db} @ ${tgt.host}`)
  console.log(execute ? '\n  Modus: SCHREIBEND\n' : '\n  Modus: Probelauf (kein Schreibvorgang) — mit --execute wird kopiert\n')

  const results = []
  try {
    for (const table of TABLES) {
      results.push(await copyTable(source, target, table))
    }
  } finally {
    await source.end()
    await target.end()
  }

  if (execute) {
    const total = results.reduce((sum, r) => sum + r.copied, 0)
    console.log(`\n  ✓ ${total} Zeilen kopiert.`)
    console.log('  Nächster Schritt: node --env-file=.env.migrate scripts/migrate-storage.mjs --execute\n')
  } else {
    console.log('\n  Probelauf beendet. Nichts geschrieben.\n')
  }
}

main().catch((err) => fail(err.message))
