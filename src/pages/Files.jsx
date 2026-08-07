import { useEffect, useMemo, useRef, useState } from 'react'
import FileRow from '../components/FileRow'
import FilePreviewModal from '../components/FilePreviewModal'
import { useAuth } from '../lib/AuthContext'
import { useToast } from '../lib/ToastContext'
import {
  assignFileToFolder,
  createFolder,
  deleteFile,
  deleteFolder,
  getSignedUrl,
  listFiles,
  listFolders,
  uploadFile,
} from '../lib/filesApi'

function sortFiles(list, sort) {
  const sorted = list.slice()
  switch (sort) {
    case 'name-asc':
      sorted.sort((a, b) => a.name.localeCompare(b.name, 'de'))
      break
    case 'name-desc':
      sorted.sort((a, b) => b.name.localeCompare(a.name, 'de'))
      break
    case 'date-asc':
      sorted.sort((a, b) => a.created_at.localeCompare(b.created_at))
      break
    case 'date-desc':
      sorted.sort((a, b) => b.created_at.localeCompare(a.created_at))
      break
    case 'type-asc':
      sorted.sort((a, b) => a.type.localeCompare(b.type, 'de') || a.name.localeCompare(b.name, 'de'))
      break
    case 'type-desc':
      sorted.sort((a, b) => b.type.localeCompare(a.type, 'de') || a.name.localeCompare(b.name, 'de'))
      break
  }
  return sorted
}

