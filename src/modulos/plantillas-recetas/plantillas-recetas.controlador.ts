import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../autenticacion/guardias/jwt-auth.guardia';
import { PlantillasRecetasServicio } from './plantillas-recetas.servicio';
import { CrearPlantillaRecetaDto } from './dto/crear-plantilla-receta.dto';
import { ActualizarPlantillaRecetaDto } from './dto/actualizar-plantilla-receta.dto';

@ApiTags('Plantillas de Recetas')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('plantillas-recetas')
export class PlantillasRecetasControlador {
  constructor(private readonly plantillas_servicio: PlantillasRecetasServicio) {}

  @Post()
  @ApiOperation({ summary: 'Crear nueva plantilla de receta' })
  crear(@Request() req, @Body() dto: CrearPlantillaRecetaDto) {
    return this.plantillas_servicio.crear(req.user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Obtener todas las plantillas de receta del usuario' })
  obtenerTodas(@Request() req) {
    return this.plantillas_servicio.obtenerTodas(req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener plantilla de receta por ID' })
  obtenerPorId(@Request() req, @Param('id') id: string) {
    return this.plantillas_servicio.obtenerPorId(req.user.id, +id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar plantilla de receta' })
  actualizar(@Request() req, @Param('id') id: string, @Body() dto: ActualizarPlantillaRecetaDto) {
    return this.plantillas_servicio.actualizar(req.user.id, +id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar plantilla de receta' })
  eliminar(@Request() req, @Param('id') id: string) {
    return this.plantillas_servicio.eliminar(req.user.id, +id);
  }
}
