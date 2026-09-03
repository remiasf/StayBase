import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
} from '@nestjs/websockets';
import { UseGuards, UsePipes } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import {
  ChatListItem,
  ChatMessage,
  ChatService,
  ChatWithMessages,
} from './chat.service';
import { WsJwtGuard } from '../common/guards/ws-jwt.guard';
import { WsValidationPipe } from '../common/pipes/ws-validation.pipe';
import { authenticateSocket, getSocketUser } from '../common/auth/socket-auth';
import { GetOrCreateChatDto } from './dto/get-or-create-chat.dto';
import { JoinChatDto } from './dto/join-chat.dto';
import { SendMessageDto } from './dto/send-message.dto';

@UseGuards(WsJwtGuard)
@UsePipes(new WsValidationPipe())
@WebSocketGateway({
  namespace: 'chat',
  cors: {
    origin: [
      'http://localhost:3001',
      'http://127.0.0.1:3001',
      'https://staybase.software',
      'https://stay-base-frontend.vercel.app',
    ],
    credentials: true,
  },
})
export class ChatGateway implements OnGatewayConnection {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly chatService: ChatService,
    private readonly jwtService: JwtService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      await authenticateSocket(this.jwtService, client);
    } catch {
      client.emit('exception', { message: 'User not authorized' });
      client.disconnect(true);
    }
  }

  @SubscribeMessage('getOrCreateChat')
  async handleGetOrCreateChat(
    @MessageBody() dto: GetOrCreateChatDto,
    @ConnectedSocket() client: Socket,
  ): Promise<ChatWithMessages> {
    const user = getSocketUser(client);

    const chat = await this.chatService.getOrCreateChat(dto.propertyId, user.id);
    await client.join(this.roomOf(chat.id));

    return chat;
  }

  @SubscribeMessage('joinChat')
  async handleJoinChat(
    @MessageBody() dto: JoinChatDto,
    @ConnectedSocket() client: Socket,
  ): Promise<ChatWithMessages> {
    const user = getSocketUser(client);

    const chat = await this.chatService.getChatForParticipant(
      dto.chatId,
      user.id,
    );
    await client.join(this.roomOf(chat.id));

    return chat;
  }

  @SubscribeMessage('getMyChats')
  async handleGetMyChats(
    @ConnectedSocket() client: Socket,
  ): Promise<ChatListItem[]> {
    const user = getSocketUser(client);

    return this.chatService.getMyChats(user.id);
  }

  @SubscribeMessage('sendMessage')
  async handleSendMessage(
    @MessageBody() dto: SendMessageDto,
    @ConnectedSocket() client: Socket,
  ): Promise<ChatMessage> {
    const user = getSocketUser(client);

    const message = await this.chatService.createMessage(
      dto.chatId,
      user.id,
      dto.text,
    );

    this.server.to(this.roomOf(dto.chatId)).emit('newMessage', message);

    return message;
  }

  private roomOf(chatId: string): string {
    return `chat_${chatId}`;
  }
}
