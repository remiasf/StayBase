import { Injectable } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { PrismaService } from '../prisma/prisma.service';

const MESSAGE_SELECT = {
  id: true,
  chatId: true,
  senderId: true,
  text: true,
  isRead: true,
  createdAt: true,
} as const;

export type ChatMessage = {
  id: string;
  chatId: string;
  senderId: string;
  text: string;
  isRead: boolean;
  createdAt: Date;
};

export type ChatWithMessages = {
  id: string;
  messages: ChatMessage[];
};

export type ChatListItem = {
  id: string;
  propertyId: string;
  peerId: string;
  lastMessage: ChatMessage | null;
};

@Injectable()
export class ChatService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * The current user is always the client side of the chat, the landlord is
   * resolved from the property, so no participant ids are taken from the client.
   */
  async getOrCreateChat(
    propertyId: string,
    currentUserId: string,
  ): Promise<ChatWithMessages> {
    const property = await this.prisma.apartment.findUnique({
      where: { id: propertyId },
      select: { userId: true },
    });

    if (!property) {
      throw new WsException('Property not found');
    }

    if (property.userId === currentUserId) {
      throw new WsException('You cannot open a chat about your own property');
    }

    const participants = {
      propertyId,
      clientId: currentUserId,
      realtorId: property.userId,
    };

    return this.prisma.chat.upsert({
      where: { propertyId_clientId_realtorId: participants },
      update: {},
      create: participants,
      select: {
        id: true,
        messages: { orderBy: { createdAt: 'asc' }, select: MESSAGE_SELECT },
      },
    });
  }

  async getChatForParticipant(
    chatId: string,
    userId: string,
  ): Promise<ChatWithMessages> {
    const chat = await this.prisma.chat.findUnique({
      where: { id: chatId },
      select: {
        id: true,
        clientId: true,
        realtorId: true,
        messages: { orderBy: { createdAt: 'asc' }, select: MESSAGE_SELECT },
      },
    });

    if (!chat) {
      throw new WsException('Chat not found');
    }

    if (chat.clientId !== userId && chat.realtorId !== userId) {
      throw new WsException('You are not a participant of this chat');
    }

    return { id: chat.id, messages: chat.messages };
  }

  async getMyChats(userId: string): Promise<ChatListItem[]> {
    const chats = await this.prisma.chat.findMany({
      where: { OR: [{ clientId: userId }, { realtorId: userId }] },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        propertyId: true,
        clientId: true,
        realtorId: true,
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: MESSAGE_SELECT,
        },
      },
    });

    return chats.map((chat) => ({
      id: chat.id,
      propertyId: chat.propertyId,
      peerId: chat.clientId === userId ? chat.realtorId : chat.clientId,
      lastMessage: chat.messages[0] ?? null,
    }));
  }

  async createMessage(
    chatId: string,
    senderId: string,
    text: string,
  ): Promise<ChatMessage> {
    await this.assertChatParticipant(chatId, senderId);

    const [message] = await this.prisma.$transaction([
      this.prisma.message.create({
        data: { chatId, senderId, text },
        select: MESSAGE_SELECT,
      }),
      // keeps the chat list ordered by real activity
      this.prisma.chat.update({
        where: { id: chatId },
        data: { updatedAt: new Date() },
      }),
    ]);

    return message;
  }

  private async assertChatParticipant(chatId: string, userId: string) {
    const chat = await this.prisma.chat.findUnique({
      where: { id: chatId },
      select: { id: true, clientId: true, realtorId: true },
    });

    if (!chat) {
      throw new WsException('Chat not found');
    }

    if (chat.clientId !== userId && chat.realtorId !== userId) {
      throw new WsException('You are not a participant of this chat');
    }

    return chat;
  }
}
