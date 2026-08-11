import { ApiPropertyOptional } from "@nestjs/swagger";
import { BookingStatus } from "@prisma/client";
import { IsEnum, IsOptional } from "class-validator";
import { PaginationDto } from "src/common/dto/pagination.dto";


export class FilterBookingDto extends PaginationDto {
    @ApiPropertyOptional({enum: BookingStatus, description: 'Booking status filter'})
    @IsOptional()
    @IsEnum(BookingStatus)
    status?: BookingStatus;
}
