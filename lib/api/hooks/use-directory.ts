import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query'
import { apiClient } from '../client'
import { OrgUnit, BulkImportResult, DirectoryAuditEntry, CursorPaginatedResponse } from '@/types'
import { buildCursorQuery, withIdempotencyKey, generateIdempotencyKey } from '../utils'

export function useOrgTree() {
  return useQuery({
    queryKey: ['org-tree'],
    queryFn: async () => {
      const res = await apiClient.get<OrgUnit>('/directory')
      if (!res.success || !res.data) {
        const err = new Error('Failed to fetch org tree') as Error & { code?: string }
        if (res.error?.code) err.code = res.error.code
        throw err
      }
      return res.data
    },
    staleTime: 60_000,
  })
}

export function useUpdateOrgUnit() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ unitId, patch }: { unitId: string; patch: Partial<OrgUnit> }) => {
      const res = await apiClient.patch<OrgUnit>(`/directory/${unitId}`, patch, withIdempotencyKey())
      if (!res.success || !res.data) throw new Error('Failed to update org unit')
      return res.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['org-tree'] })
    },
  })
}

/**
 * Transactional move user with audit trail
 */
export function useMoveUserToUnit() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ userId, toUnitId }: { userId: string; toUnitId: string }) => {
      const res = await apiClient.patch(
        `/directory/users/${userId}/move`,
        { toUnitId },
        withIdempotencyKey()
      )
      if (!res.success) throw new Error('Failed to move user')
      return res.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['org-tree'] })
      qc.invalidateQueries({ queryKey: ['directory-audit'] })
    },
  })
}

/**
 * Move organizational unit (transactional)
 */
export function useMoveOrgUnit() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ unitId, toParentId }: { unitId: string; toParentId?: string }) => {
      const res = await apiClient.patch(
        `/directory/units/${unitId}/move`,
        { toParentId },
        withIdempotencyKey()
      )
      if (!res.success || !res.data) throw new Error('Failed to move unit')
      return res.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['org-tree'] })
      qc.invalidateQueries({ queryKey: ['directory-audit'] })
    },
  })
}

/**
 * Bulk import dry-run (validation only)
 */
export function useBulkImportDryRun() {
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData()
      formData.append('file', file)
      
      const response = await fetch('/api/directory/import/dry-run', {
        method: 'POST',
        body: formData,
        credentials: 'include',
        headers: { 'Idempotency-Key': generateIdempotencyKey() },
      })
      
      if (!response.ok) {
        throw new Error('Dry-run validation failed')
      }
      
      const result: BulkImportResult = await response.json()
      return result
    },
  })
}

/**
 * Bulk import commit (actual import)
 */
export function useBulkImportCommit() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData()
      formData.append('file', file)
      
      const response = await fetch('/api/directory/import/commit', {
        method: 'POST',
        body: formData,
        credentials: 'include',
        headers: { 'Idempotency-Key': generateIdempotencyKey() },
      })
      
      if (!response.ok) {
        throw new Error('Import failed')
      }
      
      const result: BulkImportResult = await response.json()
      return result
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['org-tree'] })
    },
  })
}

/**
 * Get directory audit log
 */
export function useDirectoryAudit(limit = 50) {
  return useInfiniteQuery({
    queryKey: ['directory-audit'],
    queryFn: async ({ pageParam }) => {
      const query = buildCursorQuery({
        ...(pageParam ? { cursor: pageParam as string } : {}),
        ...(limit ? { limit } : {}),
      })
      const res = await apiClient.get<CursorPaginatedResponse<DirectoryAuditEntry>>(
        `/directory/audit${query}`
      )
      if (!res.success || !res.data) throw new Error('Failed to fetch audit log')
      return res.data
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: undefined as string | undefined,
    staleTime: 30_000,
  })
}
