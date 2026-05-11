import { IsNumber, IsOptional, IsPositive, IsString, Max, MaxLength, Min } from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty } from "@nestjs/swagger";

export class FilterApartmentDto {
  
  @ApiProperty({ description: 'Minimum price per night', example: 100, required: false })
  @IsOptional()
  @IsPositive()
  @Min(100)
  @IsNumber()
  @Type(() => Number)
  minPrice?: number;

  @ApiProperty({ description: 'Maximum price per night', example: 1000000, required: false })
  @IsOptional()
  @IsPositive()
  @Max(1000000)
  @IsNumber()
  @Type(() => Number)
  maxPrice?: number;

  @ApiProperty({ description: 'Minimum living area in m²', example: 30, required: false })
  @IsOptional()
  @IsPositive()
  @IsNumber()
  @Type(() => Number)
  minSize?: number;

  @ApiProperty({ description: 'Maximum living area in m²', example: 150, required: false })
  @IsOptional()
  @IsPositive()
  @IsNumber()
  @Type(() => Number)
  maxSize?: number;

  @ApiProperty({ 
    description: 'Number of rooms', 
    example: 2, 
    minimum: 1, 
    maximum: 20, 
    required: false 
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  @Max(20)
  rooms?: number;

  @ApiProperty({ 
    description: 'Target address to search around', 
    example: 'Kyiv, Khreshchatyk 1', 
    required: false 
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  address?: string;

  @ApiProperty({ 
    description: 'Search radius from the specified address (in kilometers)', 
    example: 5, 
    required: false 
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Max(20)
  radius?: number;

  @ApiProperty({ description: 'Page number for pagination', example: '1', required: false })
  @IsString()
  @IsOptional()
  page?: string;
}