import { Injectable } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ChatService {
  constructor(private readonly prisma: PrismaService) {}

  async getOrCreateChat(
    propertyId: string,
    clientId: string,
    realtorId: string,
    currentUserId: string,
  ) {
    if (currentUserId !== clientId && currentUserId !== realtorId) {
      throw new WsException('You are not a participant of this chat');
    }

    const realtorAndProperty = await this.prisma.user.findUnique({
      where: {
        id: realtorId,
      },
      select: {
        id: true,
        role: true,
        apartments: {
          where: {
            id: propertyId,
          },
          select: {
            id: true,
          },
        },
      },
    });

    const client = await this.prisma.user.findUnique({
      where: {
        id: clientId,
      },
      select: {
        id: true,
      },
    });

    if (!realtorAndProperty) {
      throw new WsException('Invalid realtor ID provided');
    }

    if (realtorAndProperty.role !== 'LANDLORD') {
      throw new WsException('Invalid realtor provided (realtor is not a landlord)');
    }

    if (!realtorAndProperty.apartments.length) {
      throw new WsException(
        'Invalid realtor provided (realtor has no such listing available)',
      );
    }

    if (!client) {
      throw new WsException('Invalid client ID provided');
    }

    return this.prisma.chat.upsert({
      where: {
        propertyId_clientId_realtorId: { propertyId, clientId, realtorId },
      },
      update: {},
      create: { propertyId, clientId, realtorId },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });
  }

  async assertChatParticipant(chatId: string, userId: string) {
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

  async createMessage(chatId: string, senderId: string, text: string) {
    await this.assertChatParticipant(chatId, senderId);

    return this.prisma.message.create({
      data: { chatId, senderId, text },
    });
  }
}
