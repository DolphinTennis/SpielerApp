export const FILE_TYPE_ICON = { Bild: '🖼️', Video: '🎬', PDF: '📄', Dokument: '📝', Audio: '🎵', Sonstiges: '📁' }

const DOC_EXTENSIONS = ['doc', 'docx', 'odt', 'txt', 'xls', 'xlsx', 'csv', 'ppt', 'pptx']

export function detectFileType(mimeType, filename) {
  if (mimeType?.startsWith('image/')) return 'Bild'
  if (mimeType?.startsWith('video/')) return 'Video'
  if (mimeType?.startsWith('audio/')) return 'Audio'
  if (mimeType === 'application/pdf') return 'PDF'
  const ext = (filename.split('.').pop() || '').toLowerCase()
  if (DOC_EXTENSIONS.includes(ext)) return 'Dokument'
  return 'Sonstiges'
}

export function formatFileSize(bytes) {
  if (!bytes) return '0 KB'
  if (bytes < 1024 * 1024) return Math.max(1, Math.round(bytes / 1024)) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1).replace('.', ',') + ' MB'
}

export function sanitizeFilename(name) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_')
}
