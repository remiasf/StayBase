import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsPositive, IsSemVer } from "class-validator";

export class CreatePaymentDto{
    @ApiProperty({
        description: 'Unique booking id',
        example: 1
    })
    @IsNotEmpty()
    @IsSemVer()
    @IsPositive()
    bookingId: string;
}