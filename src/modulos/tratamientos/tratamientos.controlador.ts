import { Controller, Get, Post, Body, Param, Put, Delete, UseGuards } from '@nestjs/common';
import { TratamientosServicio } from './tratamientos.servicio';
import { CrearTratamientoDto } from './dto/crear-tratamiento.dto';
import { ActualizarTratamientoDto } from './dto/actualizar-tratamiento.dto';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../autenticacion/guardias/jwt-auth.guardia';

@ApiTags('Tratamientos (Plantillas)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tratamientos')
export class TratamientosControlador {
  constructor(private readonly tratamientos_servicio: TratamientosServicio) {}

  @Post()
  crear(@Body() crear_tratamiento_dto: CrearTratamientoDto) {
    return this.tratamientos_servicio.crear(crear_tratamiento_dto);
  }

  @Get()
  encontrarTodos() {
    return this.tratamientos_servicio.encontrarTodos();
  }

  @Get(':id')
  encontrarUno(@Param('id') id: string) {
    return this.tratamientos_servicio.encontrarPorId(+id);
  }

  @Put(':id')
  actualizar(@Param('id') id: string, @Body() actualizar_tratamiento_dto: ActualizarTratamientoDto) {
    return this.tratamientos_servicio.actualizar(+id, actualizar_tratamiento_dto);
  }

  @Delete(':id')
  eliminar(@Param('id') id: string) {
    return this.tratamientos_servicio.eliminar(+id);
  }
}