import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Inventario } from './entidades/inventario.entidad';
import { PermisoInventario } from './entidades/permiso-inventario.entidad';
import { Producto } from './entidades/producto.entidad';
import { Lote } from './entidades/lote.entidad';
import { Activo } from './entidades/activo.entidad';
import { CitaConsumible } from './entidades/cita-consumible.entidad';
import { ActivoHistorial } from './entidades/activo-historial.entidad';
import { MaterialCita } from './entidades/material-cita.entidad';
import { MaterialTratamiento } from './entidades/material-tratamiento.entidad';
import { MovimientoInventario } from './entidades/movimiento-inventario.entidad';
import { Cita } from '../agenda/entidades/cita.entidad';
import { PlanTratamiento } from '../tratamientos/entidades/plan-tratamiento.entidad';
import { InventarioControlador } from './inventario.controlador';
import { InventarioServicio } from './inventario.servicio';
import { PermisoInventarioGuardia } from './guardias/permiso-inventario.guardia';
import { InventarioSubscriber } from './inventario.subscriber';
import { FinanzasModule } from '../finanzas/finanzas.modulo';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Inventario,
      PermisoInventario,
      Producto,
      Lote,
      Activo,
      CitaConsumible,
      ActivoHistorial,
      MaterialCita,
      MaterialTratamiento,
      MovimientoInventario,
      Cita,
      PlanTratamiento,
    ]),
    forwardRef(() => FinanzasModule),
  ],
  controllers: [InventarioControlador],
  providers: [InventarioServicio, PermisoInventarioGuardia, InventarioSubscriber],
  exports: [InventarioServicio],
})
export class InventarioModule {}