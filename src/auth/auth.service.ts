import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { JwtPayload } from 'src/common/auth/jwt-user';

@Injectable()
export class AuthService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly jwtService: JwtService
    ){}

    async register(dto: RegisterDto){
        const existingUser = await this.prisma.user.findFirst({
            where: {
                OR: [
                    {login: dto.login},
                    {email: dto.email}
                ]
            }
        })
        
        const finalRole = dto.role || 'USER';

        if(existingUser) {
            throw new ConflictException('User with the same login or email already exists');
        }
        const hashedPassword = await bcrypt.hash(dto.password, 10)
        const newUser = await this.prisma.user.create({
            data: {
                name: dto.name,
                login: dto.login,
                email: dto.email,
                bio: dto.bio,
                avatarUrl: dto.avatarUrl,
                password: hashedPassword,
                role: finalRole
            }
        });

        const payload: JwtPayload = {
            sub: newUser.id,
            login: newUser.login,
            role: newUser.role
        };
        
        return {
            access_token: await this.jwtService.signAsync(payload)
        };
    }

    async login(dto: LoginDto){
        const existingUser = await this.prisma.user.findUnique({
            where: {login: dto.login}
        });
        if(!existingUser) {
            throw new UnauthorizedException('Invalid user data');
        }
        const correctPassword = await bcrypt.compare(dto.password, existingUser.password);

        if(!correctPassword) {
            throw new UnauthorizedException('Invalid user data');
        }

        const payload: JwtPayload = {
            sub: existingUser.id,
            login: existingUser.login,
            role: existingUser.role
        }
        return {
            access_token: await this.jwtService.signAsync(payload)
        }
    }
}
