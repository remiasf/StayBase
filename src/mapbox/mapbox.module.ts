import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { MapboxService } from './mapbox.service';

@Module({
  imports: [HttpModule],
  providers: [MapboxService],
  exports: [MapboxService],
})
export class MapboxModule {}