import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppControlador } from './app.controlador';
import { AppServicio } from './app.servicio';
import { PacientesModule } from './modulos/pacientes/pacientes.modulo';
import { TratamientosModule } from './modulos/tratamientos/tratamientos.modulo';
import { AgendaModule } from './modulos/agenda/agenda.modulo';
import { FinanzasModule } from './modulos/finanzas/finanzas.modulo';
import { AutenticacionModule } from './modulos/autenticacion/autenticacion.modulo';
import { UsuariosModule } from './modulos/usuarios/usuarios.modulo';
import { GeminiModule } from './modulos/gemini/gemini.modulo';
import { NotasModule } from './modulos/notas/notas.modulo';
import { AsistenteModule } from './modulos/asistente/asistente.modulo';
import { EstadisticasModule } from './modulos/estadisticas/estadisticas.modulo';
import { CatalogoModule } from './modulos/catalogo/catalogo.modulo';
import { ArchivosAdjuntosModule } from './modulos/archivos-adjuntos/archivos-adjuntos.modulo';
import { EdicionesImagenesModule } from './modulos/ediciones-imagenes/ediciones-imagenes.modulo';
import { PlantillasConsentimientoModule } from './modulos/plantillas-consentimiento/plantillas-consentimiento.modulo';
import { InventarioModule } from './modulos/inventario/inventario.modulo';
import { AlmacenamientoModule } from './modulos/almacenamiento/almacenamiento.modulo';
import { Paciente } from './modulos/pacientes/entidades/paciente.entidad';
import { PacienteAlergia } from './modulos/pacientes/entidades/paciente-alergia.entidad';
import { PacienteEnfermedad } from './modulos/pacientes/entidades/paciente-enfermedad.entidad';
import { PacienteMedicamento } from './modulos/pacientes/entidades/paciente-medicamento.entidad';
import { Tratamiento } from './modulos/tratamientos/entidades/tratamiento.entidad';
import { PlanTratamiento } from './modulos/tratamientos/entidades/plan-tratamiento.entidad';
import { Cita } from './modulos/agenda/entidades/cita.entidad';
import { Egreso } from './modulos/finanzas/entidades/egreso.entidad';
import { Usuario } from './modulos/usuarios/entidades/usuario.entidad';
import { NotaDiaria } from './modulos/notas/entidades/nota-diaria.entidad';
import { Pago } from './modulos/finanzas/entidades/pago.entidad';
import { Alergia } from './modulos/catalogo/entidades/alergia.entidad';
import { Enfermedad } from './modulos/catalogo/entidades/enfermedad.entidad';
import { Medicamento } from './modulos/catalogo/entidades/medicamento.entidad';
import { ColorCategoria } from './modulos/catalogo/entidades/color-categoria.entidad';
import { ArchivoAdjunto } from './modulos/archivos-adjuntos/entidades/archivo-adjunto.entidad';
import { EdicionImagen } from './modulos/ediciones-imagenes/entidades/edicion-imagen.entidad';
import { PlantillaConsentimiento } from './modulos/plantillas-consentimiento/entidades/plantilla-consentimiento.entidad';
import { Inventario } from './modulos/inventario/entidades/inventario.entidad';
import { PermisoInventario } from './modulos/inventario/entidades/permiso-inventario.entidad';
import { Producto } from './modulos/inventario/entidades/producto.entidad';
import { Lote } from './modulos/inventario/entidades/lote.entidad';
import { Activo } from './modulos/inventario/entidades/activo.entidad';
import { CitaConsumible } from './modulos/inventario/entidades/cita-consumible.entidad';
import { ActivoHistorial } from './modulos/inventario/entidades/activo-historial.entidad';
import { MaterialCita } from './modulos/inventario/entidades/material-cita.entidad';
import { MaterialTratamiento } from './modulos/inventario/entidades/material-tratamiento.entidad';
import { MovimientoInventario } from './modulos/inventario/entidades/movimiento-inventario.entidad';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: 'database.sqlite',
      entities: [
        Paciente,
        PacienteAlergia,
        PacienteEnfermedad,
        PacienteMedicamento,
        Tratamiento,
        PlanTratamiento,
        Cita,
        Egreso,
        Usuario,
        NotaDiaria,
        Pago,
        Alergia,
        Enfermedad,
        Medicamento,
        ColorCategoria,
        ArchivoAdjunto,
        EdicionImagen,
        PlantillaConsentimiento,
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
      ],
      synchronize: true,
    }),
    PacientesModule,
    TratamientosModule,
    AgendaModule,
    FinanzasModule,
    AutenticacionModule,
    UsuariosModule,
    GeminiModule,
    NotasModule,
    AsistenteModule,
    EstadisticasModule,
    CatalogoModule,
    ArchivosAdjuntosModule,
    EdicionesImagenesModule,
    PlantillasConsentimientoModule,
    InventarioModule,
    AlmacenamientoModule,
  ],
  controllers: [AppControlador],
  providers: [AppServicio],
})
export class AppModule {}