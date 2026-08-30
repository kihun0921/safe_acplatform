import { useState, useEffect, useRef } from 'react'
import * as supabaseService from '../services/supabaseClient'
import { AppDocument } from '../services/supabaseClient'
import { WizardContent, collectAttachmentPaths } from '../types/wizardContent'

export function useSupabaseDocuments(userId: string | undefined) {
  const [documents, setDocuments] = useState<AppDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const saveTimeoutRef = useRef<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const saveContentTimeoutRef = useRef<any>(null)

  const fetchDocuments = async () => {
    if (!userId) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const { data, error: err } = await supabaseService.getDocuments(userId)
      if (err) throw err
      setDocuments(data || [])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch documents')
      console.error('Error fetching documents:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDocuments()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  // Auto-save (15초 디바운스) - status/currentStep/percentComplete
  const saveDocument = (
    documentId: string,
    updates: Partial<Pick<AppDocument, 'status' | 'currentStep' | 'percentComplete'>>,
  ) => {
    if (!userId) return

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        const { error: err } = await supabaseService.updateDocument(documentId, updates)
        if (err) throw err

        setDocuments((prev) =>
          prev.map((doc) =>
            doc.id === documentId
              ? { ...doc, ...updates, lastSavedAt: new Date().toISOString() }
              : doc,
          ),
        )
      } catch (err) {
        console.error('Error saving document:', err)
      }
    }, 15000)
  }

  // 마법사 입력 내용(content) 자동저장 (15초 디바운스)
  const saveContent = (documentId: string, content: WizardContent) => {
    if (!userId) return

    if (saveContentTimeoutRef.current) {
      clearTimeout(saveContentTimeoutRef.current)
    }

    saveContentTimeoutRef.current = setTimeout(async () => {
      try {
        const { error: err } = await supabaseService.updateDocumentContent(documentId, content)
        if (err) throw err

        setDocuments((prev) =>
          prev.map((doc) =>
            doc.id === documentId
              ? { ...doc, content, lastSavedAt: new Date().toISOString() }
              : doc,
          ),
        )
      } catch (err) {
        console.error('Error saving document content:', err)
      }
    }, 15000)
  }

  // 즉시 저장 (스텝 이동 시, 다운로드 직전 등)
  const saveContentNow = async (documentId: string, content: WizardContent) => {
    if (saveContentTimeoutRef.current) {
      clearTimeout(saveContentTimeoutRef.current)
    }
    try {
      const { error: err } = await supabaseService.updateDocumentContent(documentId, content)
      if (err) throw err
      setDocuments((prev) =>
        prev.map((doc) =>
          doc.id === documentId
            ? { ...doc, content, lastSavedAt: new Date().toISOString() }
            : doc,
        ),
      )
    } catch (err) {
      console.error('Error saving document content:', err)
    }
  }

  const createDocument = async (announcementId: string | null, title: string) => {
    if (!userId) return null

    try {
      const { data, error: err } = await supabaseService.createDocumentRow(
        userId,
        announcementId,
        title,
      )
      if (err) throw err
      if (data) setDocuments((prev) => [data, ...prev])
      return data
    } catch (err) {
      console.error('Error creating document:', err)
      throw err
    }
  }

  const uploadFile = async (documentId: string, category: string, file: File) => {
    if (!userId) return null
    const { data, error: err } = await supabaseService.uploadDocumentFile(
      userId,
      documentId,
      category,
      file,
    )
    if (err) throw err
    return data
  }

  // 작성자 본인이 내 문서함에서 직접 삭제 — 문서 행과 함께 첨부파일(Storage)도 정리한다.
  const deleteDocument = async (documentId: string) => {
    const target = documents.find((d) => d.id === documentId)
    try {
      const { error: err } = await supabaseService.deleteDocumentRow(documentId)
      if (err) throw err

      if (target) {
        const paths = collectAttachmentPaths(target.content)
        await Promise.all(
          paths.map((path) => supabaseService.deleteDocumentFile(path).catch(() => undefined)),
        )
      }

      setDocuments((prev) => prev.filter((d) => d.id !== documentId))
    } catch (err) {
      console.error('Error deleting document:', err)
      throw err
    }
  }

  return {
    documents,
    loading,
    error,
    saveDocument,
    saveContent,
    saveContentNow,
    createDocument,
    uploadFile,
    deleteDocument,
    refetch: fetchDocuments,
  }
}
