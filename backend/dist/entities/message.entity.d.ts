import { Chat } from './chat.entity';
import { User } from './user.entity';
import { MessageReaction } from './message-reaction.entity';
import { MessageRead } from './message-read.entity';
export declare class Message {
    id: string;
    chat: Chat;
    sender: User | null;
    contentJson: any;
    delivery: 'normal' | 'important' | 'urgent';
    rootMessage?: Message | null;
    threadReplies: Message[];
    createdAt: Date;
    editedAt: Date | null;
    reactions: MessageReaction[];
    reads: MessageRead[];
    deletedAt: Date | null;
}
