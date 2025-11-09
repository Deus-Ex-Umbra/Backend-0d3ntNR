import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportesControlador } from './reportes.controlador';
import { ReportesServicio } from './reportes.servicio';
import { Paciente } from '../pacientes/entidades/paciente.entidad';
import { Cita } from '../agenda/entidades/cita.entidad';
import { PlanTratamiento } from '../tratamientos/entidades/plan-tratamiento.entidad';
import { Pago } from '../finanzas/entidades/pago.entidad';
import { Egreso } from '../finanzas/entidades/egreso.entidad';
import { Inventario } from '../inventario/entidades/inventario.entidad';
import { Producto } from '../inventario/entidades/producto.entidad';
import { Reporte } from './entidades/reporte.entidad';
import { GeminiModule } from '../gemini/gemini.modulo';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Paciente,
      Cita,
      PlanTratamiento,
      Pago,
      Egreso,
      Inventario,
      Producto,
      Reporte,
    ]),
    GeminiModule,
  ],
  controllers: [ReportesControlador],
  providers: [ReportesServicio],
  exports: [ReportesServicio],
})
export class ReportesModule {}