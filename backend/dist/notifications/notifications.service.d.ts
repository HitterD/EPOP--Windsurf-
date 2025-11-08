import { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';
import { ChatParticipant } from '../entities/chat-participant.entity';
import { Repository } from 'typeorm';
import { NotificationPreferencesEntity } from '../entities/notification-preferences.entity';
import { User } from '../entities/user.entity';
import { MailerService } from '../mailer/mailer.service';
import { Queue } from 'bullmq';
export declare class NotificationsService implements OnModuleInit, OnModuleDestroy {
    private readonly sub;
    private readonly kv;
    private readonly parts;
    private readonly prefs;
    private readonly users;
    private readonly mailer;
    private readonly queue;
    private readonly logger;
    constructor(sub: Redis, kv: Redis, parts: Repository<ChatParticipant>, prefs: Repository<NotificationPreferencesEntity>, users: Repository<User>, mailer: MailerService, queue: Queue);
    onModuleInit(): Promise<void>;
    onModuleDestroy(): Promise<void>;
    private handleChatMessageCreated;
}
