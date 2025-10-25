import { Controller, Get, Post, Body, Put, Param, Delete, Query, UseGuards } from '@nestjs/common';
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
  crear(@Body() crear_cita_dto: CrearCitaDto) {
    return this.agenda_servicio.crear(crear_cita_dto);
  }

  @Get()
  @ApiQuery({ name: 'mes', required: true, type: Number, description: 'Mes a consultar (1-12)' })
  @ApiQuery({ name: 'ano', required: true, type: Number, description: 'Año a consultar' })
  obtenerCitasPorMes(@Query('mes') mes: string, @Query('ano') ano: string) {
    return this.agenda_servicio.obtenerCitasPorMes(+mes, +ano);
  }

  @Get('sin-pagar')
  obtenerCitasSinPagar() {
    return this.agenda_servicio.obtenerCitasSinPagar();
  }

  @Get('sin-pago')
  obtenerCitasSinPago() {
    return this.agenda_servicio.obtenerCitasSinPago();
  }

  @Put(':id')
  actualizar(@Param('id') id: string, @Body() actualizar_cita_dto: ActualizarCitaDto) {
    return this.agenda_servicio.actualizar(+id, actualizar_cita_dto);
  }

  @Delete(':id')
  eliminar(@Param('id') id: string) {
    return this.agenda_servicio.eliminar(+id);
  }
}