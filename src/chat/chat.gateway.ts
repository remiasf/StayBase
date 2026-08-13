import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  WsException,
} from '@nestjs/websockets';
import { UseGuards } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';
import { WsJwtGuard } from '../common/guards/ws-jwt.guard';

type JwtSocketUser = {
  id: string;
  login: string;
  role: string;
};

@UseGuards(WsJwtGuard)
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
export class ChatGateway {
  @WebSocketServer()
  server: Server;

  constructor(private readonly chatService: ChatService) {}

  @SubscribeMessage('getOrCreateChat')
  async handleGetOrCreateChat(
    @MessageBody()
    data: { propertyId: string; clientId: string; realtorId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const currentUser = this.getCurrentUser(client);

    const chat = await this.chatService.getOrCreateChat(
      data.propertyId,
      data.clientId,
      data.realtorId,
      currentUser.id,
    );

    client.join(`chat_${chat.id}`);
    client.emit('chatReady', chat);

    return chat;
  }

  @SubscribeMessage('joinChat')
  async handleJoinRoom(
    @MessageBody() data: { chatId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const currentUser = this.getCurrentUser(client);
    await this.chatService.assertChatParticipant(data.chatId, currentUser.id);

    client.join(`chat_${data.chatId}`);
  }

  @SubscribeMessage('sendMessage')
  async handleSendMessage(
    @MessageBody() data: { chatId: string; text: string },
    @ConnectedSocket() client: Socket,
  ) {
    const currentUser = this.getCurrentUser(client);

    const message = await this.chatService.createMessage(
      data.chatId,
      currentUser.id,
      data.text,
    );

    this.server.to(`chat_${data.chatId}`).emit('newMessage', message);
    return message;
  }

  private getCurrentUser(client: Socket): JwtSocketUser {
    const user = client.data.user as JwtSocketUser | undefined;

    if (!user?.id) {
      throw new WsException('User not authorized');
    }

    return user;
  }
}
