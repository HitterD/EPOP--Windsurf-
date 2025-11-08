import { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
export declare class SearchEventsSubscriber implements OnModuleInit, OnModuleDestroy {
    private readonly sub;
    private readonly queue;
    private readonly logger;
    private prefix;
    constructor(sub: Redis, queue: Queue, config: ConfigService);
    private idx;
    onModuleInit(): Promise<void>;
    onModuleDestroy(): Promise<void>;
    private onMessageCreated;
    private onMessageUpdated;
    private onMessageDeleted;
    private onTaskCreated;
    private onTaskUpdated;
    private onMailCreated;
}
