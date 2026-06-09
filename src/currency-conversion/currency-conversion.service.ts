import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';

@Injectable()
export class CurrencyConversion {
  private readonly logger = new Logger(CurrencyConversion.name);

  async convertToUsd(amount: number, fromCurrency: string): Promise<{amountInUsd:number, currencyCode:string}> {
    const currency = fromCurrency.toUpperCase();
    if (currency === 'USD') return {amountInUsd: amount , currencyCode: currency};

    try {
      const response = await fetch(`https://v6.exchangerate-api.com/v6/${process.env.EXCHANGERATE_API_KEY}/pair/${currency}/USD/${amount}`);
      
      if (!response.ok) {
        throw new InternalServerErrorException('currency API is down');
      }

      const data = await response.json();
      
      const amountInUsd = data.conversion_result; 
      const currencyCode = data.base_code;
      
      return {amountInUsd: amountInUsd, currencyCode: currencyCode};

    } catch (error) {
      this.logger.error(`Error converting currency: ${(error as Error).message}`);
      throw new InternalServerErrorException(`Failed to convert ${currency} to USD`);
    }
  }
}