import { Controller, Get, UseGuards } from '@nestjs/common';
import { EstadisticasServicio } from './estadisticas.servicio';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../autenticacion/guardias/jwt-auth.guardia';

@ApiTags('Estadísticas')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('estadisticas')
export class EstadisticasControlador {
  constructor(private readonly estadisticas_servicio: EstadisticasServicio) {}

  @Get('dashboard')
  obtenerEstadisticas() {
    return this.estadisticas_servicio.obtenerEstadisticasDashboard();
  }
}