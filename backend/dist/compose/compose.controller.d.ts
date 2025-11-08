import { ComposeService } from './compose.service';
import type { Mailbox } from '../entities/mail-message.entity';
import { MailMessage } from '../entities/mail-message.entity';
import { SendMailDto } from './dto/send-mail.dto';
export declare class ComposeController {
    private readonly compose;
    constructor(compose: ComposeService);
    list(req: any, folder?: Mailbox, limit?: string, beforeId?: string): Promise<MailMessage[]>;
    send(req: any, body: SendMailDto): Promise<MailMessage>;
    move(req: any, id: string, folder: Mailbox): Promise<{
        success: boolean;
    }>;
}