export default function Files() {
  const { session } = useAuth()
  const toast = useToast()
  const userId = session.user.id
  const fileInputRef = useRef(null)

  const [folders, setFolders] = useState([])
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentFolderId, setCurrentFolderId] = useState(null)
  const [newFolderName, setNewFolderName] = useState('')
  const [filters, setFilters] = useState({ name: '', datum: '', type: '' })
  const [sort, setSort] = useState('date-desc')
  const [uploading, setUploading] = useState(false)
  const [previewFile, setPreviewFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [previewLoading, setPreviewLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    Promise.all([listFolders(), listFiles()])
      .then(([f, fl]) => {
        if (cancelled) return
        setFolders(f)
        setFiles(fl)
      })
      .catch((err) => {
        console.error(err)
        toast('Dateien konnten nicht geladen werden.')
      })
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const folderCounts = useMemo(() => {
    const counts = {}
    for (const f of files) {
      if (f.folder_id) counts[f.folder_id] = (counts[f.folder_id] || 0) + 1
    }
    return counts
  }, [files])

  const scopedFiles = useMemo(
    () => (currentFolderId ? files.filter((f) => f.folder_id === currentFolderId) : files.filter((f) => !f.folder_id)),
    [files, currentFolderId]
  )

  const filtered = useMemo(() => {
    const matching = scopedFiles.filter((f) => {
      if (filters.name && !f.name.toLowerCase().includes(filters.name.toLowerCase())) return false
      if (filters.datum && f.created_at.slice(0, 10) !== filters.datum) return false
      if (filters.type && f.type !== filters.type) return false
      return true
    })
    return sortFiles(matching, sort)
  }, [scopedFiles, filters, sort])

  async function handleAddFolder() {
    const name = newFolderName.trim()
    if (!name) {
      toast('Bitte einen Ordnernamen eingeben.')
      return
    }
    try {
      const folder = await createFolder(userId, name)
      setFolders((prev) => [...prev, folder].sort((a, b) => a.name.localeCompare(b.name, 'de')))
      setNewFolderName('')
      toast('Ordner „' + name + '" angelegt.')
    } catch (err) {
      console.error(err)
      toast('Ordner konnte nicht angelegt werden.')
    }
  }

  async function handleDeleteFolder(folder) {
    try {
      await deleteFolder(folder.id)
      setFolders((prev) => prev.filter((f) => f.id !== folder.id))
      setFiles((prev) => prev.map((f) => (f.folder_id === folder.id ? { ...f, folder_id: null } : f)))
      if (currentFolderId === folder.id) setCurrentFolderId(null)
      toast('Ordner „' + folder.name + '" gelöscht — Dateien sind jetzt nicht mehr zugeordnet.')
    } catch (err) {
      console.error(err)
      toast('Ordner konnte nicht gelöscht werden.')
    }
  }

  async function handleAssignFolder(fileId, folderId) {
    try {
      await assignFileToFolder(fileId, folderId)
      setFiles((prev) => prev.map((f) => (f.id === fileId ? { ...f, folder_id: folderId || null } : f)))
    } catch (err) {
      console.error(err)
      toast('Ordner-Zuordnung fehlgeschlagen.')
    }
  }

  async function handleFileSelected(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setUploading(true)
    try {
      const saved = await uploadFile(userId, file, currentFolderId)
      setFiles((prev) => [saved, ...prev])
      toast('Datei „' + file.name + '" hochgeladen.')
    } catch (err) {
      console.error(err)
      toast('Upload fehlgeschlagen: ' + (err.message || 'Unbekannter Fehler'))
    } finally {
      setUploading(false)
    }
  }

  async function handleOpenFile(file) {
    setPreviewFile(file)
    setPreviewLoading(true)
    try {
      const url = await getSignedUrl(file.storage_path)
      setPreviewUrl(url)
    } catch (err) {
      console.error(err)
      toast('Datei konnte nicht geöffnet werden.')
    } finally {
      setPreviewLoading(false)
    }
  }

  function closePreview() {
    setPreviewFile(null)
    setPreviewUrl(null)
  }

  async function handleDeletePreviewFile() {
    if (!previewFile) return
    try {
      await deleteFile(previewFile)
      setFiles((prev) => prev.filter((f) => f.id !== previewFile.id))
      toast('Datei gelöscht.')
      closePreview()
    } catch (err) {
      console.error(err)
      toast('Datei konnte nicht gelöscht werden.')
    }
  }

  const currentFolder = currentFolderId ? folders.find((f) => f.id === currentFolderId) : null

  return (
    <div className="view">
      <h1 className="section-title">Meine Dateien</h1>
      <p className="section-sub">Dokumente, Bilder, Videos und mehr — in Ordnern organisieren, durchsuchen, sortieren.</p>

      {!currentFolderId && (
        <div className="folder-create-row">
          <input
            type="text"
            placeholder="Neuer Ordner, z. B. Ziele, Musik, Matchanalysen …"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddFolder()}
          />
          <button className="btn btn-primary btn-sm" onClick={handleAddFolder}>
            + Ordner anlegen
          </button>
        </div>
      )}

      {currentFolderId && (
        <div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setCurrentFolderId(null)}>
            ← Alle Ordner
          </button>
          <h3 className="folder-context-title">📂 {currentFolder ? currentFolder.name : 'Ordner'}</h3>
        </div>
      )}

      {!currentFolderId && folders.length > 0 && (
        <div className="folder-grid">
          {folders.map((folder) => {
            const count = folderCounts[folder.id] || 0
            return (
              <div className="folder-btn" key={folder.id} onClick={() => setCurrentFolderId(folder.id)}>
                <button
                  className="folder-delete"
                  title="Ordner löschen"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDeleteFolder(folder)
                  }}
                >
                  ×
                </button>
                <div className="folder-icon">📂</div>
                <div className="folder-name">{folder.name}</div>
                <div className="folder-count">
                  {count} {count === 1 ? 'Datei' : 'Dateien'}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className="filter-bar">
        <div className="field">
          <label htmlFor="ff-name">Name</label>
          <input
            id="ff-name"
            type="text"
            placeholder="z. B. Trainingsplan"
            value={filters.name}
            onChange={(e) => setFilters((f) => ({ ...f, name: e.target.value }))}
          />
        </div>
        <div className="field">
          <label htmlFor="ff-date">Datum (gespeichert am)</label>
          <input
            id="ff-date"
            type="date"
            value={filters.datum}
            onChange={(e) => setFilters((f) => ({ ...f, datum: e.target.value }))}
          />
        </div>
        <div className="field">
          <label htmlFor="ff-type">Dateiart</label>
          <select id="ff-type" value={filters.type} onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value }))}>
            <option value="">Alle Dateiarten</option>
            <option value="Bild">Bild</option>
            <option value="Video">Video</option>
            <option value="PDF">PDF</option>
            <option value="Dokument">Dokument</option>
            <option value="Audio">Audio</option>
            <option value="Sonstiges">Sonstiges</option>
          </select>
        </div>
        <div className="field sort-field">
          <label htmlFor="ff-sort">Sortierung</label>
          <select id="ff-sort" value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="name-asc">A–Z (Name)</option>
            <option value="name-desc">Z–A (Name)</option>
            <option value="date-desc">Datum (neueste zuerst)</option>
            <option value="date-asc">Datum (älteste zuerst)</option>
            <option value="type-asc">Dateiart (aufsteigend)</option>
            <option value="type-desc">Dateiart (absteigend)</option>
          </select>
        </div>
        <button className="btn btn-ghost" onClick={() => setFilters({ name: '', datum: '', type: '' })}>
          Filter löschen
        </button>
      </div>

      <div className="list-head">
        <span style={{ fontSize: 13, color: 'var(--text-soft)', fontWeight: 600 }}>
          {loading
            ? 'Lädt …'
            : `${filtered.length} ${filtered.length === 1 ? 'Datei' : 'Dateien'}` + (currentFolderId ? '' : ' · ohne Ordner')}
        </span>
        <button className="btn btn-primary" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
          {uploading ? 'Lädt hoch …' : '+ Datei hochladen'}
        </button>
        <input ref={fileInputRef} type="file" style={{ display: 'none' }} onChange={handleFileSelected} />
      </div>

      {!loading && filtered.length === 0 && (
        <div className="empty-state">
          <div className="big-emoji">📁</div>
          <p>
            <strong>Keine Dateien gefunden.</strong>
          </p>
          <p>{currentFolderId ? 'Diesem Ordner sind noch keine Dateien zugeordnet.' : 'Passe die Filter an oder lade eine neue Datei hoch.'}</p>
        </div>
      )}

      <div className="match-list">
        {filtered.map((file) => (
          <FileRow key={file.id} file={file} folders={folders} onOpen={() => handleOpenFile(file)} onAssignFolder={handleAssignFolder} />
        ))}
      </div>

      <FilePreviewModal file={previewFile} url={previewUrl} loading={previewLoading} onClose={closePreview} onDelete={handleDeletePreviewFile} />
    </div>
  )
}
