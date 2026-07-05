import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { isAxiosError } from 'axios';


@Injectable()
export class MapboxService {
  private readonly logger = new Logger(MapboxService.name);
  private readonly token = process.env.MAPBOX_API_KEY;

  constructor(private readonly httpService: HttpService) {}

  async getCoordinates(address: string): Promise<{ latitude: number; longitude: number; city: string; address: string } | null> {
    try {
      const url = `https://api.mapbox.com/search/geocode/v6/forward?q=${encodeURIComponent(address)}&access_token=${this.token}`;
      const response = await firstValueFrom(this.httpService.get(url));
      
      const features = response.data.features;
      if (!features || features.length === 0) {
        this.logger.warn(`Address not found: ${address}`);
        return null;
      }

      const {latitude, longitude} = features[0].properties.coordinates;
      const context = features[0].properties.context;
      const city = context?.place?.name || context?.region?.name || context?.country?.name || 'Unknown Location';
      const fullAddress = features[0].properties.full_address || features[0].properties.place_formatted || address;

      return { latitude, longitude, city, address: fullAddress };
      
    } catch (error: unknown) {
      if (isAxiosError(error)) {
        //Mapbox error: (401 or 400)
        const statusCode = error.response?.status;
        const apiMessage = error.response?.data?.message || error.message;
        this.logger.error(`Mapbox API Error [${statusCode}]: ${apiMessage}`);
      } else if (error instanceof Error) {

        this.logger.error(`Internal error: ${error.message}`);
      }
      return null;
    }
  }
}