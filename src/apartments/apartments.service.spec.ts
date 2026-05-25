import { Test, TestingModule} from '@nestjs/testing'
import { ApartmentsService } from './apartments.service'
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { MapboxService } from '../mapbox/mapbox.service';
import { ConfigService } from '@nestjs/config';

describe('ApartmentsService', () => {
    let service: ApartmentsService;

    const mockPrisma = { 
        apartment: { 
            create: jest.fn(),
            findMany: jest.fn(),
            count: jest.fn()
        } 
    };
    const mockJwt = { sign: jest.fn() };
    const mockMapBox = { getCoordinates: jest.fn().mockResolvedValue({ lat: 50.4501, lng: 30.5234 }) };
    const mockConfig = { get: jest.fn().mockReturnValue('fake_secret') };


    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ApartmentsService,
                { provide: PrismaService, useValue: mockPrisma },
                { provide: JwtService, useValue: mockJwt },
                { provide: MapboxService, useValue: mockMapBox },
                { provide: ConfigService, useValue: mockConfig }
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
    });

    it('Returns error if DB is not available', async () => {
        const errorMessage = 'Database connection failed';
        mockPrisma.apartment.findMany.mockRejectedValue(new Error(errorMessage));

        await expect(service.findAll({}, 1)).rejects.toThrow(errorMessage);
    })

    describe('create', () => {
        it('Should create new apartment listing', async () => {

        })
    })
});
