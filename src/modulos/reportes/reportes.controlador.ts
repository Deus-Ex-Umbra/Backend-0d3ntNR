import { Controller, Post, Get, Delete, Body, Param, UseGuards, Request, Res, StreamableFile } from '@nestjs/common';
import { ReportesServicio } from './reportes.servicio';
import { GenerarReporteDto } from './dto/generar-reporte.dto';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../autenticacion/guardias/jwt-auth.guardia';
import type { Response } from 'express';
import { createReadStream } from 'fs';

@ApiTags('Reportes')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('reportes')
export class ReportesControlador {
  constructor(private readonly reportes_servicio: ReportesServicio) {}

  @Post('generar')
  @ApiOperation({ summary: 'Generar y guardar reporte en PDF' })
  async generarReporte(
    @Request() req,
    @Body() dto: GenerarReporteDto,
  ) {
    return await this.reportes_servicio.generarYGuardarReporte(req.user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Obtener todos los reportes del usuario' })
  async obtenerReportes(@Request() req) {
    return await this.reportes_servicio.obtenerReportesUsuario(req.user.id);
  }

  @Get(':id/descargar')
  @ApiOperation({ summary: 'Descargar reporte por ID' })
  async descargarReporte(
    @Request() req,
    @Param('id') id: number,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const { archivo, nombre } = await this.reportes_servicio.obtenerArchivoReporte(req.user.id, id);
    
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${nombre}.pdf"`,
    });
    
    return new StreamableFile(archivo);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar reporte' })
  async eliminarReporte(@Request() req, @Param('id') id: number) {
    await this.reportes_servicio.eliminarReporte(req.user.id, id);
    return { mensaje: 'Reporte eliminado correctamente' };
  }
}