import { FILE_TYPE_ICON, formatFileSize } from '../lib/fileHelpers'
import { formatDate } from '../lib/format'

export default function FileRow({ file, folders, onOpen, onAssignFolder }) {
  return (
    <div className="file-row" onClick={onOpen}>
      <div className="file-icon">{FILE_TYPE_ICON[file.type] || '📁'}</div>
      <div className="file-meta">
        <div className="fname">{file.name}</div>
        <div className="sub">
          <span>📅 {formatDate(file.created_at?.slice(0, 10))}</span>
          <span>{formatFileSize(file.size_bytes)}</span>
        </div>
      </div>
      <span className="type-tag">{file.type}</span>
      <select
        className="file-folder-select"
        value={file.folder_id || ''}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => onAssignFolder(file.id, e.target.value)}
        title="Ordner zuweisen"
      >
        <option value="">Ohne Ordner</option>
        {folders.map((f) => (
          <option key={f.id} value={f.id}>
            {f.name}
          </option>
        ))}
      </select>
    </div>
  )
}
