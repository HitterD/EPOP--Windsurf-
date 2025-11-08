'use client'

import { useMemo, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { IfCan } from '@/components/auth/if-can'
import { useOrgTree, useDirectoryAudit, useBulkImportDryRun, useBulkImportCommit } from '@/lib/api/hooks/use-directory'
import { OrgTree } from '@/features/directory/components/org-tree'
import { useDomainEvents } from '@/lib/socket/hooks/use-domain-events'
import { SOCKET_EVENTS } from '@/lib/constants'
import { useQueryClient } from '@tanstack/react-query'
import type { DomainEvent, DirectoryAuditEntry, CursorPaginatedResponse } from '@/types'

type UnitStub = { id: string; name: string; members?: unknown[]; children?: UnitStub[] }
function UnitNode({ id, name, members, units }: { id: string; name: string; members: number; units?: UnitStub[] }) {
  return (
    <div className="rounded-lg border p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="font-medium">{name}</span>
        <Badge variant="outline">{members} members</Badge>
      </div>
      {units && units.length > 0 && (
        <div className="ml-4 space-y-2 border-l pl-4">
          {units.map((u: UnitStub) => (
            <UnitNode key={u.id} id={u.id} name={u.name} members={(u.members?.length) || 0} units={u.children ?? []} />
          ))}
        </div>
      )}
    </div>
  )
}

export default function DirectoryPage() {
  const qc = useQueryClient()
  const { data: root, isLoading, isError, error } = useOrgTree()
  const {
    data: auditPages,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useDirectoryAudit(50)
  const dryRun = useBulkImportDryRun()
  const commitImport = useBulkImportCommit()
  const [file, setFile] = useState<File | null>(null)
  const [dryRunResult, setDryRunResult] = useState<{ valid: number; invalid: number } | null>(null)

  const isForbidden = useMemo(() => {
    const code = (error && (error as { code?: unknown }).code) as unknown
    return code === '403'
  }, [error])

  const handleDryRun = async () => {
    if (!file) return
    const result = await dryRun.mutateAsync(file)
    setDryRunResult({ valid: result.imported, invalid: result.errors.length })
  }

  const handleCommit = async () => {
    if (!file) return
    await commitImport.mutateAsync(file)
    setDryRunResult(null)
    setFile(null)
  }

  // Listen to directory events and refresh data
  useDomainEvents<DomainEvent>({
    eventType: SOCKET_EVENTS.DIRECTORY_UNIT_UPDATED,
    onEvent: (_e) => {
      qc.invalidateQueries({ queryKey: ['org-tree'] })
      qc.invalidateQueries({ queryKey: ['directory-audit'] })
    },
  })
  useDomainEvents<DomainEvent>({
    eventType: SOCKET_EVENTS.DIRECTORY_USER_MOVED,
    onEvent: (_e) => {
      qc.invalidateQueries({ queryKey: ['org-tree'] })
      qc.invalidateQueries({ queryKey: ['directory-audit'] })
    },
  })

  return (
    <IfCan role="admin" permission="admin:access" hideOnForbidden={false} fallback={
      <div className="h-full overflow-y-auto p-6">
        <h1 className="mb-2 text-2xl font-semibold">Directory</h1>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">
              You do not have permission to access the directory.
            </p>
          </CardContent>
        </Card>
      </div>
    }>
      <div className="h-full overflow-y-auto p-6">
        <h1 className="mb-6 text-3xl font-bold">Directory</h1>

        {/* Tree view */}
        <Card className="mb-6">
          <CardContent className="p-4">
            {isForbidden ? (
              <div className="text-sm text-destructive">Forbidden (403)</div>
            ) : isLoading ? (
              <div className="text-muted-foreground">Loading...</div>
            ) : isError ? (
              <div className="text-sm text-destructive">Failed to load directory.</div>
            ) : root ? (
              <OrgTree root={root} />
            ) : (
              <div className="text-muted-foreground">No data</div>
            )}
          </CardContent>
        </Card>

        {/* Bulk Import */}
        <Card className="mb-6">
          <CardContent className="space-y-3 p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Bulk Import (CSV)</h2>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
              <Button variant="secondary" onClick={handleDryRun} disabled={!file || dryRun.isPending}>
                Validate CSV
              </Button>
              <Button onClick={handleCommit} disabled={!file || commitImport.isPending}>
                Commit Import
              </Button>
            </div>
            {dryRunResult && (
              <div className="rounded-md border p-3 text-sm">
                <div className="mb-1 font-medium">Dry-run result</div>
                <div className="text-muted-foreground">
                  {dryRunResult.valid} valid, {dryRunResult.invalid} invalid
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Audit Log */}
        <Card>
          <CardContent className="space-y-3 p-4">
            <h2 className="text-lg font-semibold">Audit Log</h2>
            <div className="space-y-2">
              {((auditPages?.pages || []) as Array<CursorPaginatedResponse<DirectoryAuditEntry>>)
                .flatMap((p) => p.items || [])
                .map((e) => (
                <div key={e.id} className="flex items-center justify-between rounded-md border p-2 text-sm">
                  <span>{e.action.replace('_', ' ')}</span>
                  <span className="text-muted-foreground">{new Date(e.timestamp).toLocaleString()}</span>
                </div>
              ))}
            </div>
            {hasNextPage && (
              <Button variant="outline" onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
                {isFetchingNextPage ? 'Loading...' : 'Load more'}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </IfCan>
  )
}
