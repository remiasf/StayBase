import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { CreateApartmentDto } from './dto/create-apartment.dto';
import { UpdateApartmentDto } from './dto/update-apartment.dto';
import { PrismaService } from '../prisma/prisma.service';
import { FilterApartmentDto } from './dto/filter-apartment.dto';
import { MapboxService } from '../mapbox/mapbox.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { AiService } from '../ai/ai.service';
import { CurrencyConversion } from '../currency-conversion/currency-conversion.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class ApartmentsService {
  
  constructor(
    private readonly prisma: PrismaService, 
    private readonly mapboxService: MapboxService,
    private readonly cloudinaryServise: CloudinaryService,
    private readonly aiService: AiService,
    private readonly currencyConversion: CurrencyConversion
  ) {}

  async create(userId: string, dto: CreateApartmentDto) {
    const addressInfo = await this.mapboxService.getCoordinates(dto.address);
    if (addressInfo === null) {
      throw new BadRequestException('Invalid address provided. Please check the address and try again.');
    }

    const currencyConversionInfo = await this.currencyConversion.convertToUsd(dto.price, dto.currency);

    const newApartment = await this.prisma.apartment.create({
      data: {
        title: dto.title,
        description: dto.description,
        city: addressInfo.city,
        address: addressInfo.address,
        latitude: addressInfo.latitude,
        longitude: addressInfo.longitude,
        maxGuests: dto.maxGuests,
        price: dto.price,
        priceUsd: currencyConversionInfo.amountInUsd,
        currency: currencyConversionInfo.currencyCode,
        rooms: dto.rooms,
        discountPercent: dto.discountPercent,
        size: dto.size,
        userId: userId,
      }
    });

    return newApartment;
  } 
  
  async uploadImages(apartmentId: string, files: Array<Express.Multer.File>) {
    const MAX_IMAGES_LIMIT = 20;

    if(!files || files.length === 0){
      throw new BadRequestException('No images provided');
    }

    const apartment = await this.prisma.apartment.findUnique({
      where: {
        id: apartmentId
      },
      select: {
        images: true,
      }
    });

    if (!apartment){
      throw new NotFoundException('Apartment not found');
    }

    const currentImagesCount = apartment.images.length || 0;
    const newImagesCount = files.length || 0;

    if(currentImagesCount + newImagesCount > MAX_IMAGES_LIMIT){
      const allowedLeft = MAX_IMAGES_LIMIT - currentImagesCount;
      throw new BadRequestException(`Amount of loaded images is above the limit of ${MAX_IMAGES_LIMIT}, only ${allowedLeft} allowed`);
    }

    const uploadTasks = files.map(file => this.cloudinaryServise.uploadImage(file));
    const uploadResults = await Promise.all(uploadTasks);

    const imageUrls = uploadResults.map(result => result.secure_url);

    const updatedApartment = await this.prisma.apartment.update({
      where: {
        id: apartmentId,
      },
      data:{
        images:{
          push: imageUrls,
        },
      },
    });

    console.log(updatedApartment);

    return updatedApartment;
  }

  async removeImages(apartmentId: string){
     const apartment = await this.prisma.apartment.findUnique({
      where: {
        id: apartmentId
      },
      select: {
        images: true,
      }
    });

    if (!apartment){
      throw new NotFoundException('Apartment not found');
    }

    await await this.prisma.apartment.update({
      where: {
        id: apartmentId
      },
      data: {
        images: []
      }
    })
  }

  async findAll(filterDto: FilterApartmentDto, pageNumber: number) {
  const whereCondition: any = {};
  const { minPrice, maxPrice, minSize, maxSize, rooms, address, radius } = filterDto;

  const limit = 20;
  const skip = (Number(pageNumber) - 1) * limit;
  
  let apartmentIdsInRadius: string[] = [];
  let isGeoSearch = false; 
  let finalPageNumber = 1;

  if( Number(pageNumber) < 1){
    finalPageNumber = 1;
  }else{
    finalPageNumber = Number(pageNumber);
  }


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
  const parsedMinSize = minSize !== undefined ? Number(minSize) : undefined;
  const parsedMaxSize = maxSize !== undefined ? Number(maxSize) : undefined;

  // NaN protection
  if (Number.isNaN(parsedMinSize) || Number.isNaN(parsedMaxSize)) {
    throw new BadRequestException('Size should be valid.');
  }

  // Size filter
  if (parsedMinSize !== undefined || parsedMaxSize !== undefined) {
    whereCondition.size = {
      gte: parsedMinSize,
      lte: parsedMaxSize,
    };
  }

  const parsedMinPrice = minPrice !== undefined ? Number(minPrice) : undefined;
  const parsedMaxPrice = maxPrice !== undefined ? Number(maxPrice) : undefined;

  if (Number.isNaN(parsedMinPrice) || Number.isNaN(parsedMaxPrice)) {
    throw new BadRequestException('Price should be valid');
  }

  if (parsedMinPrice !== undefined || parsedMaxPrice !== undefined) {
    whereCondition.priceUsd = {
      gte: parsedMinPrice,
      lte: parsedMaxPrice,
    };
  }

  // Rooms quantity filter
  if (rooms !== undefined) {
    whereCondition.rooms = Number(rooms);
  }

  const totalCount = await this.prisma.apartment.count({ where: whereCondition });

  // DB query
  let apartments = await this.prisma.apartment.findMany({
    where: whereCondition,
    ...(!isGeoSearch ? { take: limit, skip: skip } : {}),
  });

 
  if (isGeoSearch && apartmentIdsInRadius) {
    apartments.sort((a, b) => {
      return apartmentIdsInRadius!.indexOf(a.id) - apartmentIdsInRadius!.indexOf(b.id);
    });

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

  async update(id: string, dto: UpdateApartmentDto) {
    const existingApartment = await this.prisma.apartment.findUnique({
      where:{ id }
    });

    if( !existingApartment ){
      throw new NotFoundException('Apartment not found');
    }

    const dataToUpdate: Prisma.ApartmentUpdateInput = {...dto};
    
    if( dto.address ){
      const addressInfo = await this.mapboxService.getCoordinates(dto.address);

      if( !addressInfo ){
        throw new BadRequestException('Invalid address provided. Cannot find coordinates.');
      }

      const { latitude, longitude, city, address } = addressInfo;
      dataToUpdate.latitude = latitude;
      dataToUpdate.longitude = longitude;
      dataToUpdate.city = city;
      dataToUpdate.address = address;
  }

    if( dto.price !== undefined || dto.currency !== undefined){
      const priceToConvert = dto.price ?? existingApartment.price;
      const currencyToConvert = dto.currency ?? existingApartment.currency;
      
      const {amountInUsd, currencyCode} = await this.currencyConversion.convertToUsd(priceToConvert, currencyToConvert);
      dataToUpdate.priceUsd = amountInUsd;
      dataToUpdate.currency = currencyCode;
    }
  
    return this.prisma.apartment.update({
      where: { id },
      data: dataToUpdate
    });
  }

  async remove(id: string) {
    const apartment = await this.findOne(id);

    await this.prisma.apartment.delete({
      where: { id }
    });
    
    return apartment;
  }

  async aiReview(id: string) {
    const apartment = await this.findOne(id);

    const aiReviewedData = await this.aiService.analyzePropertyDescription(apartment);
    return {
      aiReviewedData
    }
  }
}