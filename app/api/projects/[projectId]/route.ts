import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { db } from '@/lib/db/mock-data'
import type { Project } from '@/types'

export async function GET(_req: NextRequest, { params }: { params: { projectId: string } }) {
  const accessToken = cookies().get('accessToken')?.value
  if (!accessToken) return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } }, { status: 401 })
  const project = db.getProject(params.projectId)
  if (!project) return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Project not found' } }, { status: 404 })
  return NextResponse.json({ success: true, data: project })
}

export async function PATCH(request: NextRequest, { params }: { params: { projectId: string } }) {
  const accessToken = cookies().get('accessToken')?.value
  if (!accessToken) return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } }, { status: 401 })
  const project = db.getProject(params.projectId)
  if (!project) return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Project not found' } }, { status: 404 })
  const updates = (await request.json()) as Partial<Project>
  const updated: Project = { ...project, ...updates, updatedAt: new Date().toISOString() }
  db.updateProject(updated)
  return NextResponse.json({ success: true, data: updated })
}

export async function DELETE(_req: NextRequest, { params }: { params: { projectId: string } }) {
  const accessToken = cookies().get('accessToken')?.value
  if (!accessToken) return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } }, { status: 401 })
  const ok = db.deleteProject(params.projectId)
  if (!ok) return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Project not found' } }, { status: 404 })
  return NextResponse.json({ success: true })
}
