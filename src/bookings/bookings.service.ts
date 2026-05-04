import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateBookingDto } from './dto/create-booking.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { BookingStatus, Prisma } from '@prisma/client';
import { FilterBookingDto } from './dto/filter-booking.dto';

@Injectable()
export class BookingsService {
  constructor(private prisma: PrismaService){}
  async createBooking( id: string ,dto: CreateBookingDto) {
    return this.prisma.$transaction(async (tx) => {
      const apartment = await tx.apartment.findUnique({
        where: {
          id: dto.apartmentId,
        },
        select:{ discountPrice: true, userId: true}
      });

      if (!apartment) {
        throw new NotFoundException('Apartment not found');
      }

      if (apartment.userId === id) {
        throw new ForbiddenException('You can`t book your own property');
      }

      if (dto.startDate > dto.endDate) {
        throw new BadRequestException('Invalid booking period');
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const start = new Date(dto.startDate);
      start.setHours(0, 0, 0, 0);

      const end = new Date(dto.endDate);
      end.setHours(0, 0, 0, 0);

      const rentPeriod = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24) || 1);

      if (start < today) {
        throw new BadRequestException('You can`t book an apartment in the past');
      }
      
      const overlap = await tx.booking.findFirst({
        where: {
          apartmentId: dto.apartmentId,
          status: {not: 'CANCELLED'},
          AND: [
            { startDate: { lt: end }},
            { endDate: { gt: start}}
          ]
        },
      });

      if (overlap) {
        throw new ConflictException('The apartment is already booked for these dates');
      }

      const newRecord = await tx.booking.create({
        data: {
          startDate: start,
          endDate: end,
          apartmentId: dto.apartmentId,
          userId: id,
          dailyPrice: apartment.discountPrice,
          totalPrice: apartment.discountPrice * rentPeriod
        }
      });

      return {
        message: 'The apartment has been booked successfully',
        bookingId: newRecord.id
      };

    },
    {
      timeout: 10000,
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable
    }); 
  }

  async myBookings(id: string, dto: FilterBookingDto) {
    const {limit = 10, page = 1, status} = dto;
    
    const safeLimit = Math.min(limit, 100);
    const skip = (page - 1) * safeLimit;

    const whereCondition: Prisma.BookingWhereInput = {
      userId: id,
      ...(status && {status})
    };

    const [bookings, total] = await Promise.all([
      this.prisma.booking.findMany({
        where: whereCondition,
        take: safeLimit,
        skip: skip,
        select:{
          id: true,
          status: true,
          startDate: true,
          totalPrice: true,
          apartment: { select: { title: true } }
        },
        orderBy:{
          createdAt: 'desc'
        },
      }),
      this.prisma.booking.count({
        where: whereCondition,
      })
    ]);

    return {
      data: bookings,
      meta: {
        total,
        page,
        limit: safeLimit,
        totalPages: Math.ceil(total / safeLimit)
      }
    };
  }

  async landlordRequests(landlordId: string, dto: FilterBookingDto) {
    const {limit = 10, page = 1, status} = dto;
    
    const safeLimit = Math.min(limit, 100);
    const skip = (page - 1) * safeLimit;

    const whereCondition: Prisma.BookingWhereInput = {
      apartment:{userId: landlordId},
      ...(status && {status})
    }

    const [bookings, total] = await Promise.all([
      this.prisma.booking.findMany({
        where: whereCondition,
        take: safeLimit,
        skip: skip,
        select:{
          id: true,
          status: true,
          startDate: true,
          endDate: true,
          totalPrice: true,
          apartment: {select:{title: true}},
          user: {select:{email: true}}
        },
        orderBy:{
          createdAt: 'desc'
        },
      }),
      this.prisma.booking.count({
        where: whereCondition
      })
    ]);

    return {
      data: bookings,
      meta: {
        total,
        page,
        limit: safeLimit,
        totalPages: Math.ceil(total / safeLimit)
      }
    }
  }
  
  async bookingInfo(bookingId: string, userId: string) {

    const booking = await this.prisma.booking.findUnique({
      where:{
        id: bookingId,
        userId: userId
      }
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    return booking;
  }

  async landlordBookingInfo(bookingId: string, landlordId: string) {
    const booking = await this.prisma.booking.findFirst({ 
      where: {
        id: bookingId,
        apartment: {
          userId: landlordId
        }
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          }
        },
        apartment: {
          select: {
            title: true,
            price: true
          }
        }
      }
    });

    if (!booking) {
      throw new NotFoundException('Booking not found or you do not have access to it');
    }

    return booking;
  }

  async userCancelBooking(bookingId: string, userId: string) {
    try{
      const cancelledBooking = await this.prisma.booking.update({
        where: {
          id: bookingId,
          userId,
          status: {
            in: ['PENDING', 'APPROVED']
          }
        },
        data: {
          status: 'CANCELLED'
        }
      });

      return {
        message: 'Your booking has been cancelled successfully',
        booking: cancelledBooking
      };
      
    }catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new ForbiddenException('You can only cancel your own bookings, or booking not found');
        }
      }      
      throw error;
    }
  }

  async landlordRejectBooking(bookingId: string, landlordId: string){
    try {
      const rejectedBooking = await this.prisma.booking.update({
        where: {
          id: bookingId,
          apartment: {
            userId: landlordId
          },
          status: 'PENDING'
        },
        data: {
          status: 'CANCELLED'
        }  
      });

      return {
        message: 'Booking has been rejected successfully',
        booking: rejectedBooking
      }

    }catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new ForbiddenException('You can only reject booking of appartment you own, or booking not found');
        }
      }      
      throw error;
    }
  }

  async landlordApproveBooking(bookingId: string, landlordId: string){
    try {
      const approvedBooking = await this.prisma.booking.update({
        where: {
          id: bookingId,
          apartment: {
            userId: landlordId
          },
          status: 'PENDING'
        },
        data: {
          status: 'APPROVED'
        }  
      });

      return {
        message: 'Booking has been approved successfully',
        booking: approvedBooking
      }

    }catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new ForbiddenException('You can only approve booking of appartment you own, or booking not found');
        }
      }      
      throw error;
    }
  }
}
