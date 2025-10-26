import { Controller, Get, Post, Body, Put, Param, Delete, Query, UseGuards, Request } from '@nestjs/common';
import { AgendaServicio } from './agenda.servicio';
import { CrearCitaDto } from './dto/crear-cita.dto';
import { ActualizarCitaDto } from './dto/actualizar-cita.dto';
import { ApiTags, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../autenticacion/guardias/jwt-auth.guardia';

@ApiTags('Agenda')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('agenda')
export class AgendaControlador {
  constructor(private readonly agenda_servicio: AgendaServicio) {}

  @Post()
  crear(@Request() req, @Body() crear_cita_dto: CrearCitaDto) {
    return this.agenda_servicio.crear(req.user.id, crear_cita_dto);
  }

  @Get()
  @ApiQuery({ name: 'mes', required: true, type: Number, description: 'Mes a consultar (1-12)' })
  @ApiQuery({ name: 'ano', required: true, type: Number, description: 'Año a consultar' })
  obtenerCitasPorMes(@Request() req, @Query('mes') mes: string, @Query('ano') ano: string) {
    return this.agenda_servicio.obtenerCitasPorMes(req.user.id, +mes, +ano);
  }

  @Get('sin-pagar')
  obtenerCitasSinPagar(@Request() req) {
    return this.agenda_servicio.obtenerCitasSinPagar(req.user.id);
  }

  @Get('sin-pago')
  obtenerCitasSinPago(@Request() req) {
    return this.agenda_servicio.obtenerCitasSinPago(req.user.id);
  }

  @Put(':id')
  actualizar(@Request() req, @Param('id') id: string, @Body() actualizar_cita_dto: ActualizarCitaDto) {
    return this.agenda_servicio.actualizar(req.user.id, +id, actualizar_cita_dto);
  }

  @Delete(':id')
  eliminar(@Request() req, @Param('id') id: string) {
    return this.agenda_servicio.eliminar(req.user.id, +id);
  }
}