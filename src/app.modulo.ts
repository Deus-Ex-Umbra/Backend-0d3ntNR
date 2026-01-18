import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
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
import { PlantillasRecetasModule } from './modulos/plantillas-recetas/plantillas-recetas.modulo';
import { InventarioModule } from './modulos/inventario/inventario.modulo';
import { AlmacenamientoModule } from './modulos/almacenamiento/almacenamiento.modulo';
import { ReportesModule } from './modulos/reportes/reportes.modulo';
import { PdfModulo } from './modulos/pdf/pdf.modulo';
import { Paciente } from './modulos/pacientes/entidades/paciente.entidad';
import { PacienteAlergia } from './modulos/pacientes/entidades/paciente-alergia.entidad';
import { PacienteEnfermedad } from './modulos/pacientes/entidades/paciente-enfermedad.entidad';
import { PacienteMedicamento } from './modulos/pacientes/entidades/paciente-medicamento.entidad';
import { Tratamiento } from './modulos/tratamientos/entidades/tratamiento.entidad';
import { PlanTratamiento } from './modulos/tratamientos/entidades/plan-tratamiento.entidad';
import { MaterialPlantilla } from './modulos/tratamientos/entidades/material-plantilla.entidad';
import { Cita } from './modulos/agenda/entidades/cita.entidad';
import { Egreso } from './modulos/finanzas/entidades/egreso.entidad';
import { Usuario } from './modulos/usuarios/entidades/usuario.entidad';
import { NotaDiaria } from './modulos/notas/entidades/nota-diaria.entidad';
import { Pago } from './modulos/finanzas/entidades/pago.entidad';
import { Alergia } from './modulos/catalogo/entidades/alergia.entidad';
import { Enfermedad } from './modulos/catalogo/entidades/enfermedad.entidad';
import { Medicamento } from './modulos/catalogo/entidades/medicamento.entidad';
import { ColorCategoria } from './modulos/catalogo/entidades/color-categoria.entidad';
import { Etiqueta } from './modulos/catalogo/entidades/etiqueta.entidad';
import { EtiquetaPlantilla } from './modulos/catalogo/entidades/etiqueta-plantilla.entidad';
import { ArchivoAdjunto } from './modulos/archivos-adjuntos/entidades/archivo-adjunto.entidad';
import { EdicionImagen } from './modulos/ediciones-imagenes/entidades/edicion-imagen.entidad';
import { ComentarioImagen } from './modulos/ediciones-imagenes/entidades/comentario-imagen.entidad';
import { PlantillaConsentimiento } from './modulos/plantillas-consentimiento/entidades/plantilla-consentimiento.entidad';
import { PlantillaReceta } from './modulos/plantillas-recetas/entidades/plantilla-receta.entidad';
import { Inventario } from './modulos/inventario/entidades/inventario.entidad';
import { PermisoInventario } from './modulos/inventario/entidades/permiso-inventario.entidad';
import { Producto } from './modulos/inventario/entidades/producto.entidad';
import { Material } from './modulos/inventario/entidades/material.entidad';
import { Activo } from './modulos/inventario/entidades/activo.entidad';
import { Kardex } from './modulos/inventario/entidades/kardex.entidad';
import { Bitacora } from './modulos/inventario/entidades/bitacora.entidad';
import { Auditoria } from './modulos/inventario/entidades/auditoria.entidad';
import { ReservaMaterial } from './modulos/inventario/entidades/reserva-material.entidad';
import { MaterialCita } from './modulos/inventario/entidades/material-cita.entidad';
import { MaterialTratamiento } from './modulos/inventario/entidades/material-tratamiento.entidad';
import { Reporte } from './modulos/reportes/entidades/reporte.entidad';
import { ConsentimientoInformado } from './modulos/pacientes/entidades/consentimiento-informado.entidad';
import { TamanoPapel } from './modulos/catalogo/entidades/tamano-papel.entidad';
import { HistoriaClinicaVersion } from './modulos/pacientes/entidades/historia-clinica-version.entidad';
import { ConfiguracionClinica } from './modulos/catalogo/entidades/configuracion-clinica.entidad';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_DATABASE || 'db0d3ntnr',
      entities: [
        Paciente,
        PacienteAlergia,
        PacienteEnfermedad,
        PacienteMedicamento,
        Tratamiento,
        PlanTratamiento,
        MaterialPlantilla,
        Cita,
        Egreso,
        Usuario,
        NotaDiaria,
        Pago,
        Alergia,
        Enfermedad,
        Medicamento,
        ColorCategoria,
        Etiqueta,
        EtiquetaPlantilla,
        ArchivoAdjunto,
        EdicionImagen,
        ComentarioImagen,
        PlantillaConsentimiento,
        PlantillaReceta,
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
        Reporte,
        ConsentimientoInformado,
        HistoriaClinicaVersion,
        TamanoPapel,
        ConfiguracionClinica,
      ],
      synchronize: true,
      ssl: process.env.SSL_ENABLED === 'true' ? { rejectUnauthorized: false } : false,
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
    PlantillasRecetasModule,
    InventarioModule,
    AlmacenamientoModule,
    ReportesModule,
    PdfModulo,
  ],
  controllers: [AppControlador],
  providers: [AppServicio],
})
export class AppModule { }

