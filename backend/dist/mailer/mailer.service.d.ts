import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
export declare class MailerService {
    private readonly config;
    private readonly queue;
    private readonly logger;
    private from;
    constructor(config: ConfigService, queue: Queue);
    sendPasswordReset(email: string, token: string): Promise<boolean>;
    sendGeneric(to: string, subject: string, text: string): Promise<boolean>;
    sendHtml(to: string, subject: string, html: string): Promise<boolean>;
    sendTestEmail(to: string): Promise<boolean>;
    sendReminderEmail(to: string, model: {
        title: string;
        start: string;
        location?: string | null;
    }): Promise<boolean>;
    private renderTemplate;
}
