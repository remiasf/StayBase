import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsPositive, MinLength, MaxLength, IsNumber, Min, Max, IsOptional, IsNotEmpty, } from "class-validator";

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

    @ApiProperty({
        maxLength: 400,
        example: 'Cozy apartment in the center of Kyiv!'
    })
    @IsNotEmpty()
    @IsString()
    @MaxLength(400)    
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

    @ApiPropertyOptional({
        description: 'Appy a discount price to apartment',
        minimum: 100,
        maximum: 1000000,
        example: 1200  
    })
    @IsOptional()
    @IsNumber()
    @IsPositive()
    @Min(100)
    @Max(1000000)
    discountPrice?: number;

    @ApiProperty({
        description: 'Daily apartment rent fee',
        minimum: 100,
        maximum: 1000000,
        example: 1350
    })
    @IsNumber()
    @IsPositive()
    @Min(100)
    @Max(1000000)
    price!: number;

    @ApiProperty({
        description: 'Square meter size of the flat',
        example: 25
    })
    @IsNumber()
    @IsPositive()
    size!: number

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
