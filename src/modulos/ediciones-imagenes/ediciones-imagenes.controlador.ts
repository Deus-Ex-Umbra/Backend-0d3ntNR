import { Controller, Post, Get, Put, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { EdicionesImagenesServicio } from './ediciones-imagenes.servicio';
import { CrearEdicionDto } from './dto/crear-edicion.dto';
import { ActualizarEdicionDto } from './dto/actualizar-edicion.dto';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../autenticacion/guardias/jwt-auth.guardia';
import { AlmacenamientoServicio, TipoDocumento } from '../almacenamiento/almacenamiento.servicio';

@ApiTags('Ediciones de Imágenes')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('ediciones-imagenes')
export class EdicionesImagenesControlador {
  constructor(
    private readonly ediciones_servicio: EdicionesImagenesServicio,
    private readonly almacenamiento_servicio: AlmacenamientoServicio,
  ) { }

  @Post()
  @ApiOperation({ summary: 'Crear nueva edición/versión de imagen' })
  async crear(@Request() req, @Body() dto: CrearEdicionDto) {
    const edicion = await this.ediciones_servicio.crear(req.user.id, dto);
    const url = await this.almacenamiento_servicio.obtenerUrlAcceso(edicion.ruta_imagen_resultado, TipoDocumento.EDICION_IMAGEN);
    return { ...edicion, url };
  }

  @Get('archivo/:archivo_id')
  @ApiOperation({ summary: 'Obtener todas las ediciones de un archivo' })
  async obtenerPorArchivo(@Request() req, @Param('archivo_id') archivo_id: string) {
    const ediciones = await this.ediciones_servicio.obtenerPorArchivo(req.user.id, +archivo_id);
    return Promise.all(ediciones.map(async e => ({
       ...e,
       url: await this.almacenamiento_servicio.obtenerUrlAcceso(e.ruta_imagen_resultado, TipoDocumento.EDICION_IMAGEN)
    })));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener edición por ID' })
  async obtenerPorId(@Request() req, @Param('id') id: string) {
    const edicion = await this.ediciones_servicio.obtenerPorId(req.user.id, +id);
    const url = await this.almacenamiento_servicio.obtenerUrlAcceso(edicion.ruta_imagen_resultado, TipoDocumento.EDICION_IMAGEN);
    return { ...edicion, url };
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar edición' })
  async actualizar(@Param('id') id: string, @Request() req, @Body() dto: ActualizarEdicionDto) {
    const edicion = await this.ediciones_servicio.actualizar(+id, req.user.id, dto);
    const url = await this.almacenamiento_servicio.obtenerUrlAcceso(edicion.ruta_imagen_resultado, TipoDocumento.EDICION_IMAGEN);
    return { ...edicion, url };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar edición' })
  eliminar(@Param('id') id: string, @Request() req) {
    return this.ediciones_servicio.eliminar(+id, req.user.id);
  }

  @Post(':id/duplicar')
  @ApiOperation({ summary: 'Duplicar edición como nueva versión' })
  async duplicar(@Param('id') id: string, @Request() req) {
    const edicion = await this.ediciones_servicio.duplicar(+id, req.user.id);
    const url = await this.almacenamiento_servicio.obtenerUrlAcceso(edicion.ruta_imagen_resultado, TipoDocumento.EDICION_IMAGEN);
    return { ...edicion, url };
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