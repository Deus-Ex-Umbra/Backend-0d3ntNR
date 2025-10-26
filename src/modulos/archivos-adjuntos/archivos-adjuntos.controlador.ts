import { Controller, Post, Body, Get, Param, Put, Delete, UseGuards, Request } from '@nestjs/common';
import { ArchivosAdjuntosServicio } from './archivos-adjuntos.servicio';
import { SubirArchivoDto } from './dto/subir-archivo.dto';
import { ActualizarArchivoDto } from './dto/actualizar-archivo.dto';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../autenticacion/guardias/jwt-auth.guardia';

@ApiTags('Archivos Adjuntos')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('archivos-adjuntos')
export class ArchivosAdjuntosControlador {
  constructor(private readonly archivos_servicio: ArchivosAdjuntosServicio) {}

  @Post()
  @ApiOperation({ summary: 'Subir un nuevo archivo adjunto' })
  subir(@Request() req, @Body() dto: SubirArchivoDto) {
    return this.archivos_servicio.subir(req.user.id, dto);
  }

  @Get('paciente/:id')
  @ApiOperation({ summary: 'Obtener archivos por ID de paciente' })
  obtenerPorPaciente(@Request() req, @Param('id') id: string) {
    return this.archivos_servicio.obtenerPorPaciente(req.user.id, +id);
  }

  @Get('plan-tratamiento/:id')
  @ApiOperation({ summary: 'Obtener archivos por ID de plan de tratamiento' })
  obtenerPorPlan(@Request() req, @Param('id') id: string) {
    return this.archivos_servicio.obtenerPorPlan(req.user.id, +id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar metadatos de un archivo' })
  actualizar(@Request() req, @Param('id') id: string, @Body() dto: ActualizarArchivoDto) {
    return this.archivos_servicio.actualizar(req.user.id, +id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar un archivo adjunto' })
  eliminar(@Request() req, @Param('id') id: string) {
    return this.archivos_servicio.eliminar(req.user.id, +id);
  }
}