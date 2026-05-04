import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, ParseIntPipe, Query } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { CurrentUserID } from 'src/common/decorators/currentUserID.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guards';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { FilterBookingDto } from './dto/filter-booking.dto';
import { Role } from '@prisma/client';
import { ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

@Controller('bookings')
@UseGuards(JwtAuthGuard)
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}
  @ApiOperation({
    summary: 'Create booking'
  })
  @ApiBearerAuth()
  @Post('book')
  createBooking(@CurrentUserID() id: string, @Body() dto: CreateBookingDto) {
    return this.bookingsService.createBooking(id, dto);
  }

  @ApiOperation({
    summary: 'Get all my bookings (pagination)'
  })
  @ApiBearerAuth()
  @Get('me')
  myBookings(@CurrentUserID() id: string, @Query() dto: FilterBookingDto) {
    return this.bookingsService.myBookings(id, dto);
  }

  @ApiOperation({
    summary: 'Landlords rent requests (paginations)'
  })
  @ApiBearerAuth()
  @Get('requests')
  @UseGuards(RolesGuard)
  @Roles(Role.LANDLORD)
  landlordRequests(@CurrentUserID() landlordId: string, @Query() dto: FilterBookingDto){
    return this.bookingsService.landlordRequests(landlordId, dto);
  }

  @ApiOperation({
    summary: 'Single booking info (for simple users)'
  })
  @ApiBearerAuth()
  @Get(':id')
  bookingInfo(@Param('id', ParseIntPipe) bookingId: string, @CurrentUserID() userId: string) {
    return this.bookingsService.bookingInfo(bookingId, userId);
  }

  @ApiOperation({
    summary: 'Single booking info (for landlords)'
  })
  @ApiBearerAuth()
  @Get(':id/landlord')
  @UseGuards(RolesGuard)
  @Roles(Role.LANDLORD)
  landlordBookingInfo(@Param('id', ParseIntPipe) bookingId: string, @CurrentUserID() landlordId: string) {
    return this.bookingsService.landlordBookingInfo(bookingId, landlordId);
  }

  @ApiOperation({
    summary: 'Booking cancel (for users)'
  })
  @ApiBearerAuth()
  @Patch(':id/cancel')
  userCancelBooking(@Param('id', ParseIntPipe) bookingId: string, @CurrentUserID() userId: string) {
    return this.bookingsService.userCancelBooking(bookingId, userId);
  }

  @ApiOperation({
    summary: 'Booking reject (for landlords)'
  })
  @ApiBearerAuth()
  @Patch(':id/reject')
  @UseGuards(RolesGuard)
  @Roles(Role.LANDLORD)
  landlordRejectBooking(@Param('id', ParseIntPipe) bookingId: string, @CurrentUserID() landlordId: string) {
    return this.bookingsService.landlordRejectBooking(bookingId, landlordId);
  }

  @ApiOperation({
    summary: 'Booking approving (for landlords)'
  })
  @ApiBearerAuth()
  @Patch(':id/approve')
  @UseGuards(RolesGuard)
  @Roles(Role.LANDLORD)
  landlordApproveBooking(@Param('id', ParseIntPipe) bookingId: string, @CurrentUserID() landlordId: string) {
    return this.bookingsService.landlordApproveBooking(bookingId, landlordId);
  }
}
