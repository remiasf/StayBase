import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateBookingDto } from './dto/create-booking.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { FilterBookingDto } from './dto/filter-booking.dto';

/** Fields returned in booking lists (cards / tables). */
const bookingListSelect = {
  id: true,
  status: true,
  startDate: true,
  endDate: true,
  nights: true,
  currency: true,
  localPrice: true,
  dailyPrice: true,
  discountPercent: true,
  totalPrice: true,
  title: true,
  city: true,
  address: true,
  images: true,
  rooms: true,
  size: true,
  maxGuests: true,
  apartmentId: true,
  createdAt: true,
} as const;

/** Full booking payload for detail screens. */
const bookingDetailSelect = {
  ...bookingListSelect,
  description: true,
  latitude: true,
  longitude: true,
  updatedAt: true,
  userId: true,
  apartment: {
    select: {
      id: true,
      userId: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          avatarUrl: true,
        },
      },
    },
  },
  user: {
    select: {
      id: true,
      name: true,
      email: true,
      avatarUrl: true,
    },
  },
} as const;

@Injectable()
export class BookingsService {
  constructor(private prisma: PrismaService) {}

  async createBooking(id: string, dto: CreateBookingDto) {
    return this.prisma.$transaction(
      async (tx) => {
        const apartment = await tx.apartment.findUnique({
          where: { id: dto.apartmentId },
          select: {
            id: true,
            title: true,
            description: true,
            images: true,
            city: true,
            address: true,
            latitude: true,
            longitude: true,
            size: true,
            rooms: true,
            maxGuests: true,
            price: true,
            priceUsd: true,
            discountPercent: true,
            currency: true,
            userId: true,
          },
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

        const nights = Math.max(
          1,
          Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)),
        );

        if (start < today) {
          throw new BadRequestException('You can`t book an apartment in the past');
        }

        const overlap = await tx.booking.findFirst({
          where: {
            apartmentId: dto.apartmentId,
            status: { not: 'CANCELLED' },
            AND: [{ startDate: { lt: end } }, { endDate: { gt: start } }],
          },
        });

        if (overlap) {
          throw new ConflictException('The apartment is already booked for these dates');
        }

        const dailyPrice = apartment.priceUsd ?? apartment.price;
        const discountPercent = apartment.discountPercent ?? 0;

        const newRecord = await tx.booking.create({
          data: {
            startDate: start,
            endDate: end,
            apartmentId: dto.apartmentId,
            userId: id,
            title: apartment.title,
            description: apartment.description,
            images: apartment.images,
            city: apartment.city,
            address: apartment.address,
            latitude: apartment.latitude,
            longitude: apartment.longitude,
            size: apartment.size,
            rooms: apartment.rooms,
            maxGuests: apartment.maxGuests,
            localPrice: apartment.price,
            currency: apartment.currency,
            discountPercent,
            dailyPrice,
            nights,
            totalPrice: dailyPrice * nights,
          },
          select: bookingDetailSelect,
        });

        return {
          message: 'The apartment has been booked successfully',
          booking: newRecord,
        };
      },
      {
        timeout: 10000,
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );
  }

  async myBookings(id: string, dto: FilterBookingDto) {
    const { limit = 10, page = 1, status } = dto;

    const safeLimit = Math.min(limit, 100);
    const skip = (page - 1) * safeLimit;

    const whereCondition: Prisma.BookingWhereInput = {
      userId: id,
      ...(status && { status }),
    };

    const [bookings, total] = await Promise.all([
      this.prisma.booking.findMany({
        where: whereCondition,
        take: safeLimit,
        skip,
        select: {
          ...bookingListSelect,
          apartment: {
            select: {
              user: {
                select: {
                  id: true,
                  name: true,
                  avatarUrl: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.booking.count({ where: whereCondition }),
    ]);

    return {
      data: bookings,
      meta: {
        total,
        page,
        limit: safeLimit,
        totalPages: Math.ceil(total / safeLimit),
      },
    };
  }

  async landlordRequests(landlordId: string, dto: FilterBookingDto) {
    const { limit = 10, page = 1, status } = dto;

    const safeLimit = Math.min(limit, 100);
    const skip = (page - 1) * safeLimit;

    const whereCondition: Prisma.BookingWhereInput = {
      apartment: { userId: landlordId },
      ...(status && { status }),
    };

    const [bookings, total] = await Promise.all([
      this.prisma.booking.findMany({
        where: whereCondition,
        take: safeLimit,
        skip,
        select: {
          ...bookingListSelect,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.booking.count({ where: whereCondition }),
    ]);

    return {
      data: bookings,
      meta: {
        total,
        page,
        limit: safeLimit,
        totalPages: Math.ceil(total / safeLimit),
      },
    };
  }

  async bookingInfo(bookingId: string, userId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: {
        id: bookingId,
        userId,
      },
      select: bookingDetailSelect,
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
          userId: landlordId,
        },
      },
      select: bookingDetailSelect,
    });

    if (!booking) {
      throw new NotFoundException('Booking not found or you do not have access to it');
    }

    return booking;
  }

  async userCancelBooking(bookingId: string, userId: string) {
    try {
      const cancelledBooking = await this.prisma.booking.update({
        where: {
          id: bookingId,
          userId,
          status: {
            in: ['PENDING', 'APPROVED'],
          },
        },
        data: {
          status: 'CANCELLED',
        },
        select: bookingListSelect,
      });

      return {
        message: 'Your booking has been cancelled successfully',
        booking: cancelledBooking,
      };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new ForbiddenException('You can only cancel your own bookings, or booking not found');
        }
      }
      throw error;
    }
  }

  async landlordRejectBooking(bookingId: string, landlordId: string) {
    try {
      const rejectedBooking = await this.prisma.booking.update({
        where: {
          id: bookingId,
          apartment: {
            userId: landlordId,
          },
          status: 'PENDING',
        },
        data: {
          status: 'CANCELLED',
        },
        select: bookingListSelect,
      });

      return {
        message: 'Booking has been rejected successfully',
        booking: rejectedBooking,
      };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new ForbiddenException(
            'You can only reject booking of appartment you own, or booking not found',
          );
        }
      }
      throw error;
    }
  }

  async landlordApproveBooking(bookingId: string, landlordId: string) {
    try {
      const approvedBooking = await this.prisma.booking.update({
        where: {
          id: bookingId,
          apartment: {
            userId: landlordId,
          },
          status: 'PENDING',
        },
        data: {
          status: 'APPROVED',
        },
        select: bookingListSelect,
      });

      return {
        message: 'Booking has been approved successfully',
        booking: approvedBooking,
      };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new ForbiddenException(
            'You can only approve booking of appartment you own, or booking not found',
          );
        }
      }
      throw error;
    }
  }
}
