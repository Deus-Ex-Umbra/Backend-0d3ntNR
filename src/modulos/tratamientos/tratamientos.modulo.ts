import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tratamiento } from './entidades/tratamiento.entidad';
import { PlanTratamiento } from './entidades/plan-tratamiento.entidad';
import { TratamientosControlador } from './tratamientos.controlador';
import { TratamientosServicio } from './tratamientos.servicio';
import { PlanesTratamientoControlador } from './planes-tratamiento.controlador';
import { PlanesTratamientoServicio } from './planes-tratamiento.servicio';
import { PacientesModule } from '../pacientes/pacientes.modulo';
import { AgendaModule } from '../agenda/agenda.modulo';

@Module({
  imports: [
    TypeOrmModule.forFeature([Tratamiento, PlanTratamiento]),
    PacientesModule,
    forwardRef(() => AgendaModule),
  ],
  controllers: [TratamientosControlador, PlanesTratamientoControlador],
  providers: [TratamientosServicio, PlanesTratamientoServicio],
  exports: [PlanesTratamientoServicio],
})
export class TratamientosModule {}