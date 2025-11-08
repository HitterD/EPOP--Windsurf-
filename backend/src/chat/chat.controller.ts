import { Body, Controller, Delete, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common'
import type { Request } from 'express'
import { AuthGuard } from '@nestjs/passport'
import { ChatService } from './chat.service'
import { ApiDefaultResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger'
import { ErrorResponse } from '../common/dto/error.dto'
import { CursorParamsDto } from '../common/dto/cursor.dto'
import { Message } from '../entities/message.entity'
import { Chat } from '../entities/chat.entity'
import { SuccessResponse } from '../common/dto/success.dto'
import { CursorMessagesResponse } from '../common/dto/cursor-response.dto'
import { CreateChatDto, EditMessageDto, ReactionDto, SendMessageDto } from './dto/requests.dto'

@UseGuards(AuthGuard('jwt'))
@ApiTags('chats')
@ApiDefaultResponse({ type: ErrorResponse })
@Controller('chats')
export class ChatController {
  constructor(private readonly chat: ChatService) {}

  @Get()
  @ApiOkResponse({ type: Chat, isArray: true })
  async list(@Req() req: Request & { user: { userId: string } }) {
    return this.chat.listChats(req.user.userId)
  }

  @Post()
  @ApiOkResponse({ type: Chat })
  async create(@Req() req: Request & { user: { userId: string } }, @Body() dto: CreateChatDto) {
    return this.chat.createChat(req.user.userId, dto)
  }

  @Get(':chatId/messages')
  @ApiOkResponse({ type: Message, isArray: true })
  async messages(
    @Req() req: Request & { user: { userId: string } },
    @Param('chatId') chatId: string,
    @Query('limit') limit?: string,
    @Query('beforeId') beforeId?: string,
  ) {
    const lim = Math.max(1, Math.min(100, Number(limit ?? 20)))
    return this.chat.listMessages(req.user.userId, chatId, lim, beforeId)
  }

  @Get(':chatId/messages/cursor')
  @ApiOkResponse({ type: CursorMessagesResponse })
  async messagesCursor(
    @Req() req: Request & { user: { userId: string } },
    @Param('chatId') chatId: string,
    @Query() params: CursorParamsDto,
  ) {
    const lim = Math.max(1, Math.min(100, Number(params?.limit ?? 20)))
    return this.chat.listMessagesCursor(req.user.userId, chatId, lim, params?.cursor || null)
  }

  @Post(':chatId/messages')
  @ApiOkResponse({ type: Message })
  async send(
    @Req() req: Request & { user: { userId: string } },
    @Param('chatId') chatId: string,
    @Body() body: SendMessageDto,
  ) {
    return this.chat.sendMessage(req.user.userId, { chatId, content: body.content, delivery: body.delivery, rootMessageId: body.rootMessageId ?? null })
  }

  @Get(':chatId/threads')
  @ApiOkResponse({ type: Message, isArray: true })
  async thread(
    @Req() req: Request & { user: { userId: string } },
    @Param('chatId') chatId: string,
    @Query('rootMessageId') rootMessageId: string,
  ) {
    return this.chat.listThreadMessages(req.user.userId, chatId, rootMessageId)
  }

  @Post(':chatId/reactions')
  @ApiOkResponse({ type: SuccessResponse })
  async addReaction(@Req() req: Request & { user: { userId: string } }, @Param('chatId') chatId: string, @Body() body: ReactionDto) {
    // chatId trusted for auth membership in service via message
    return this.chat.addReaction(req.user.userId, body)
  }

  @Delete(':chatId/reactions')
  @ApiOkResponse({ type: SuccessResponse })
  async removeReaction(@Req() req: Request & { user: { userId: string } }, @Param('chatId') chatId: string, @Body() body: ReactionDto) {
    return this.chat.removeReaction(req.user.userId, body)
  }

  @Post(':chatId/reads')
  @ApiOkResponse({ type: SuccessResponse })
  async markRead(@Req() req: Request & { user: { userId: string } }, @Param('chatId') chatId: string, @Body('messageId') messageId: string) {
    return this.chat.markRead(req.user.userId, messageId)
  }

  @Post(':chatId/messages/:messageId/edit')
  @ApiOkResponse({ type: SuccessResponse })
  async edit(
    @Req() req: Request & { user: { userId: string } },
    @Param('chatId') chatId: string,
    @Param('messageId') messageId: string,
    @Body() dto: EditMessageDto,
  ) {
    return this.chat.editMessage(req.user.userId, messageId, { content: dto.content })
  }

  @Delete(':chatId/messages/:messageId')
  @ApiOkResponse({ type: SuccessResponse })
  async remove(
    @Req() req: Request & { user: { userId: string } },
    @Param('chatId') chatId: string,
    @Param('messageId') messageId: string,
  ) {
    return this.chat.deleteMessage(req.user.userId, messageId)
  }

  @Get('unread')
  async unread(@Req() req: Request & { user: { userId: string } }) {
    return this.chat.unreadPerChat(req.user.userId)
  }
}
