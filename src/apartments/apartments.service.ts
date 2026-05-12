import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { CreateApartmentDto } from './dto/create-apartment.dto';
import { UpdateApartmentDto } from './dto/update-apartment.dto';
import { DiscountApartmentDto } from './dto/discount-apartment.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { FilterApartmentDto } from './dto/filter-apartment.dto';
import { MapboxService } from 'src/mapbox/mapbox.service';

@Injectable()
export class ApartmentsService {
  
  constructor(private readonly prisma: PrismaService, private readonly mapboxService: MapboxService) {}

  async create(userId: string, createApartmentDto: CreateApartmentDto) {
    const addressInfo = await this.mapboxService.getCoordinates(createApartmentDto.address);
    if (addressInfo === null) {
      throw new BadRequestException('Invalid address provided. Please check the address and try again.');
    }


    const newApartment = await this.prisma.apartment.create({
      data: {
        title: createApartmentDto.title,
        description: createApartmentDto.description,
        city: addressInfo.city,
        address: addressInfo.address,
        latitude: addressInfo.latitude,
        longitude: addressInfo.longitude,
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
  const whereCondition: any = {};
  const { minPrice, maxPrice, minSize, maxSize, rooms, address, radius } = filterDto;

  const limit = 20;
  const skip = (Number(pageNumber) - 1) * limit;
  
  let apartmentIdsInRadius: string[] = [];
  let isGeoSearch = false; // Флаг, чтобы понимать, нужен ли особый режим пагинации

  // Geo-search (by address and radius)
  if (address && radius) {
    isGeoSearch = true;
    const addressInfo = await this.mapboxService.getCoordinates(address);
    
    if (!addressInfo) {
      throw new BadRequestException('Invalid address provided.');
    }

    const nearby: { id: string, distance: number }[] = await this.prisma.$queryRaw`
      SELECT id, ST_Distance(
        ST_MakePoint(longitude, latitude)::geography,
        ST_MakePoint(${addressInfo.longitude}, ${addressInfo.latitude})::geography
      ) as distance FROM "Apartment"
      WHERE ST_DWithin(
        ST_MakePoint(longitude, latitude)::geography,
        ST_MakePoint(${addressInfo.longitude}, ${addressInfo.latitude})::geography,
        ${radius * 1000}
      )
      ORDER BY distance ASC;
    `;
    
    apartmentIdsInRadius = nearby.map(a => a.id);

    if (apartmentIdsInRadius.length === 0) {
      return { data: [], meta: { total: 0, page: Number(pageNumber), lastPage: 0 } };
    }

    whereCondition.id = { in: apartmentIdsInRadius };
  }

  // Price filter
  if (minPrice || maxPrice) {
    whereCondition.discountPrice = {
      ...(minPrice && { gte: Number(minPrice) }),
      ...(maxPrice && { lte: Number(maxPrice) }),
    };
  }

  // Size filter
  if (minSize || maxSize) {
    whereCondition.size = {
      ...(minSize && { gte: Number(minSize) }),
      ...(maxSize && { lte: Number(maxSize) }),
    };
  }

  // Rooms quantity filter
  if (rooms) {
    whereCondition.rooms = Number(rooms);
  }

  // Сначала считаем общее количество (totalCount нужен для метадаты)
  const totalCount = await this.prisma.apartment.count({ where: whereCondition });

  // DB query
  let apartments = await this.prisma.apartment.findMany({
    where: whereCondition,
    // ВНИМАНИЕ: Применяем пагинацию БД только если это НЕ гео-поиск
    ...(!isGeoSearch ? { take: limit, skip: skip } : {}),
  });

  // Если это гео-поиск, мы достали все подходящие под фильтры квартиры без лимита.
  // Теперь нужно их отсортировать и обрезать (сделать пагинацию) вручную.
  if (isGeoSearch && apartmentIdsInRadius) {
    // 1. Сортируем строго по порядку ID, который выдал PostGIS (от ближайшего)
    apartments.sort((a, b) => {
      return apartmentIdsInRadius!.indexOf(a.id) - apartmentIdsInRadius!.indexOf(b.id);
    });

    // 2. Вручную обрезаем массив под нужную страницу (пагинация в памяти)
    apartments = apartments.slice(skip, skip + limit);
  }

  return {
    data: apartments,
    meta: {
      total: totalCount,
      page: Number(pageNumber),
      lastPage: Math.ceil(totalCount / limit),
    },
  };
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
    if(updateApartmentDto.address !== undefined && updateApartmentDto.address !== null){
      const addressInfo = await this.mapboxService.getCoordinates(updateApartmentDto.address);
      if (addressInfo === null) {
        throw new BadRequestException('Invalid address provided. Please check the address and try again.');
      }
      const { latitude, longitude, city, address } = addressInfo;
      dataToUpdate.latitude = latitude;
      dataToUpdate.longitude = longitude;
      dataToUpdate.city = city;
      dataToUpdate.address = address;
    }
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