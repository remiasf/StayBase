import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsAlphanumeric, IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, IsUrl, MaxLength, MinLength } from 'class-validator';

export enum RegistrationRole {
  USER = 'USER',
  LANDLORD = 'LANDLORD'
}

export class RegisterDto {
    @ApiProperty({
        minimum: 3,
        maximum: 40,
        example: 'John Doe'
    })
    @IsString()
    @IsNotEmpty()
    @MinLength(3, {message: 'Your name should include at least 3 characters'})
    @MaxLength(40, {message: 'Your name is too long'})
    name: string;

    @ApiProperty({
        minimum: 3,
        maximum: 20,
        example: 'user123'
    })
    @IsString()
    @IsNotEmpty()
    @MinLength(3, {message: 'Your login can`t be shorter than 3 characters'})
    @MaxLength(20, {message: 'Your login is too long'})
    @IsAlphanumeric()
    login: string;

    @ApiProperty({
        description: 'Unique, valid email',
        example: 'user123@gmail.com'
    })
    @IsNotEmpty()
    @IsEmail()
    email: string;

    @ApiProperty({
        minimum: 20,
        maximum: 200,
        example: 'Lorem ipsum dolor sit amet'
    })
    @IsString()
    @IsOptional()
    @MaxLength(200, {message: 'Bio can`t be more than 200 characters'})
    bio?: string;

    @ApiPropertyOptional({
        example: 'https://i.imgur.com/e0ydW0Y.jpeg'
    })
    @IsString()
    @IsOptional()
    @IsUrl()
    avatarUrl?: string

    @ApiProperty({
        minimum: 6,
        maximum: 28,
        example: '12345678'
    })
    @IsString()
    @MinLength(6, {message: 'Your password can`t be shorter than 6 characters'})
    @MaxLength(28, {message: 'Your password is too long'})
    password: string;

    @ApiPropertyOptional({
        description: 'Users role in system. By default: USER role',
        enum: RegistrationRole,
        example: RegistrationRole.LANDLORD
    })
    @IsOptional()
    @IsEnum(RegistrationRole, {message: 'You only can choose USER or LANDLORD role'})
    role?: RegistrationRole;
}