import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, IsUUID } from "class-validator";

export class CreatePaymentDto{
    @ApiProperty({
        description: 'Unique booking id',
        example: "string"
    })
    @IsNotEmpty()
    @IsString()
    bookingId: string;
}