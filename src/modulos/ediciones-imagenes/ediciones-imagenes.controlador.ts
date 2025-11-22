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
  constructor(private readonly ediciones_servicio: EdicionesImagenesServicio) { }

  @Post()
  @ApiOperation({ summary: 'Crear nueva edición/versión de imagen' })
  crear(@Request() req, @Body() dto: CrearEdicionDto) {
    return this.ediciones_servicio.crear(req.user.id, dto);
  }

  @Get('archivo/:archivo_id')
  @ApiOperation({ summary: 'Obtener todas las ediciones de un archivo' })
  obtenerPorArchivo(@Request() req, @Param('archivo_id') archivo_id: string) {
    return this.ediciones_servicio.obtenerPorArchivo(req.user.id, +archivo_id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener edición por ID' })
  obtenerPorId(@Request() req, @Param('id') id: string) {
    return this.ediciones_servicio.obtenerPorId(req.user.id, +id);
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

  @Post(':edicion_id/comentarios')
  @ApiOperation({ summary: 'Crear comentario en edición de imagen' })
  crearComentario(@Param('edicion_id') edicion_id: string, @Request() req, @Body() dto: any) {
    return this.ediciones_servicio.crearComentario(req.user.id, +edicion_id, dto);
  }

  @Get(':edicion_id/comentarios')
  @ApiOperation({ summary: 'Obtener comentarios de una edición' })
  obtenerComentarios(@Param('edicion_id') edicion_id: string, @Request() req) {
    return this.ediciones_servicio.obtenerComentariosPorEdicion(req.user.id, +edicion_id);
  }

  @Get('comentarios/:comentario_id')
  @ApiOperation({ summary: 'Obtener comentario por ID' })
  obtenerComentario(@Param('comentario_id') comentario_id: string, @Request() req) {
    return this.ediciones_servicio.obtenerComentarioPorId(req.user.id, +comentario_id);
  }

  @Put('comentarios/:comentario_id')
  @ApiOperation({ summary: 'Actualizar comentario' })
  actualizarComentario(@Param('comentario_id') comentario_id: string, @Request() req, @Body() dto: any) {
    return this.ediciones_servicio.actualizarComentario(req.user.id, +comentario_id, dto);
  }

  @Delete('comentarios/:comentario_id')
  @ApiOperation({ summary: 'Eliminar comentario' })
  eliminarComentario(@Param('comentario_id') comentario_id: string, @Request() req) {
    return this.ediciones_servicio.eliminarComentario(req.user.id, +comentario_id);
  }
}