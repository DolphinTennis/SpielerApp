import { supabase } from './supabaseClient'
import { detectFileType, sanitizeFilename } from './fileHelpers'

const BUCKET = 'files'

export async function listFolders() {
  const { data, error } = await supabase.from('folders').select('id, name').order('name')
  if (error) throw error
  return data
}

export async function createFolder(userId, name) {
  const { data, error } = await supabase.from('folders').insert({ user_id: userId, name }).select().single()
  if (error) throw error
  return data
}

export async function deleteFolder(id) {
  const { error } = await supabase.from('folders').delete().eq('id', id)
  if (error) throw error
}

export async function listFiles() {
  const { data, error } = await supabase
    .from('files')
    .select('id, folder_id, name, type, size_bytes, storage_path, created_at')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function uploadFile(userId, file, folderId) {
  const path = `${userId}/${crypto.randomUUID()}-${sanitizeFilename(file.name)}`
  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type || undefined,
    upsert: false,
  })
  if (uploadError) throw uploadError

  const { data, error } = await supabase
    .from('files')
    .insert({
      user_id: userId,
      folder_id: folderId || null,
      name: file.name,
      type: detectFileType(file.type, file.name),
      size_bytes: file.size,
      storage_path: path,
    })
    .select()
    .single()
  if (error) {
    await supabase.storage.from(BUCKET).remove([path])
    throw error
  }
  return data
}

export async function deleteFile(file) {
  await supabase.storage.from(BUCKET).remove([file.storage_path])
  const { error } = await supabase.from('files').delete().eq('id', file.id)
  if (error) throw error
}

export async function assignFileToFolder(fileId, folderId) {
  const { error } = await supabase
    .from('files')
    .update({ folder_id: folderId || null })
    .eq('id', fileId)
  if (error) throw error
}

export async function getSignedUrl(storagePath) {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(storagePath, 600)
  if (error) throw error
  return data.signedUrl
}
