import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsPositive, MinLength, MaxLength, IsNumber, Min, Max, IsOptional, IsNotEmpty, IsCurrency, Length, } from "class-validator";
import { Transform } from 'class-transformer';

export class CreateApartmentDto {

    @ApiProperty({
        minLength: 5,
        maxLength: 26,
        example: 'Cozy apartment'
    })
    @IsString()
    @MinLength(5)
    @MaxLength(26)
    title!: string;

    @Transform(({ value }) => value?.replace(/\r\n|\r|\n/g, '\\n'))
    @ApiProperty({
        maxLength: 1400,
        example: 'Cozy apartment in the center of Kyiv!'
    })
    @IsNotEmpty()
    @IsString()
    @MaxLength(1400)    
    description!: string;

    @ApiProperty({
        maxLength: 200,
        example: 'Kyiv, Boychuka 1234'
    })
    @IsNotEmpty()
    @IsString()
    @MaxLength(200)
    address!: string;

    @ApiProperty({
        minimum: 1,
        maximum: 30,
        example: 3
    })
    @IsNotEmpty()
    @IsNumber()
    @Min(1)
    @Max(30)
    maxGuests!: number;

    @ApiProperty({
        description: 'Daily apartment rent fee',
        minimum: 100,
        maximum: 1000000,
        example: 1350
    })
    @IsNumber()
    @IsPositive()
    @Min(1)
    @Max(10000000)
    price!: number;

    @ApiProperty({
        description: 'Percent of discount',
        minimum: 0,
        maximum: 50,
        example: 15
    })
    @IsNumber()
    @IsPositive()
    @Min(0)
    @Max(50)
    discountPercent!: number;

    @ApiProperty({
        description: 'Currency code: e.g., USD, UAH, EUR',
        maxLength: 3,
        minLength: 3,
        example: 'UAH'
    })
    @IsNotEmpty()
    @IsString()
    @Length(3)
    currency!: string;

    @ApiProperty({
        description: 'Square meter size of the flat',
        example: 25
    })
    @IsNumber()
    @IsPositive()
    size!: number;

    @ApiProperty({
        description: 'The number of rooms quantity',
        example: 1
    })
    @IsNumber()
    @IsPositive()
    @Min(1)
    @Max(12)
    rooms!: number;


}
