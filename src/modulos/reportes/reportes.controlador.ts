import { Controller, Post, Body, UseGuards, Request, Res } from '@nestjs/common';
import { ReportesServicio } from './reportes.servicio';
import { GenerarReporteDto } from './dto/generar-reporte.dto';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../autenticacion/guardias/jwt-auth.guardia';
import type { Response } from 'express';

@ApiTags('Reportes')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('reportes')
export class ReportesControlador {
  constructor(private readonly reportes_servicio: ReportesServicio) {}

  @Post('generar')
  @ApiOperation({ summary: 'Generar reporte en PDF' })
  async generarReporte(
    @Request() req,
    @Body() dto: GenerarReporteDto,
    @Res() res: Response,
  ) {
    const pdf_buffer = await this.reportes_servicio.generarReporte(req.user.id, dto);
    
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=reporte-${Date.now()}.pdf`,
      'Content-Length': pdf_buffer.length,
    });
    
    res.send(pdf_buffer);
  }
}