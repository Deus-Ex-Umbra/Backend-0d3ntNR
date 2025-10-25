import { Controller, Get } from '@nestjs/common';
import { AppServicio } from './app.servicio';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('App')
@Controller()
export class AppControlador {
  constructor(private readonly app_servicio: AppServicio) {}

  @Get()
  getHello(): string {
    return this.app_servicio.getHello();
  }
}