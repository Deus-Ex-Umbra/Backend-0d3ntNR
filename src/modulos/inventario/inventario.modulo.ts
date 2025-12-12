import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Entidades
import { Inventario } from './entidades/inventario.entidad';
import { PermisoInventario } from './entidades/permiso-inventario.entidad';
import { Producto } from './entidades/producto.entidad';
import { Material } from './entidades/material.entidad';
import { Activo } from './entidades/activo.entidad';
import { Kardex } from './entidades/kardex.entidad';
import { Bitacora } from './entidades/bitacora.entidad';
import { Auditoria } from './entidades/auditoria.entidad';
import { ReservaMaterial } from './entidades/reserva-material.entidad';
import { ReservaActivo } from './entidades/reserva-activo.entidad';
import { MaterialCita } from './entidades/material-cita.entidad';
import { MaterialTratamiento } from './entidades/material-tratamiento.entidad';

// Entidades externas
import { Cita } from '../agenda/entidades/cita.entidad';
import { PlanTratamiento } from '../tratamientos/entidades/plan-tratamiento.entidad';

// Servicios
import { InventarioServicio } from './inventario.servicio';
import { KardexServicio } from './kardex.servicio';
import { BitacoraServicio } from './bitacora.servicio';
import { AuditoriaServicio } from './auditoria.servicio';
import { ReservasServicio } from './reservas.servicio';

// Controlador
import { InventarioControlador } from './inventario.controlador';

// Módulos externos
import { FinanzasModule } from '../finanzas/finanzas.modulo';

// Guardias
import { PermisoInventarioGuardia } from './guardias/permiso-inventario.guardia';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      // Entidades principales
      Inventario,
      PermisoInventario,
      Producto,
      Material,
      Activo,
      // Historiales
      Kardex,
      Bitacora,
      Auditoria,
      // Reservas
      ReservaMaterial,
      ReservaActivo,
      // Relaciones con citas/tratamientos
      MaterialCita,
      MaterialTratamiento,
      // Entidades externas necesarias
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

// Alias for backwards compatibility
export { InventarioModulo as InventarioModule };