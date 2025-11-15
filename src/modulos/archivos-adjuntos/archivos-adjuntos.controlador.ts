import { Controller, Post, Body, Get, Param, Put, Delete, UseGuards, Request } from '@nestjs/common';
import { ArchivosAdjuntosServicio } from './archivos-adjuntos.servicio';
import { SubirArchivoDto } from './dto/subir-archivo.dto';
import { ActualizarArchivoDto } from './dto/actualizar-archivo.dto';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../autenticacion/guardias/jwt-auth.guardia';
import { ConfigService } from '@nestjs/config';

@ApiTags('Archivos Adjuntos')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('archivos-adjuntos')
export class ArchivosAdjuntosControlador {
  constructor(
    private readonly archivos_servicio: ArchivosAdjuntosServicio,
    private readonly config_servicio: ConfigService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Subir un nuevo archivo adjunto' })
  async subir(@Request() req, @Body() dto: SubirArchivoDto) {
    const archivo = await this.archivos_servicio.subir(req.user.id, dto);
    const base_url = this.config_servicio.get<string>('BASE_URL', 'http://localhost:3000');
    return {
      ...archivo,
      url: `${base_url}/docs-0d3nt/archivos-adjuntos/${archivo.ruta_archivo}`,
    };
  }

  @Get('paciente/:id')
  @ApiOperation({ summary: 'Obtener archivos por ID de paciente' })
  async obtenerPorPaciente(@Request() req, @Param('id') id: string) {
    const archivos = await this.archivos_servicio.obtenerPorPaciente(req.user.id, +id);
    const base_url = this.config_servicio.get<string>('BASE_URL', 'http://localhost:3000');
    return archivos.map(archivo => ({
      ...archivo,
      url: `${base_url}/docs-0d3nt/archivos-adjuntos/${archivo.ruta_archivo}`,
    }));
  }

  @Get('plan-tratamiento/:id')
  @ApiOperation({ summary: 'Obtener archivos por ID de plan de tratamiento' })
  async obtenerPorPlan(@Request() req, @Param('id') id: string) {
    const archivos = await this.archivos_servicio.obtenerPorPlan(req.user.id, +id);
    const base_url = this.config_servicio.get<string>('BASE_URL', 'http://localhost:3000');
    return archivos.map(archivo => ({
      ...archivo,
      url: `${base_url}/docs-0d3nt/archivos-adjuntos/${archivo.ruta_archivo}`,
    }));
  }

  @Get(':id/contenido')
  @ApiOperation({ summary: 'Obtener contenido de un archivo en Base64' })
  obtenerContenido(@Request() req, @Param('id') id: string) {
    return this.archivos_servicio.obtenerContenido(req.user.id, +id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar metadatos de un archivo' })
  async actualizar(@Request() req, @Param('id') id: string, @Body() dto: ActualizarArchivoDto) {
    const archivo = await this.archivos_servicio.actualizar(req.user.id, +id, dto);
    const base_url = this.config_servicio.get<string>('BASE_URL', 'http://localhost:3000');
    return {
      ...archivo,
      url: `${base_url}/docs-0d3nt/archivos-adjuntos/${archivo.ruta_archivo}`,
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar un archivo adjunto' })
  eliminar(@Request() req, @Param('id') id: string) {
    return this.archivos_servicio.eliminar(req.user.id, +id);
  }
}