import { Module } from '@nestjs/common';
import { ApartmentsService } from './apartments.service';
import { ApartmentsController } from './apartments.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { AuthModule } from 'src/auth/auth.module';
import { MapboxService } from 'src/mapbox/mapbox.service';
import { MapboxModule } from 'src/mapbox/mapbox.module';
import { HttpModule } from '@nestjs/axios';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { AiService } from 'src/ai/ai.service';
import { CurrencyConversion } from 'src/currency-conversion/currency-conversion.service';

@Module({
  imports: [AuthModule, MapboxModule, HttpModule],
  controllers: [ApartmentsController],
  providers: [ApartmentsService, PrismaService, MapboxService, CloudinaryService, AiService, CurrencyConversion],
})
export class ApartmentsModule {}
