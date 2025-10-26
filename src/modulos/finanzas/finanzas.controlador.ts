import { Controller, Post, Body, Get, Query, UseGuards, Put, Delete, Param, Request } from '@nestjs/common';
import { FinanzasServicio } from './finanzas.servicio';
import { RegistrarEgresoDto } from './dto/registrar-egreso.dto';
import { RegistrarPagoDto } from './dto/registrar-pago.dto';
import { ActualizarPagoDto } from './dto/actualizar-pago.dto';
import { ActualizarEgresoDto } from './dto/actualizar-egreso.dto';
import { ApiTags, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../autenticacion/guardias/jwt-auth.guardia';

@ApiTags('Finanzas')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('finanzas')
export class FinanzasControlador {
  constructor(private readonly finanzas_servicio: FinanzasServicio) {}

  @Post('egresos')
  registrarEgreso(@Request() req, @Body() registrar_egreso_dto: RegistrarEgresoDto) {
    return this.finanzas_servicio.registrarEgreso(req.user.id, registrar_egreso_dto);
  }

  @Put('egresos/:id')
  actualizarEgreso(@Request() req, @Param('id') id: string, @Body() actualizar_egreso_dto: ActualizarEgresoDto) {
    return this.finanzas_servicio.actualizarEgreso(req.user.id, +id, actualizar_egreso_dto);
  }

  @Delete('egresos/:id')
  eliminarEgreso(@Request() req, @Param('id') id: string) {
    return this.finanzas_servicio.eliminarEgreso(req.user.id, +id);
  }

  @Post('pagos')
  registrarPago(@Request() req, @Body() registrar_pago_dto: RegistrarPagoDto) {
    return this.finanzas_servicio.registrarPago(req.user.id, registrar_pago_dto);
  }

  @Put('pagos/:id')
  actualizarPago(@Request() req, @Param('id') id: string, @Body() actualizar_pago_dto: ActualizarPagoDto) {
    return this.finanzas_servicio.actualizarPago(req.user.id, +id, actualizar_pago_dto);
  }

  @Delete('pagos/:id')
  eliminarPago(@Request() req, @Param('id') id: string) {
    return this.finanzas_servicio.eliminarPago(req.user.id, +id);
  }

  @Get('reporte')
  @ApiQuery({ name: 'fecha_inicio', required: false, type: String })
  @ApiQuery({ name: 'fecha_fin', required: false, type: String })
  obtenerReporte(@Request() req, @Query('fecha_inicio') fecha_inicio?: string, @Query('fecha_fin') fecha_fin?: string) {
    return this.finanzas_servicio.generarReporte(req.user.id, fecha_inicio, fecha_fin);
  }

  @Get('grafico')
  @ApiQuery({ name: 'tipo', required: true, enum: ['dia', 'mes', 'ano'] })
  @ApiQuery({ name: 'fecha_referencia', required: false, type: String })
  obtenerDatosGrafico(
    @Request() req,
    @Query('tipo') tipo: 'dia' | 'mes' | 'ano',
    @Query('fecha_referencia') fecha_referencia?: string
  ) {
    return this.finanzas_servicio.obtenerDatosGrafico(req.user.id, tipo, fecha_referencia);
  }
}