import { Body, Controller, Get, Post, Res } from '@nestjs/common';
import { Response } from 'express';
import { register } from 'node:module';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { join } from 'node:path';

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService){}
    @Get('register')
    showRegisterPage(@Res() res: Response) {
        return res.sendFile(join(__dirname, '..', '..', 'public', 'register.html'));
    }
    
    @Post('register')
    register(@Body() dto: RegisterDto) {
        return this.authService.register(dto);
    }

    @Post('login')
    login(@Body() dto: LoginDto) {
        return this.authService.login(dto);
    }
}

