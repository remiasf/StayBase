import { ApiProperty } from "@nestjs/swagger";
import { Booking, BookingStatus } from "@prisma/client";
import { Type } from "class-transformer";
import { IsDate, IsNotEmpty, IsNumber, IsPositive, IsString } from "class-validator";

export class CreateBookingDto {
    @ApiProperty({ 
        description: 'Apartment ID'
    })
    @IsNotEmpty()
    @IsString()
    apartmentId!: string

    @ApiProperty({ 
        example: '2026-04-30T14:00:00.000Z', 
        description: 'Check-in date' 
    })
    @IsNotEmpty()
    @Type(()=> Date)
    @IsDate()
    startDate!: Date
    
    @ApiProperty({ 
        example: '2026-05-10T14:00:00.000Z', 
        description: 'Check-out date' 
    })
    @IsNotEmpty()
    @Type(()=> Date)
    @IsDate()
    endDate!: Date
}
