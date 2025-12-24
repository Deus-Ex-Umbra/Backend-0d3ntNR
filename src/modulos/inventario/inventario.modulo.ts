import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { Inventario } from './entidades/inventario.entidad';
import { PermisoInventario } from './entidades/permiso-inventario.entidad';
import { Producto } from './entidades/producto.entidad';
import { Material } from './entidades/material.entidad';
import { Activo } from './entidades/activo.entidad';
import { Kardex } from './entidades/kardex.entidad';
import { Bitacora } from './entidades/bitacora.entidad';
import { Auditoria } from './entidades/auditoria.entidad';
import { ReservaMaterial } from './entidades/reserva-material.entidad';
import { MaterialCita } from './entidades/material-cita.entidad';
import { MaterialTratamiento } from './entidades/material-tratamiento.entidad';
import { Cita } from '../agenda/entidades/cita.entidad';
import { PlanTratamiento } from '../tratamientos/entidades/plan-tratamiento.entidad';
import { InventarioServicio } from './inventario.servicio';
import { KardexServicio } from './kardex.servicio';
import { BitacoraServicio } from './bitacora.servicio';
import { AuditoriaServicio } from './auditoria.servicio';
import { ReservasServicio } from './reservas.servicio';
import { EstadoActivosCron } from './estado-activos.cron';
import { InventarioControlador } from './inventario.controlador';
import { FinanzasModule } from '../finanzas/finanzas.modulo';
import { PermisoInventarioGuardia } from './guardias/permiso-inventario.guardia';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Inventario,
      PermisoInventario,
      Producto,
      Material,
      Activo,
      Kardex,
      Bitacora,
      Auditoria,
      ReservaMaterial,
      MaterialCita,
      MaterialTratamiento,
      Cita,
      PlanTratamiento,
    ]),
    forwardRef(() => FinanzasModule),
  ],
  controllers: [InventarioControlador],
  providers: [
    InventarioServicio,
    KardexServicio,
    BitacoraServicio,
    AuditoriaServicio,
    ReservasServicio,
    EstadoActivosCron,
    PermisoInventarioGuardia,
  ],
  exports: [
    InventarioServicio,
    KardexServicio,
    BitacoraServicio,
    AuditoriaServicio,
    ReservasServicio,
  ],
})
export class InventarioModulo { }

export { InventarioModulo as InventarioModule };