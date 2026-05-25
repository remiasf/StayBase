import { Test, TestingModule} from '@nestjs/testing'
import { ApartmentsService } from './apartments.service'
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { MapboxService } from '../mapbox/mapbox.service';
import { ConfigService } from '@nestjs/config';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { BadRequestException } from '@nestjs/common';

describe('ApartmentsService', () => {
    let service: ApartmentsService;

    const mockPrisma = { 
        apartment: { 
            create: jest.fn(),
            findMany: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            findUnique: jest.fn(),
            count: jest.fn()
        } 
    };
    const mockJwt = { sign: jest.fn() };
    const mockMapBox = { getCoordinates: jest.fn().mockResolvedValue({ lat: 50.4501, lng: 30.5234 }) };
    const mockConfig = { get: jest.fn().mockReturnValue('fake_secret') };
    const mockCloudinary = {uploadImage: jest.fn()};


    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ApartmentsService,
                { provide: PrismaService, useValue: mockPrisma },
                { provide: JwtService, useValue: mockJwt },
                { provide: MapboxService, useValue: mockMapBox },
                { provide: ConfigService, useValue: mockConfig },
                { provide: CloudinaryService, useValue: mockCloudinary}
            ],
        }).compile();

        service = module.get<ApartmentsService>(ApartmentsService);
        jest.clearAllMocks();        
    });

    it('Should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('findAll', () => {
        it('Should return apartments array', async () => {
            //Arrange
            const expectedApartments = [{ id:1, title: 'Test apartment', price: 500 }];
            mockPrisma.apartment.findMany.mockResolvedValue(expectedApartments);
            mockPrisma.apartment.count.mockResolvedValue(1);

            const mockFilterDto = {
                minPrice: 100,
                maxPrice: 500,
                minSize: 20,
                maxSize: 50,
                rooms: 2,
            };
            const pageNumber = 1;

            const result = await service.findAll(mockFilterDto, 1);

            //Act
            expect(result).toEqual({
                data: expectedApartments,
                meta: {
                    page: 1,
                    total: 1,
                    lastPage: 1,
                }
            });

            //Assert
            expect(mockPrisma.apartment.findMany).toHaveBeenCalledTimes(1);
        });

        it('Should return an empty array and total = 0, if apartments not found', async () => {
            //Arrange
            mockPrisma.apartment.findMany.mockResolvedValue([]);
            mockPrisma.apartment.count.mockResolvedValue(0);

            const mockFilterDto = {
                minPrice: 300,
                maxPrice: 500,
                minSize: 120,
                maxSize: 150,
                rooms: 15,
            };
            const pageNumber = 1;
        
            const result = await service.findAll(mockFilterDto, pageNumber);

            //Act
            expect(result).toEqual({
                data: [],
                meta: {
                    page: 1,
                    total: 0,
                    lastPage: 0,
                }
            });

            //Assert
            expect(mockPrisma.apartment.findMany).toHaveBeenCalledTimes(1);
        });

        it('Should correctly return filter and pagination in Prisma', async () => {
            mockPrisma.apartment.findMany.mockResolvedValue([]);
            mockPrisma.apartment.count.mockResolvedValue(0);

            const mockFilterDto = { rooms: 2, minPrice: 400};
            const pageNumber = 2;

            await service.findAll(mockFilterDto, pageNumber);

            expect(mockPrisma.apartment.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.any(Object),
                    skip: expect.any(Number),
                    take: expect.any(Number),
                })
            );
        });

        it('Returns error if DB is not available', async () => {
            const errorMessage = 'Database connection failed';
            mockPrisma.apartment.findMany.mockRejectedValue(new Error(errorMessage));

            await expect(service.findAll({}, 1)).rejects.toThrow(errorMessage);
        });
    });

    

    describe('create', () => {
        it('Should create new apartment listing', async () => {
            const createDto = {
                title: "Cozy apartment",
                description: "Cozy apartment in the center of Kyiv!",
                address: "Kyiv, Boychuka 1234",
                maxGuests: 3,
                discountPrice: 1200,
                price: 1350,
                size: 25,
                rooms: 1
            };
            
            const mockLocationData = {
                address: "Kyiv, Boychuka 1234",
                city: "Kyiv",
                latitude: 50.4501,
                longitude: 30.5234,
            };

            mockMapBox.getCoordinates.mockResolvedValue(mockLocationData);

            const expectedApartment = {
                id: '1',
                ...createDto,
                ...mockLocationData,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            mockPrisma.apartment.create.mockResolvedValue(expectedApartment);
            
            const result = await service.create('1', createDto);

            expect(result).toEqual(expectedApartment);

            expect(mockPrisma.apartment.create).toHaveBeenCalledTimes(1);
            expect(mockPrisma.apartment.create).toHaveBeenCalledWith({
                data: {
                    ...createDto,
                    discountPrice: 1350,
                    ...mockLocationData,
                    userId: '1'
                }
            });

            
        });

        it('Should throw an error if database fails', async () => {
            const createDto = {
                title: "Cozy apartment",
                description: "Cozy apartment in the center of Kyiv!",
                address: "Kyiv, Boychuka 12",
                maxGuests: 3,
                discountPrice: 1200,
                price: 1350,
                size: 25,
                rooms: 1
            }
            mockPrisma.apartment.create.mockRejectedValue(new Error('DB Error'));
            await expect(service.create('1', createDto)).rejects.toThrow('DB Error');
        });

        it('Should throw an error if third-party API MapBox is down', async () => {
            const createDto = {
                title: "Cozy apartment",
                description: "Cozy apartment in the center of Kyiv!",
                address: "Some invalid address",
                maxGuests: 3,
                discountPrice: 1200,
                price: 1350,
                size: 25,
                rooms: 1
            }

            mockMapBox.getCoordinates.mockResolvedValue(null);
            await expect(service.create('1', createDto)).rejects.toThrow(BadRequestException);
            await expect(service.create('1', createDto)).rejects.toThrow(
                'Invalid address provided. Please check the address and try again.'
            );
        });
    });

    describe('remove', () => {
        it('Should successfully delete an apartment', async () => {
            const existingApartment = {
                id: "1",
                title: "Cozy apartment",
                description: "Cozy apartment in the center of Kyiv!",
                address: "Kyiv, Boychuka 1234",
                maxGuests: 3,
                discountPrice: 1200,
                price: 1350,
                size: 25,
                rooms: 1
            };

            mockPrisma.apartment.findUnique.mockResolvedValue(existingApartment);
            mockPrisma.apartment.delete.mockResolvedValue(existingApartment);
            const result = await service.remove('1');

            expect(result).toEqual(existingApartment);
            expect(mockPrisma.apartment.delete).toHaveBeenCalledTimes(1);

            expect(mockPrisma.apartment.delete).toHaveBeenCalledWith({
                where:{
                    id: "1"
                }
            });
        });
    });

    describe(':id/images', () => {
        it('Should load the images to the DB', async () =>{
            const existingApartment = {
                id: '1',
                userId: '1', 
                images: [],
            };
            mockPrisma.apartment.findUnique.mockResolvedValue(existingApartment);

            const mockFiles = [
                { originalname: 'test-1.jpg', buffer: Buffer.from('fake-image-1') } as Express.Multer.File,
                { originalname: 'test-2.jpg', buffer: Buffer.from('fake-image-2') } as Express.Multer.File,
            ];

            const expectedImageLinks = [
                "https://res.cloudinary.com/dj5hlim8w/image/upload/v1/test-1.jpg",
                "https://res.cloudinary.com/dj5hlim8w/image/upload/v1/test-2.jpg"
            ];
            
            mockCloudinary.uploadImage
                .mockResolvedValueOnce({ secure_url: expectedImageLinks[0] })
                .mockResolvedValueOnce({ secure_url: expectedImageLinks[1] });

            const updateApartment = {
                ...existingApartment,
                images: expectedImageLinks,
            };

            mockPrisma.apartment.update.mockResolvedValue(updateApartment);

            const result = await service.uploadImages('1', mockFiles);

            expect(result).toEqual(updateApartment);

            expect(mockCloudinary.uploadImage).toHaveBeenCalledTimes(2);

            expect(mockPrisma.apartment.findUnique).toHaveBeenCalledTimes(1)
            expect(mockPrisma.apartment.update).toHaveBeenCalledTimes(1);
            expect(mockPrisma.apartment.update).toHaveBeenCalledWith({
                where: { id: '1' },
                data: { 
                    images: { push: expectedImageLinks }
                }
            });
        });
    });
});
