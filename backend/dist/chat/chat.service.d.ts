import { Repository } from 'typeorm';
import { Chat } from '../entities/chat.entity';
import { ChatParticipant } from '../entities/chat-participant.entity';
import { Message } from '../entities/message.entity';
import { MessageReaction } from '../entities/message-reaction.entity';
import { MessageRead } from '../entities/message-read.entity';
import { MessageHistory } from '../entities/message-history.entity';
import { OutboxService } from '../events/outbox.service';
import Redis from 'ioredis';
export declare class ChatService {
    private readonly chats;
    private readonly participants;
    private readonly messages;
    private readonly reactions;
    private readonly reads;
    private readonly history;
    private readonly outbox;
    private readonly redis;
    constructor(chats: Repository<Chat>, participants: Repository<ChatParticipant>, messages: Repository<Message>, reactions: Repository<MessageReaction>, reads: Repository<MessageRead>, history: Repository<MessageHistory>, outbox: OutboxService, redis: Redis);
    listChats(userId: string): Promise<Chat[]>;
    listThreadMessages(userId: string, chatId: string, rootMessageId: string): Promise<Message[]>;
    private loadAggregates;
    createChat(createdBy: string, dto: {
        isGroup: boolean;
        title?: string | null;
        participantIds: string[];
    }): Promise<Chat>;
    listMessages(userId: string, chatId: string, limit?: number, beforeId?: string): Promise<any>;
    listMessagesCursor(userId: string, chatId: string, limit?: number, cursor?: string | null): Promise<{
        items: any;
        nextCursor: string | undefined;
        hasMore: boolean;
    }>;
    sendMessage(userId: string, dto: {
        chatId: string;
        content: any;
        delivery?: 'normal' | 'important' | 'urgent';
        rootMessageId?: string | null;
    }): Promise<Message>;
    addReaction(userId: string, dto: {
        messageId: string;
        emoji: string;
    }): Promise<{
        success: boolean;
    }>;
    editMessage(userId: string, messageId: string, patch: {
        content: any;
    }): Promise<{
        success: boolean;
    }>;
    deleteMessage(userId: string, messageId: string): Promise<{
        success: boolean;
    }>;
    removeReaction(userId: string, dto: {
        messageId: string;
        emoji: string;
    }): Promise<{
        success: boolean;
    }>;
    markRead(userId: string, messageId: string): Promise<{
        success: boolean;
    }>;
    unreadPerChat(userId: string): Promise<any>;
}
