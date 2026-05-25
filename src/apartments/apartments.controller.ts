import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, UseInterceptors, UploadedFiles, UploadedFile, BadRequestException } from '@nestjs/common';
import { ApartmentsService } from './apartments.service';
import { FilesInterceptor } from '@nestjs/platform-express';
import 'multer';
import { CreateApartmentDto } from './dto/create-apartment.dto';
import { UpdateApartmentDto } from './dto/update-apartment.dto';
import { DiscountApartmentDto } from './dto/discount-apartment.dto';
import { FilterApartmentDto } from './dto/filter-apartment.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guards';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { IsApartmentOwnerGuard } from 'src/common/guards/apartmentOwnerCheck.guard';
import { CurrentUserID } from 'src/common/decorators/currentUserID.decorator';
import { ApiBearerAuth, ApiOperation, ApiProperty } from '@nestjs/swagger';

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
  create(@CurrentUserID() userId: string, @Body()  createApartmentDto: CreateApartmentDto) {
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
    summary: 'Set a discount to your apartment'
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, IsApartmentOwnerGuard, RolesGuard)
  @Roles(Role.LANDLORD)
  @Patch(':id/discount')
  setDiscount(@Param('id') id: string, @Body() discountDto: DiscountApartmentDto) {
    return this.apartmentsService.setDiscount(id, discountDto);
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
}
