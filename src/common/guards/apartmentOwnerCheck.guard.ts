import { 
  Injectable, 
  CanActivate, 
  ExecutionContext, 
  NotFoundException, 
  ForbiddenException, 
  BadRequestException
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';


@Injectable()
export class IsApartmentOwnerGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {

    const request = context.switchToHttp().getRequest();
    const user = request.user; 

    if (!user || !user.id) { 
        throw new ForbiddenException('User not authorized');
    }

    if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') {
        return true;
    }

    const apartmentId = request.params.id;

    if (!apartmentId) {
      throw new BadRequestException('Apartment ID is missing in URL');
    }

    const apartment = await this.prisma.apartment.findUnique({
      where: { id: apartmentId },
      select: { userId: true } 
    });

    if (!apartment) {
      throw new NotFoundException('Apartment not found');
    }

    if (apartment.userId !== user.id) {
      throw new ForbiddenException('You have no rights to configure this apartment');
    }

    return true; 
  }
}