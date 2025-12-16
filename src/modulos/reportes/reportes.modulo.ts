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
import { Kardex } from '../inventario/entidades/kardex.entidad';
import { Activo } from '../inventario/entidades/activo.entidad';
import { Reporte } from './entidades/reporte.entidad';
import { Usuario } from '../usuarios/entidades/usuario.entidad';
import { ConfiguracionClinica } from '../catalogo/entidades/configuracion-clinica.entidad';
import { GeminiModule } from '../gemini/gemini.modulo';
import { AlmacenamientoModule } from '../almacenamiento/almacenamiento.modulo';

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
      Kardex,
      Activo,
      Reporte,
      Usuario,
      ConfiguracionClinica,
    ]),
    GeminiModule,
    AlmacenamientoModule,
  ],
  controllers: [ReportesControlador],
  providers: [ReportesServicio],
  exports: [ReportesServicio],
})
export class ReportesModule { }
