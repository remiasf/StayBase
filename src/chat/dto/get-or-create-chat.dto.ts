import { IsUUID } from 'class-validator';

export class GetOrCreateChatDto {
  @IsUUID()
  propertyId: string;
}
