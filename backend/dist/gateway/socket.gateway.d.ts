import { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import Redis from 'ioredis';
export declare class SocketGateway implements OnModuleInit, OnModuleDestroy {
    private readonly sub;
    private readonly pub;
    private readonly logger;
    private typingCooldowns;
    server: Server;
    constructor(sub: Redis, pub: Redis);
    onModuleInit(): Promise<void>;
    onModuleDestroy(): Promise<void>;
    private routeEvent;
    handleJoinChat(socket: Socket, chatId: string): void;
    handleLeaveChat(socket: Socket, chatId: string): void;
    handleJoinProject(socket: Socket, projectId: string): void;
    handleLeaveProject(socket: Socket, projectId: string): void;
    handleJoinUser(socket: Socket, userId: string): void;
    handleLeaveUser(socket: Socket, userId: string): void;
    handleTypingStart(socket: Socket, body: {
        chatId: string;
        userId: string;
        userName?: string;
    }): void;
    handleTypingStop(socket: Socket, body: {
        chatId: string;
        userId: string;
    }): void;
    handleTypingStartDot(socket: Socket, body: {
        chatId: string;
        userId: string;
        userName?: string;
    }): void;
    handleTypingStopDot(socket: Socket, body: {
        chatId: string;
        userId: string;
    }): void;
}
