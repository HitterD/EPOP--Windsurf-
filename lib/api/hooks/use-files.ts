import { useQuery, useMutation, useQueryClient, useInfiniteQuery, type InfiniteData } from '@tanstack/react-query'
import { apiClient } from '../client'
import { FileItem, PresignedUploadResponse, CursorPaginatedResponse } from '@/types'
import { buildCursorQuery, withIdempotencyKey } from '../utils'
import { queryPolicies } from '@/lib/config/query-policies'

export function useFiles(limit = 50) {
  return useInfiniteQuery({
    queryKey: ['files'],
    queryFn: async ({ pageParam }) => {
      const query = buildCursorQuery({
        ...(pageParam ? { cursor: pageParam } : {}),
        ...(limit ? { limit } : {}),
      })
      const res = await apiClient.get<CursorPaginatedResponse<FileItem>>(`/files${query}`)
      if (!res.success || !res.data) throw new Error('Failed to load files')
      return res.data
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: undefined as string | undefined,
    ...queryPolicies.mediumFresh,
  })
}

/**
 * Get presigned URL for direct upload to MinIO
 */
export function usePresignedUpload() {
  return useMutation({
    mutationFn: async (params: { fileName: string; fileSize: number; mimeType: string; contextType?: string; contextId?: string }) => {
      const res = await apiClient.post<PresignedUploadResponse>('/files/presign', params, withIdempotencyKey())
      if (!res.success || !res.data) throw new Error('Failed to get presigned URL')
      return res.data
    },
  })
}

/**
 * Upload file directly to MinIO using presigned URL
 */
export function useDirectUpload() {
  return useMutation({
    mutationFn: async ({
      file,
      uploadUrl,
      fields,
      onProgress,
    }: {
      file: File
      uploadUrl: string
      fields?: Record<string, string>
      onProgress?: (progress: number) => void
    }) => {
      return new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        const formData = new FormData()

        // Add fields if using POST policy (S3-style)
        if (fields && Object.keys(fields).length > 0) {
          Object.entries(fields).forEach(([key, value]) => {
            formData.append(key, value)
          })
          formData.append('file', file)
        }

        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable && onProgress) {
            const progress = (e.loaded / e.total) * 100
            onProgress(progress)
          }
        })

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve()
          } else {
            reject(new Error('Upload failed'))
          }
        })

        xhr.addEventListener('error', () => {
          reject(new Error('Upload failed'))
        })

        if (fields && Object.keys(fields).length > 0) {
          // POST policy
          xhr.open('POST', uploadUrl)
          xhr.send(formData)
        } else {
          // Fallback: PUT upload
          xhr.open('PUT', uploadUrl)
          xhr.setRequestHeader('Content-Type', file.type)
          xhr.send(file)
        }
      })
    },
  })
}

/**
 * Confirm file upload completion to backend
 */
export function useConfirmUpload() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (fileId: string) => {
      const res = await apiClient.post<FileItem>(`/files/${fileId}/confirm`, {}, withIdempotencyKey())
      if (!res.success || !res.data) throw new Error('Failed to confirm upload')
      return res.data
    },
    onSuccess: (file) => {
      qc.setQueryData<InfiniteData<CursorPaginatedResponse<FileItem>> | undefined>(
        ['files'],
        (old) => {
          if (!old || !Array.isArray(old.pages) || old.pages.length === 0) return old
          const first = old.pages[0]!
          return {
            ...old,
            pages: [
              { ...first, items: [file, ...(first.items || [])] },
              ...old.pages.slice(1),
            ],
          }
        },
      )
    },
  })
}

/**
 * Combined hook for complete presigned upload flow
 */
export function usePresignedUploadFlow() {
  const getPresigned = usePresignedUpload()
  const directUpload = useDirectUpload()
  const confirmUpload = useConfirmUpload()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({
      file,
      contextType,
      contextId,
      onProgress,
    }: {
      file: File
      contextType?: string
      contextId?: string
      onProgress?: (progress: number) => void
    }) => {
      // Step 1: Get presigned URL
      const presignedData = await getPresigned.mutateAsync({
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        ...(contextType ? { contextType } : {}),
        ...(contextId ? { contextId } : {}),
      })

      // Step 2: Upload directly to MinIO
      await directUpload.mutateAsync({
        file,
        uploadUrl: presignedData.uploadUrl,
        ...(presignedData.fields ? { fields: presignedData.fields } : {}),
        ...(onProgress ? { onProgress } : {}),
      })

      // Step 3: Confirm upload with backend
      const confirmedFile = await confirmUpload.mutateAsync(presignedData.fileId)

      return confirmedFile
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['files'] })
    },
  })
}

export function useDeleteFile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (fileId: string) => {
      const res = await apiClient.delete(`/files/${fileId}`)
      if (!res.success) throw new Error('Failed to delete file')
      return true
    },
    onSuccess: (_ok, fileId) => {
      qc.setQueryData<InfiniteData<CursorPaginatedResponse<FileItem>> | undefined>(
        ['files'],
        (old) => {
          if (!old) return old
          const pages = old.pages.map((p): CursorPaginatedResponse<FileItem> => ({
            ...p,
            items: (p.items || []).filter((f: FileItem) => f.id !== fileId),
          }))
          return { ...old, pages }
        },
      )
    },
  })
}
