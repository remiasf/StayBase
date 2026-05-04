import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { CreateApartmentDto } from './dto/create-apartment.dto';
import { UpdateApartmentDto } from './dto/update-apartment.dto';
import { DiscountApartmentDto } from './dto/discount-apartment.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { FilterApartmentDto } from './dto/filter-apartment.dto';

@Injectable()
export class ApartmentsService {
  
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, createApartmentDto: CreateApartmentDto) {
    const newApartment = await this.prisma.apartment.create({
      data: {
        title: createApartmentDto.title,
        description: createApartmentDto.description,
        city: createApartmentDto.city,
        address: createApartmentDto.address,
        maxGuests: createApartmentDto.maxGuests,
        price: createApartmentDto.price,
        rooms: createApartmentDto.rooms,
        discountPrice: createApartmentDto.price,
        size: createApartmentDto.size,
        userId: userId,
    
      }
    });

    return newApartment;
  } 

  async findAll(filterDto: FilterApartmentDto, pageNumber: number) {

      const { minPrice, maxPrice, minSize, maxSize, rooms} = filterDto;

      const whereCondition: any = {};
      //price filter
      if (minPrice || maxPrice) {
        whereCondition.discountPrice = {};

        if (minPrice) {
          whereCondition.discountPrice.gte = Number(minPrice);
        }

        if (maxPrice) {
          whereCondition.discountPrice.lte = Number(maxPrice);
        }
      }
      //size filter
      if (minSize || maxSize) {
        whereCondition.size = {};

        if(minSize){
          whereCondition.size.gte = Number(minSize);
        }
        if(maxSize){
          whereCondition.size.lte = Number(maxSize);
        }
      }
      //rooms number filter
      if (rooms) {
        whereCondition.rooms = Number(rooms);
      }

      const limit = 20;
      const skip = (pageNumber - 1) * limit;



      const apartments = await this.prisma.apartment.findMany({
        where: whereCondition,
        take  : limit,
        skip: skip,
      });

      const totalCount = await this.prisma.apartment.count({
        where: whereCondition
      });

      return {
        data: apartments,
        meta: {
          total: totalCount,
          page: filterDto.page,
          lastPage: Math.ceil(totalCount / limit)
        }
      }
  }

  async findOne(id: string) {
    const apartment = await this.prisma.apartment.findUnique({
      where: { id }
    });

    if (!apartment) {
      throw new NotFoundException(`Apartment with ID ${id} not found, sorry!`);
    }
    return apartment;
  }

  async update(id: string, updateApartmentDto: UpdateApartmentDto) {
    if(updateApartmentDto.discountPrice !== undefined){
      throw new BadRequestException('You are able to apply discount only using special method setDiscount');
    }
    
    const dataToUpdate: any = {...updateApartmentDto};

    if(updateApartmentDto.price){
      dataToUpdate.discountPrice = updateApartmentDto.price;
    }

    return this.prisma.apartment.update({
      where: { id },
      data: dataToUpdate
    });
  }

  async setDiscount(id: string, discountDto: DiscountApartmentDto) {
    
    const apartment = await this.findOne(id);
    const currentPrice = apartment.price;
    const newPrice = Math.round(currentPrice - (currentPrice * discountDto.discountPercentage / 100)); 

    return this.prisma.apartment.update({
      where: { id },
      data: { discountPrice: newPrice }
    });
  }

  async remove(id: string) {
    await this.findOne(id); // Проверяем, есть ли она

    await this.prisma.apartment.delete({
      where: { id }
    });
    
    return `This action removes a #${id} apartment`;
  }
}