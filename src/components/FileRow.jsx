import { useTranslation } from 'react-i18next'
import { FILE_TYPE_ICON, formatFileSize } from '../lib/fileHelpers'
import { formatDate } from '../lib/format'

export default function FileRow({ file, folders, onOpen, onAssignFolder }) {
  const { t } = useTranslation()
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
      <span className="type-tag">{t(`fileTypes.${file.type}`, file.type)}</span>
      <select
        className="file-folder-select"
        value={file.folder_id || ''}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => onAssignFolder(file.id, e.target.value)}
        title={t('files.assignFolder')}
      >
        <option value="">{t('files.noFolder')}</option>
        {folders.map((f) => (
          <option key={f.id} value={f.id}>
            {f.name}
          </option>
        ))}
      </select>
    </div>
  )
}
