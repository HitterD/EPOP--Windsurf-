import { ChatService } from './chat.service';
import { CursorParamsDto } from '../common/dto/cursor.dto';
import { Message } from '../entities/message.entity';
import { Chat } from '../entities/chat.entity';
import { CreateChatDto, EditMessageDto, ReactionDto, SendMessageDto } from './dto/requests.dto';
export declare class ChatController {
    private readonly chat;
    constructor(chat: ChatService);
    list(req: any): Promise<Chat[]>;
    create(req: any, dto: CreateChatDto): Promise<Chat>;
    messages(req: any, chatId: string, limit?: string, beforeId?: string): Promise<any>;
    messagesCursor(req: any, chatId: string, params: CursorParamsDto): Promise<{
        items: any;
        nextCursor: string | undefined;
        hasMore: boolean;
    }>;
    send(req: any, chatId: string, body: SendMessageDto): Promise<Message>;
    thread(req: any, chatId: string, rootMessageId: string): Promise<Message[]>;
    addReaction(req: any, chatId: string, body: ReactionDto): Promise<{
        success: boolean;
    }>;
    removeReaction(req: any, chatId: string, body: ReactionDto): Promise<{
        success: boolean;
    }>;
    markRead(req: any, chatId: string, messageId: string): Promise<{
        success: boolean;
    }>;
    edit(req: any, chatId: string, messageId: string, dto: EditMessageDto): Promise<{
        success: boolean;
    }>;
    remove(req: any, chatId: string, messageId: string): Promise<{
        success: boolean;
    }>;
    unread(req: any): Promise<any>;
}
