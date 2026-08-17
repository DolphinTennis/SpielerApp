// Uploads the built dist/ folder to all-inkl via FTPS.
// Run via `npm run deploy:allinkl` — never invoke this with credentials
// passed on the command line or logged anywhere; it reads them from
// .env.deploy (gitignored, see .env.deploy.example).
import { Client } from 'basic-ftp'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const REQUIRED_VARS = ['ALLINKL_FTP_HOST', 'ALLINKL_FTP_USER', 'ALLINKL_FTP_PASSWORD', 'ALLINKL_FTP_REMOTE_DIR']

const missing = REQUIRED_VARS.filter((key) => !process.env[key])
if (missing.length) {
  console.error('Fehlende Werte in .env.deploy: ' + missing.join(', '))
  console.error('Kopiere .env.deploy.example zu .env.deploy und trag deine all-inkl-FTP-Zugangsdaten ein.')
  process.exit(1)
}

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const localDist = path.join(__dirname, '..', 'dist')
const secure = process.env.ALLINKL_FTP_SECURE !== 'false'

const client = new Client()
client.ftp.verbose = false

const port = process.env.ALLINKL_FTP_PORT ? Number(process.env.ALLINKL_FTP_PORT) : undefined

// Names that must survive the wipe, comma-separated in ALLINKL_FTP_KEEP.
const keep = new Set(
  (process.env.ALLINKL_FTP_KEEP || '')
    .split(',')
    .map((name) => name.trim())
    .filter(Boolean)
)

// At all-inkl the document root of the main domain IS the FTP root, and the
// subdomain folders sit inside it — `/` here holds dolphintennis.com's own
// files next to dol.dolphintennis.com, tes.dolphintennis.com and dev.
// basic-ftp's clearWorkingDir() removes directories too, so deploying the
// main site would take every subdomain with it, including a whole separate
// project. Hence: never blind-clear. Anything that looks like a hostname and
// isn't explicitly listed in ALLINKL_FTP_KEEP stops the deploy instead of
// being deleted.
const HOSTNAME_LIKE = /^[a-z0-9-]+(\.[a-z0-9-]+)+$/i

async function clearTargetSafely(client) {
  const entries = await client.list()
  const doomed = entries.filter((entry) => !keep.has(entry.name))

  const wouldLoseADomain = doomed.filter((entry) => entry.isDirectory && HOSTNAME_LIKE.test(entry.name))
  if (wouldLoseADomain.length) {
    throw new Error(
      `Abbruch, um Datenverlust zu verhindern. Im Zielordner liegen Unterordner, die nach eigenen ` +
        `Domains aussehen und nicht geschützt sind: ${wouldLoseADomain.map((e) => e.name).join(', ')}. ` +
        `Trag sie in .env.deploy unter ALLINKL_FTP_KEEP ein (durch Komma getrennt), wenn sie stehen bleiben sollen.`
    )
  }

  for (const entry of doomed) {
    if (entry.isDirectory) await client.removeDir(entry.name)
    else await client.remove(entry.name)
  }

  const kept = entries.filter((entry) => keep.has(entry.name))
  console.log(`  ${doomed.length} Einträge entfernt${kept.length ? `, ${kept.length} geschützt: ${kept.map((e) => e.name).join(', ')}` : ''}`)
}

try {
  console.log(`Verbinde mit ${process.env.ALLINKL_FTP_HOST}${port ? ':' + port : ''} …`)
  await client.access({
    host: process.env.ALLINKL_FTP_HOST,
    port,
    user: process.env.ALLINKL_FTP_USER,
    password: process.env.ALLINKL_FTP_PASSWORD,
    secure,
  })

  await client.ensureDir(process.env.ALLINKL_FTP_REMOTE_DIR)
  console.log(`Leere Zielordner "${process.env.ALLINKL_FTP_REMOTE_DIR}" auf dem Server …`)
  await clearTargetSafely(client)

  console.log('Lade dist/ hoch …')
  await client.uploadFromDir(localDist)

  console.log('✅ Deploy erfolgreich — Seite ist aktualisiert.')
} catch (err) {
  console.error('❌ Deploy fehlgeschlagen:', err.message)
  process.exitCode = 1
} finally {
  client.close()
}
