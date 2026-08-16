import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { CreateApartmentDto } from './dto/create-apartment.dto';
import { UpdateApartmentDto } from './dto/update-apartment.dto';
import { PrismaService } from '../prisma/prisma.service';
import { FilterApartmentDto } from './dto/filter-apartment.dto';
import { MapboxService } from '../mapbox/mapbox.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { AiService } from '../ai/ai.service';
import { CurrencyConversion } from '../currency-conversion/currency-conversion.service';
import { PaginationDto } from '../common/dto/pagination.dto';
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

  async findMyApartments(userId: string, dto: PaginationDto) {
    const { limit = 10, page = 1 } = dto;
    const safeLimit = Math.min(limit, 100);
    const skip = (page - 1) * safeLimit;

    const whereCondition = { userId };

    const [apartments, total] = await Promise.all([
      this.prisma.apartment.findMany({
        where: whereCondition,
        take: safeLimit,
        skip,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.apartment.count({ where: whereCondition }),
    ]);

    return {
      data: apartments,
      meta: {
        total,
        page,
        limit: safeLimit,
        totalPages: Math.ceil(total / safeLimit),
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

  async checkAvailability(id: string) {
    const apartment = await this.prisma.apartment.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!apartment) {
      throw new NotFoundException(`Apartment with ID ${id} not found, sorry!`);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const bookings = await this.prisma.booking.findMany({
      where: {
        apartmentId: id,
        status: { not: 'CANCELLED' },
        endDate: { gt: today },
      },
      select: {
        startDate: true,
        endDate: true,
      },
      orderBy: { startDate: 'asc' },
    });

    return {
      apartmentId: id,
      unavailable: bookings.map((booking) => ({
        startDate: this.formatDateOnly(booking.startDate),
        endDate: this.formatDateOnly(booking.endDate),
      })),
    };
  }

  private formatDateOnly(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  async update(id: string, dto: UpdateApartmentDto) {
    const existingApartment = await this.prisma.apartment.findUnique({
      where: { id }
    });

    if (!existingApartment) {
      throw new NotFoundException('Apartment not found');
    }

    const dataToUpdate: Prisma.ApartmentUpdateInput = { ...dto };

    if (dto.address) {
      const addressInfo = await this.mapboxService.getCoordinates(dto.address);

      if (!addressInfo) {
        throw new BadRequestException('Invalid address provided. Cannot find coordinates.');
      }

      const { latitude, longitude, city, address } = addressInfo;
      dataToUpdate.latitude = latitude;
      dataToUpdate.longitude = longitude;
      dataToUpdate.city = city;
      dataToUpdate.address = address;
    }

    if (dto.price !== undefined || dto.currency !== undefined) {
      const priceToConvert = dto.price ?? existingApartment.price;
      const currencyToConvert = dto.currency ?? existingApartment.currency;

      const { amountInUsd, currencyCode } = await this.currencyConversion.convertToUsd(priceToConvert, currencyToConvert);
      dataToUpdate.priceUsd = amountInUsd;
      dataToUpdate.currency = currencyCode;
    }

    const [, updatedApartment] = await this.prisma.$transaction([
      this.prisma.aiReview.deleteMany({ where: { apartmentId: id } }),
      this.prisma.apartment.update({ where: { id }, data: dataToUpdate }),
    ]);

    return updatedApartment;
  }

  async remove(id: string) {
    const apartment = await this.findOne(id);

    await this.prisma.apartment.delete({
      where: { id }
    });
    
    return apartment;
  }

  async getAiReview(id: string) {
    const aiReview = await this.prisma.aiReview.findUnique({
      where: { apartmentId: id }
    });

    if( !aiReview ) {
      return null;
    }

    return aiReview;
  }
  
  async createAiReview(id: string) {
    const apartment = await this.prisma.apartment.findUnique({
      where: { id },
      include: {
        aiReview: true,
      }
    });
    

    if( !apartment ) {
      throw new NotFoundException(`Apartment with ID ${id} not found, sorry!`);
    }

    if( apartment.aiReview ) {
      return apartment.aiReview;
    }

    const { aiReview, userId, ...apartmentData } = apartment;
    const generated = await this.aiService.analyzePropertyDescription(apartmentData);

    return await this.prisma.aiReview.create({
      data:{
        rating: generated.rating,
        priceFairness: generated.priceFairness,
        pros: generated.pros,
        consAndRisks: generated.consAndRisks,
        questionsForLandlord: generated.questionsForLandlord,
        summary: generated.summary,
        apartmentId: id,
      },
    });
    
  }
}