import { Controller, Post, Body, Get, Query, UseGuards, Put, Delete, Param } from '@nestjs/common';
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
  registrarEgreso(@Body() registrar_egreso_dto: RegistrarEgresoDto) {
    return this.finanzas_servicio.registrarEgreso(registrar_egreso_dto);
  }

  @Put('egresos/:id')
  actualizarEgreso(@Param('id') id: string, @Body() actualizar_egreso_dto: ActualizarEgresoDto) {
    return this.finanzas_servicio.actualizarEgreso(+id, actualizar_egreso_dto);
  }

  @Delete('egresos/:id')
  eliminarEgreso(@Param('id') id: string) {
    return this.finanzas_servicio.eliminarEgreso(+id);
  }

  @Post('pagos')
  registrarPago(@Body() registrar_pago_dto: RegistrarPagoDto) {
    return this.finanzas_servicio.registrarPago(registrar_pago_dto);
  }

  @Put('pagos/:id')
  actualizarPago(@Param('id') id: string, @Body() actualizar_pago_dto: ActualizarPagoDto) {
    return this.finanzas_servicio.actualizarPago(+id, actualizar_pago_dto);
  }

  @Delete('pagos/:id')
  eliminarPago(@Param('id') id: string) {
    return this.finanzas_servicio.eliminarPago(+id);
  }

  @Get('reporte')
  @ApiQuery({ name: 'fecha_inicio', required: false, type: String })
  @ApiQuery({ name: 'fecha_fin', required: false, type: String })
  obtenerReporte(@Query('fecha_inicio') fecha_inicio?: string, @Query('fecha_fin') fecha_fin?: string) {
    return this.finanzas_servicio.generarReporte(fecha_inicio, fecha_fin);
  }

  @Get('grafico')
  @ApiQuery({ name: 'tipo', required: true, enum: ['dia', 'mes', 'ano'] })
  @ApiQuery({ name: 'fecha_referencia', required: false, type: String })
  obtenerDatosGrafico(
    @Query('tipo') tipo: 'dia' | 'mes' | 'ano',
    @Query('fecha_referencia') fecha_referencia?: string
  ) {
    return this.finanzas_servicio.obtenerDatosGrafico(tipo, fecha_referencia);
  }
}