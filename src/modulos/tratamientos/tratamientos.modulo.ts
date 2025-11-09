import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tratamiento } from './entidades/tratamiento.entidad';
import { PlanTratamiento } from './entidades/plan-tratamiento.entidad';
import { MaterialPlantilla } from './entidades/material-plantilla.entidad';
import { MaterialTratamiento } from '../inventario/entidades/material-tratamiento.entidad';
import { MaterialCita } from '../inventario/entidades/material-cita.entidad';
import { TratamientosControlador } from './tratamientos.controlador';
import { TratamientosServicio } from './tratamientos.servicio';
import { PlanesTratamientoControlador } from './planes-tratamiento.controlador';
import { PlanesTratamientoServicio } from './planes-tratamiento.servicio';
import { PacientesModule } from '../pacientes/pacientes.modulo';
import { AgendaModule } from '../agenda/agenda.modulo';
import { InventarioModule } from '../inventario/inventario.modulo';

@Module({
  imports: [
    TypeOrmModule.forFeature([Tratamiento, PlanTratamiento, MaterialPlantilla, MaterialTratamiento, MaterialCita]),
    forwardRef(() => PacientesModule),
    forwardRef(() => AgendaModule),
    forwardRef(() => InventarioModule),
  ],
  controllers: [TratamientosControlador, PlanesTratamientoControlador],
  providers: [TratamientosServicio, PlanesTratamientoServicio],
  exports: [TratamientosServicio, PlanesTratamientoServicio, TypeOrmModule],
})
export class TratamientosModule {}