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
  await client.clearWorkingDir()

  console.log('Lade dist/ hoch …')
  await client.uploadFromDir(localDist)

  console.log('✅ Deploy erfolgreich — Seite ist aktualisiert.')
} catch (err) {
  console.error('❌ Deploy fehlgeschlagen:', err.message)
  process.exitCode = 1
} finally {
  client.close()
}
