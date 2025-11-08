import { Controller, Get, Put, Query, Param, UseGuards, Req } from '@nestjs/common'
import type { Request } from 'express'
import { AuthGuard } from '@nestjs/passport'
import { SearchService } from './search.service'
import { ApiDefaultResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger'
import { ErrorResponse } from '../common/dto/error.dto'
import { CursorParamsDto } from '../common/dto/cursor.dto'
import { Roles } from '../common/decorators/roles.decorator'

@UseGuards(AuthGuard('jwt'))
@ApiTags('search')
@ApiDefaultResponse({ type: ErrorResponse })
@Controller('search')
export class SearchController {
  constructor(private readonly search: SearchService) {}

  @Get()
  @ApiOkResponse({ type: Object })
  async query(
    @Query('q') q: string,
    @Query('tab') tab: 'all'|'messages'|'projects'|'users'|'files' | undefined,
    @Query('limit') limitStr: string | undefined,
    @Query('offset') offsetStr: string | undefined,
    @Req() req: Request & { user?: { userId?: string } },
  ) {
    const userId = req.user?.userId
    const query = (q || '').toString()
    const limit = Math.max(1, Math.min(100, Number(limitStr ?? 20)))
    const offset = Math.max(0, Number(offsetStr ?? 0))

    // Helper to convert hits to FE shape
    const wrap = <T,>(hits: T[]) => hits.map((h) => ({ item: h, score: 1 }))

    if (!tab || tab === 'all') {
      const all = await this.search.searchAll(query, userId)
      // searchAll returns { results: [{ index, hits }] }
      const pick = (name: string) => (all?.results || []).find((r) => String((r as { index?: unknown }).index || '').endsWith(`_${name}`))?.hits || []
      const messages = wrap(pick('messages'))
      const files = wrap(pick('files'))
      const projects = wrap(pick('tasks'))
      // users tab is not backed by Zinc in this phase
      const users: unknown[] = []
      const total = messages.length + files.length + projects.length + users.length
      return { messages, files, projects, users, total, took: 0 }
    }

    const mapTabToEntity = (t: string): 'messages'|'mail_messages'|'files'|'tasks'|null => {
      if (t === 'messages') return 'messages'
      if (t === 'files') return 'files'
      if (t === 'projects') return 'tasks'
      return null // users not supported here
    }
    const entity = mapTabToEntity(String(tab))
    if (!entity) {
      // Return empty shape for unsupported tabs
      return { messages: [], files: [], projects: [], users: [], total: 0, took: 0 }
    }
    // Encode offset as cursor for service reuse
    const cursor = offset > 0 ? Buffer.from(JSON.stringify({ off: offset })).toString('base64') : null
    const page = await this.search.searchCursor(entity, query, userId, limit, cursor)
    const items = wrap(page.items || [])
    const empty: any[] = []
    return {
      messages: entity === 'messages' ? items : empty,
      files: entity === 'files' ? items : empty,
      projects: entity === 'tasks' ? items : empty,
      users: empty,
      total: items.length,
      took: 0,
    }
  }

  @Put('index/:entity')
  @Roles('admin')
  @ApiOkResponse({ type: Object })
  async backfill(@Param('entity') entity: 'messages'|'mail_messages'|'files'|'tasks') {
    return this.search.backfill(entity)
  }

  @Get(':entity/cursor')
  @ApiOkResponse({ type: Object })
  async cursor(
    @Param('entity') entity: 'messages'|'mail_messages'|'files'|'tasks',
    @Query('q') q: string,
    @Query() params: CursorParamsDto,
    @Req() req: Request & { user?: { userId?: string } },
  ) {
    const lim = Math.max(1, Math.min(100, Number(params?.limit ?? 20)))
    return this.search.searchCursor(entity, q || '', req.user?.userId, lim, params?.cursor || null)
  }
}
