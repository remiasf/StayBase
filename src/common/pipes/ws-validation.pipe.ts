import { ValidationPipe } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';

export class WsValidationPipe extends ValidationPipe {
  constructor() {
    super({
      whitelist: true,
      transform: true,
      exceptionFactory: (errors) => {
        const details = errors
          .flatMap((error) => Object.values(error.constraints ?? {}))
          .join('; ');

        return new WsException(details || 'Invalid payload');
      },
    });
  }
}
