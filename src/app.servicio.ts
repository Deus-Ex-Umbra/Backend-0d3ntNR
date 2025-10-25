import { Injectable } from '@nestjs/common';

@Injectable()
export class AppServicio {
  getHello(): string {
    return 'API para Odontología funcionando!';
  }
}