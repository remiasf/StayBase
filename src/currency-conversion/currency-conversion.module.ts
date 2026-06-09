import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { CurrencyConversion } from './currency-conversion.service';

@Module({
  imports: [HttpModule],
  providers: [CurrencyConversion],
  exports: [CurrencyConversion],
})
export class CurrencyConversionModule {}