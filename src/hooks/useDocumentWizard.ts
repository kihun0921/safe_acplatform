import { useState, useEffect, useRef, useCallback } from 'react'
import * as supabaseService from '../services/supabaseClient'
import { AppDocument } from '../services/supabaseClient'
import { WizardContent } from '../types/wizardContent'

export function useDocumentWizard(documentId: string | undefined) {
  const [document, setDocument] = useState<AppDocument | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const saveTimeoutRef = useRef<any>(null)

  const load = useCallback(async () => {
    if (!documentId) {
      setLoading(false)
      return
    }
    try {
      setLoading(true)
      const { data, error: err } = await supabaseService.getDocumentById(documentId)
      if (err) throw err
      setDocument(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : '문서를 불러오지 못했습니다.')
      console.error('Error loading document:', err)
    } finally {
      setLoading(false)
    }
  }, [documentId])

  useEffect(() => {
    load()
  }, [load])

  const saveContentNow = useCallback(
    async (content: WizardContent) => {
      if (!documentId) return
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
      setSaving(true)
      try {
        const { error: err } = await supabaseService.updateDocumentContent(documentId, content)
        if (err) throw err
        setDocument((prev) => (prev ? { ...prev, content, lastSavedAt: new Date().toISOString() } : prev))
      } catch (err) {
        console.error('Error saving document content:', err)
      } finally {
        setSaving(false)
      }
    },
    [documentId],
  )

  // 15초 디바운스 자동저장 (입력할 때마다 호출, 실제 저장은 마지막 호출 후 15초 뒤)
  const scheduleSave = useCallback(
    (content: WizardContent) => {
      if (!documentId) return
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
      saveTimeoutRef.current = setTimeout(() => {
        saveContentNow(content)
      }, 15000)
    },
    [documentId, saveContentNow],
  )

  const saveMeta = useCallback(
    async (updates: Partial<Pick<AppDocument, 'status' | 'currentStep' | 'percentComplete'>>) => {
      if (!documentId) return
      try {
        const { error: err } = await supabaseService.updateDocument(documentId, updates)
        if (err) throw err
        setDocument((prev) => (prev ? { ...prev, ...updates } : prev))
      } catch (err) {
        console.error('Error saving document meta:', err)
      }
    },
    [documentId],
  )

  const uploadFile = useCallback(
    async (category: string, file: File) => {
      if (!documentId || !document) return null
      const { data, error: err } = await supabaseService.uploadDocumentFile(
        document.userId,
        documentId,
        category,
        file,
      )
      if (err) throw err
      return data
    },
    [documentId, document],
  )

  const getFileUrl = useCallback(async (path: string) => {
    const { data, error: err } = await supabaseService.getSignedFileUrl(path)
    if (err) throw err
    return data
  }, [])

  const deleteFile = useCallback(async (path: string) => {
    await supabaseService.deleteDocumentFile(path)
  }, [])

  return {
    document,
    loading,
    error,
    saving,
    scheduleSave,
    saveContentNow,
    saveMeta,
    uploadFile,
    getFileUrl,
    deleteFile,
    refetch: load,
  }
}
