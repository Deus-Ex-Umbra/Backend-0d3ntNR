import { Controller, Post, Body, Param, Get, UseGuards, Request } from '@nestjs/common';
import { OdontogramaServicio } from './odontograma.servicio';
import { CrearOdontogramaDto } from './dto/crear-odontograma.dto';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../autenticacion/guardias/jwt-auth.guardia';

@ApiTags('Odontograma')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('pacientes/:paciente_id/odontograma')
export class OdontogramaControlador {
  constructor(private readonly odontograma_servicio: OdontogramaServicio) {}

  @Post()
  crear(@Request() req, @Param('paciente_id') paciente_id: string, @Body() crear_odontograma_dto: CrearOdontogramaDto) {
    return this.odontograma_servicio.crear(req.user.id, +paciente_id, crear_odontograma_dto);
  }

  @Get()
  obtenerHistorial(@Request() req, @Param('paciente_id') paciente_id: string) {
    return this.odontograma_servicio.obtenerHistorialPorPaciente(req.user.id, +paciente_id);
  }

  @Get('ultimo')
  obtenerUltimo(@Request() req, @Param('paciente_id') paciente_id: string) {
    return this.odontograma_servicio.obtenerUltimoPorPaciente(req.user.id, +paciente_id);
  }
}