export default function FilePreviewModal({ file, url, loading, onClose, onDelete }) {
  if (!file) return null

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <strong>{file.name}</strong>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="modal-body">
          {loading && <p style={{ color: 'var(--text-soft)', fontSize: 13 }}>Lädt …</p>}
          {!loading && url && file.type === 'Video' && <video src={url} controls />}
          {!loading && url && file.type === 'Audio' && <audio src={url} controls />}
          {!loading && url && file.type === 'Bild' && <img src={url} alt={file.name} />}
          {!loading && url && !['Video', 'Audio', 'Bild'].includes(file.type) && (
            <a className="btn btn-primary" href={url} target="_blank" rel="noreferrer" download={file.name}>
              ⬇ Herunterladen
            </a>
          )}
          <button className="btn btn-clay btn-sm" onClick={onDelete}>
            🗑️ Datei löschen
          </button>
        </div>
      </div>
    </div>
  )
}
