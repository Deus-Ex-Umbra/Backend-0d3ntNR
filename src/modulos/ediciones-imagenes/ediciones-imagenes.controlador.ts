import { Controller, Post, Get, Put, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { EdicionesImagenesServicio } from './ediciones-imagenes.servicio';
import { CrearEdicionDto } from './dto/crear-edicion.dto';
import { ActualizarEdicionDto } from './dto/actualizar-edicion.dto';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../autenticacion/guardias/jwt-auth.guardia';

@ApiTags('Ediciones de Imágenes')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('ediciones-imagenes')
export class EdicionesImagenesControlador {
  constructor(private readonly ediciones_servicio: EdicionesImagenesServicio) {}

  @Post()
  @ApiOperation({ summary: 'Crear nueva edición/versión de imagen' })
  crear(@Request() req, @Body() dto: CrearEdicionDto) {
    return this.ediciones_servicio.crear(req.user.id, dto);
  }

  @Get('archivo/:archivo_id')
  @ApiOperation({ summary: 'Obtener todas las ediciones de un archivo' })
  obtenerPorArchivo(@Param('archivo_id') archivo_id: string) {
    return this.ediciones_servicio.obtenerPorArchivo(+archivo_id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener edición por ID' })
  obtenerPorId(@Param('id') id: string) {
    return this.ediciones_servicio.obtenerPorId(+id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar edición' })
  actualizar(@Param('id') id: string, @Request() req, @Body() dto: ActualizarEdicionDto) {
    return this.ediciones_servicio.actualizar(+id, req.user.id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar edición' })
  eliminar(@Param('id') id: string, @Request() req) {
    return this.ediciones_servicio.eliminar(+id, req.user.id);
  }

  @Post(':id/duplicar')
  @ApiOperation({ summary: 'Duplicar edición como nueva versión' })
  duplicar(@Param('id') id: string, @Request() req) {
    return this.ediciones_servicio.duplicar(+id, req.user.id);
  }
}