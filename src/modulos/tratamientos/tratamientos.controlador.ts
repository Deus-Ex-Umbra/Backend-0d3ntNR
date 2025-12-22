import { Controller, Get, Post, Body, Param, Put, Delete, UseGuards, Req } from '@nestjs/common';
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
  constructor(private readonly tratamientos_servicio: TratamientosServicio) { }

  @Post()
  crear(@Body() crear_tratamiento_dto: CrearTratamientoDto, @Req() req: any) {
    return this.tratamientos_servicio.crear(req.user.id, crear_tratamiento_dto);
  }

  @Get()
  encontrarTodos(@Req() req: any) {
    return this.tratamientos_servicio.encontrarTodos(req.user.id);
  }

  @Get(':id')
  encontrarUno(@Param('id') id: string, @Req() req: any) {
    return this.tratamientos_servicio.encontrarPorId(req.user.id, +id);
  }

  @Get(':id/materiales')
  obtenerMaterialesPlantilla(@Param('id') id: string, @Req() req: any) {
    return this.tratamientos_servicio.obtenerMaterialesPlantilla(req.user.id, +id);
  }

  @Get(':id/consumibles-generales')
  obtenerConsumiblesGenerales(@Param('id') id: string, @Req() req: any) {
    return this.tratamientos_servicio.obtenerConsumiblesGenerales(req.user.id, +id);
  }

  @Get(':id/recursos-por-cita')
  obtenerRecursosPorCita(@Param('id') id: string, @Req() req: any) {
    return this.tratamientos_servicio.obtenerRecursosPorCita(req.user.id, +id);
  }

  @Put(':id')
  actualizar(@Param('id') id: string, @Body() actualizar_tratamiento_dto: ActualizarTratamientoDto, @Req() req: any) {
    return this.tratamientos_servicio.actualizar(req.user.id, +id, actualizar_tratamiento_dto);
  }

  @Delete(':id')
  eliminar(@Param('id') id: string, @Req() req: any) {
    return this.tratamientos_servicio.eliminar(req.user.id, +id);
  }
}