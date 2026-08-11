import { Module } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatGateway } from './chat.gateway';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { WsJwtGuard } from '../common/guards/ws-jwt.guard';

@Module({
    imports: [PrismaModule, AuthModule],
    providers: [ChatService, ChatGateway, WsJwtGuard],
    exports: [ChatService],
})
export class ChatModule {}
