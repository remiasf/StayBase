import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { UpdateInfoDto } from './dto/update-info.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { UpdateLoginDto } from './dto/update-login.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService){}

  async getMyProfile(userId: string) {

    const user = await this.prisma.user.findUnique({
      where: {
        id:userId
      },
      select: {
        name: true,
        email: true,
        role: true
      }
    });
    if(!user){
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: {
        id: id
      },
      select: {
        name: true,
        email: true,
        role: true
      }
    });
    if(!user){
      throw new NotFoundException('User not found');
    }

    return user;
  }   

  async updatePassword(id: string, dto: UpdatePasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: {
        id: id
      }
    });

    if(!user){
      throw new NotFoundException('User does not exist');
    }
    
    const isPasswordValid = await bcrypt.compare(dto.oldPassword, user.password)
    
    if(!isPasswordValid){
      throw new BadRequestException('Incorrect old password')
    }

    const hashedPassword = await bcrypt.hash(dto.newPassword, 10);

    await this.prisma.user.update({
      where:{
        id: id
      },
      data:{
        password: hashedPassword
      }
    });

    return {
      message: 'Your password updated successfully'
    }
  }

  async updateInfo(id: string, dto: UpdateInfoDto) {

    const user = await this.prisma.user.findUnique({
      where:{
        id: id
      }
    });
    
    if(!user){
      throw new NotFoundException('User not found');
    }

    await this.prisma.user.update({
      where: {
        id: id
      },
      data: dto
      
    });

    return {
      message: 'Your user data updated successfully'
    }
  }

  async updateLogin(id:string, dto: UpdateLoginDto){
    const userWithSameLogin = await this.prisma.user.findUnique({
      where: {
        login: dto.login
      }
    });

    if(userWithSameLogin && userWithSameLogin.id !== id){
      throw new ConflictException('This login is already taken by another user');
    }

    await this.prisma.user.update({
      where:{
        id: id
      },
      data:{
        login: dto.login
      }
    });

    return {
      message: 'Your login has been updated successfully'
    }
  }
  

  async remove(id: string) {
    const userExist = await this.prisma.user.findUnique({
      where: {
        id: id
      }
    });
    if(!userExist){
      throw new NotFoundException('User does not exist');
    }

    await this.prisma.user.delete({
      where: {
        id: id
      }
    });

    return {
      message: 'User deleted successfully'
    }
  }
}
