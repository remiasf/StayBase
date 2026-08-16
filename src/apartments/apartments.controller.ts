import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, UseInterceptors, UploadedFiles, UploadedFile, BadRequestException, Res, HttpStatus } from '@nestjs/common';
import { ApartmentsService } from './apartments.service';
import { FilesInterceptor } from '@nestjs/platform-express';
import 'multer';
import { CreateApartmentDto } from './dto/create-apartment.dto';
import { UpdateApartmentDto } from './dto/update-apartment.dto';
import { FilterApartmentDto } from './dto/filter-apartment.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guards';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { IsApartmentOwnerGuard } from 'src/common/guards/apartmentOwnerCheck.guard';
import { CurrentUserID } from 'src/common/decorators/currentUserID.decorator';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { ApiBearerAuth, ApiOperation, ApiProperty } from '@nestjs/swagger';
import { Response } from 'express';

@Controller('apartments')
export class ApartmentsController {
  constructor(private readonly apartmentsService: ApartmentsService) {}

  @ApiOperation({
    summary: 'Create new apartment listing'
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.LANDLORD)
  @Post()
  create(@CurrentUserID() userId: string, @Query()  createApartmentDto: CreateApartmentDto) {
    return this.apartmentsService.create(userId, createApartmentDto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, IsApartmentOwnerGuard, RolesGuard)
  @Roles(Role.LANDLORD)
  @Post(':id/images')
  @UseInterceptors(FilesInterceptor('images', 15, {
    fileFilter(req, file, callback) {
      if(!file.mimetype.match(/\/(jpg|jpeg|png|webp)$/)) {
        return callback(new BadRequestException('only JPG, JPEG, PNG and WEBP allowed'), false);
      }
      callback(null, true);
    },
  }))
  async uploadImages(@Param('id') apartmentId: string ,@UploadedFiles() files: Array<Express.Multer.File>) {
    return this.apartmentsService.uploadImages(apartmentId, files);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, IsApartmentOwnerGuard, RolesGuard)
  @Roles(Role.LANDLORD)
  @Delete(':id/images/remove')
  @UseInterceptors(FilesInterceptor('images', 15))
  async removeImages(@Param('id') apartmentId: string ,@UploadedFiles() files: Array<Express.Multer.File>) {
    return this.apartmentsService.removeImages(apartmentId);
  }

  @ApiOperation({
    summary: 'Get a list of apartments (pagination)'
  })
  @Get()
  findAll(@Query() filterDto: FilterApartmentDto) {
    const pageNumber = Number(filterDto.page) || 1;
    return this.apartmentsService.findAll(filterDto, pageNumber);
  }

  @ApiOperation({
    summary: 'Get apartments created by the current landlord (pagination)'
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.LANDLORD)
  @Get('me')
  findMyApartments(
    @CurrentUserID() userId: string,
    @Query() dto: PaginationDto,
  ) {
    return this.apartmentsService.findMyApartments(userId, dto);
  }

  @ApiOperation({
    summary: 'Get booked dates for apartment availability calendar',
    description:
      'Returns non-cancelled bookings as check-in/check-out ranges (YYYY-MM-DD). Checkout day (endDate) is available for a new stay.',
  })
  @Get(':id/availability')
  checkAvailability(@Param('id') id: string) {
    return this.apartmentsService.checkAvailability(id);
  }

  @ApiOperation({
    summary: 'Get a single apartment by ID'
  })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.apartmentsService.findOne(id);
  }
  
  @ApiOperation({
    summary: 'Patch apartment properties'
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, IsApartmentOwnerGuard, RolesGuard)
  @Roles(Role.LANDLORD)
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateApartmentDto: UpdateApartmentDto) {
    return this.apartmentsService.update(id, updateApartmentDto);
  }

  @ApiOperation({
    summary: 'Delete apartment by ID'
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, IsApartmentOwnerGuard, RolesGuard)
  @Roles(Role.LANDLORD)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.apartmentsService.remove(id);
  }

  @ApiOperation({
    summary: 'Get an AI consultation about apartment'
  })
  @ApiBearerAuth()
  @UseGuards( RolesGuard)
  @Get(':id/ai-review')
  async getAiReview(
    @Param('id') id: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const review = await this.apartmentsService.getAiReview(id);

    if ( review === null ) {
      res.status(HttpStatus.NO_CONTENT);
      return;
    }

    return review;
  }

  @ApiOperation({
    summary: 'Create an AI consultation about apartment'
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post(':id/ai-review')
  createAiReview(@Param('id') id: string) {
    return this.apartmentsService.createAiReview(id);
  }
}
