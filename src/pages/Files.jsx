import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import FileRow from '../components/FileRow'
import FilePreviewModal from '../components/FilePreviewModal'
import { useAuth } from '../lib/AuthContext'
import { useOrg } from '../lib/OrgContext'
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
  const { t } = useTranslation()
  const { session } = useAuth()
  const { orgId } = useOrg()
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
    Promise.all([listFolders(orgId), listFiles(orgId)])
      .then(([f, fl]) => {
        if (cancelled) return
        setFolders(f)
        setFiles(fl)
      })
      .catch((err) => {
        console.error(err)
        toast(t('files.loadFailed'))
      })
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId])

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
      toast(t('files.folderNameRequired'))
      return
    }
    try {
      const folder = await createFolder(orgId, name)
      setFolders((prev) => [...prev, folder].sort((a, b) => a.name.localeCompare(b.name, 'de')))
      setNewFolderName('')
      toast(t('files.folderCreated', { name }))
    } catch (err) {
      console.error(err)
      toast(t('files.folderCreateFailed'))
    }
  }

  async function handleDeleteFolder(folder) {
    try {
      await deleteFolder(folder.id)
      setFolders((prev) => prev.filter((f) => f.id !== folder.id))
      setFiles((prev) => prev.map((f) => (f.folder_id === folder.id ? { ...f, folder_id: null } : f)))
      if (currentFolderId === folder.id) setCurrentFolderId(null)
      toast(t('files.folderDeleted', { name: folder.name }))
    } catch (err) {
      console.error(err)
      toast(t('files.folderDeleteFailed'))
    }
  }

  async function handleAssignFolder(fileId, folderId) {
    try {
      await assignFileToFolder(fileId, folderId)
      setFiles((prev) => prev.map((f) => (f.id === fileId ? { ...f, folder_id: folderId || null } : f)))
    } catch (err) {
      console.error(err)
      toast(t('files.folderAssignFailed'))
    }
  }

  async function handleFileSelected(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setUploading(true)
    try {
      const saved = await uploadFile(userId, orgId, file, currentFolderId)
      setFiles((prev) => [saved, ...prev])
      toast(t('files.fileUploaded', { name: file.name }))
    } catch (err) {
      console.error(err)
      toast(t('files.uploadFailed', { error: err.message || t('files.unknownError') }))
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
      toast(t('files.openFailed'))
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
      toast(t('files.fileDeleted'))
      closePreview()
    } catch (err) {
      console.error(err)
      toast(t('files.fileDeleteFailed'))
    }
  }

  const currentFolder = currentFolderId ? folders.find((f) => f.id === currentFolderId) : null

  return (
    <div className="view">
      <h1 className="section-title">{t('files.title')}</h1>
      <p className="section-sub">{t('files.subtitle')}</p>

      {!currentFolderId && (
        <div className="folder-create-row">
          <input
            type="text"
            placeholder={t('files.newFolderPlaceholder')}
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddFolder()}
          />
          <button className="btn btn-primary btn-sm" onClick={handleAddFolder}>
            {t('files.createFolder')}
          </button>
        </div>
      )}

      {currentFolderId && (
        <div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setCurrentFolderId(null)}>
            {t('files.allFolders')}
          </button>
          <h3 className="folder-context-title">📂 {currentFolder ? currentFolder.name : t('files.folder')}</h3>
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
                  title={t('files.deleteFolderTitle')}
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
                  {count} {count === 1 ? t('files.countFile') : t('files.countFiles')}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className="filter-bar">
        <div className="field">
          <label htmlFor="ff-name">{t('files.name')}</label>
          <input
            id="ff-name"
            type="text"
            placeholder={t('files.namePlaceholder')}
            value={filters.name}
            onChange={(e) => setFilters((f) => ({ ...f, name: e.target.value }))}
          />
        </div>
        <div className="field">
          <label htmlFor="ff-date">{t('files.dateSaved')}</label>
          <input
            id="ff-date"
            type="date"
            value={filters.datum}
            onChange={(e) => setFilters((f) => ({ ...f, datum: e.target.value }))}
          />
        </div>
        <div className="field">
          <label htmlFor="ff-type">{t('files.fileType')}</label>
          <select id="ff-type" value={filters.type} onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value }))}>
            <option value="">{t('files.allFileTypes')}</option>
            <option value="Bild">{t('fileTypes.Bild')}</option>
            <option value="Video">{t('fileTypes.Video')}</option>
            <option value="PDF">{t('fileTypes.PDF')}</option>
            <option value="Dokument">{t('fileTypes.Dokument')}</option>
            <option value="Audio">{t('fileTypes.Audio')}</option>
            <option value="Sonstiges">{t('fileTypes.Sonstiges')}</option>
          </select>
        </div>
        <div className="field sort-field">
          <label htmlFor="ff-sort">{t('files.sorting')}</label>
          <select id="ff-sort" value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="name-asc">{t('files.sortNameAsc')}</option>
            <option value="name-desc">{t('files.sortNameDesc')}</option>
            <option value="date-desc">{t('files.sortDateDesc')}</option>
            <option value="date-asc">{t('files.sortDateAsc')}</option>
            <option value="type-asc">{t('files.sortTypeAsc')}</option>
            <option value="type-desc">{t('files.sortTypeDesc')}</option>
          </select>
        </div>
        <button className="btn btn-ghost" onClick={() => setFilters({ name: '', datum: '', type: '' })}>
          {t('files.clearFilters')}
        </button>
      </div>

      <div className="list-head">
        <span style={{ fontSize: 13, color: 'var(--text-soft)', fontWeight: 600 }}>
          {loading
            ? t('files.loading')
            : `${filtered.length} ${filtered.length === 1 ? t('files.countFile') : t('files.countFiles')}` + (currentFolderId ? '' : t('files.withoutFolder'))}
        </span>
        <button className="btn btn-primary" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
          {uploading ? t('files.uploading') : t('files.uploadFile')}
        </button>
        <input ref={fileInputRef} type="file" style={{ display: 'none' }} onChange={handleFileSelected} />
      </div>

      {!loading && filtered.length === 0 && (
        <div className="empty-state">
          <div className="big-emoji">📁</div>
          <p>
            <strong>{t('files.emptyTitle')}</strong>
          </p>
          <p>{currentFolderId ? t('files.emptyInFolder') : t('files.emptyNoFolder')}</p>
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
