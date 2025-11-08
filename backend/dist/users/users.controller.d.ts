import { UsersService } from './users.service';
import { UpdateMeDto } from './dto/update-me.dto';
import { User } from '../entities/user.entity';
export declare class UsersController {
    private readonly users;
    constructor(users: UsersService);
    me(req: any): Promise<User>;
    updateMe(req: any, dto: UpdateMeDto): Promise<User>;
    presence(req: any, presence: 'available' | 'busy' | 'away' | 'offline'): Promise<User>;
}
