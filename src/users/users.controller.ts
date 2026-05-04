import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { CurrentUserID } from 'src/common/decorators/currentUserID.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guards';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { UpdateInfoDto } from './dto/update-info.dto';
import { UpdateLoginDto } from './dto/update-login.dto';
import { ApiBearerAuth } from '@nestjs/swagger';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('me')
  getMyProfile(@CurrentUserID() userId: string) {
    return this.usersService.getMyProfile(userId);
  }

  @ApiBearerAuth()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Patch('me/password')
  updatePassword(@CurrentUserID() id: string, @Body() dto: UpdatePasswordDto) {
    return this.usersService.updatePassword(id, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Patch('me/info')
  updateInfo(@CurrentUserID() id: string, @Body() dto: UpdateInfoDto) {
    return this.usersService.updateInfo(id, dto);
  }
  
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)  
  @Delete('me')
  remove(@CurrentUserID() id: string) {
    return this.usersService.remove(id);
  }

  @ApiBearerAuth()
  @Patch('me/login')
  updateLogin(@CurrentUserID() id: string, @Body() dto: UpdateLoginDto) {
    return this.usersService.updateLogin(id, dto);
  }
}
