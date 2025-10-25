import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EstadisticasControlador } from './estadisticas.controlador';
import { EstadisticasServicio } from './estadisticas.servicio';
import { Paciente } from '../pacientes/entidades/paciente.entidad';
import { Cita } from '../agenda/entidades/cita.entidad';
import { PlanTratamiento } from '../tratamientos/entidades/plan-tratamiento.entidad';
import { Pago } from '../finanzas/entidades/pago.entidad';
import { Egreso } from '../finanzas/entidades/egreso.entidad';

@Module({
  imports: [TypeOrmModule.forFeature([Paciente, Cita, PlanTratamiento, Pago, Egreso])],
  controllers: [EstadisticasControlador],
  providers: [EstadisticasServicio],
})
export class EstadisticasModule {}