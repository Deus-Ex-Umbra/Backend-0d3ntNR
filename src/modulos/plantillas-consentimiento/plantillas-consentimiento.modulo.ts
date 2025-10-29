import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlantillaConsentimiento } from './entidades/plantilla-consentimiento.entidad';
import { PlantillasConsentimientoControlador } from './plantillas-consentimiento.controlador';
import { PlantillasConsentimientoServicio } from './plantillas-consentimiento.servicio';
import { PacientesModule } from '../pacientes/pacientes.modulo';
import { TratamientosModule } from '../tratamientos/tratamientos.modulo';
import { ArchivosAdjuntosModule } from '../archivos-adjuntos/archivos-adjuntos.modulo';

@Module({
  imports: [
    TypeOrmModule.forFeature([PlantillaConsentimiento]),
    PacientesModule,
    TratamientosModule,
    ArchivosAdjuntosModule,
  ],
  controllers: [PlantillasConsentimientoControlador],
  providers: [PlantillasConsentimientoServicio],
  exports: [PlantillasConsentimientoServicio],
})
export class PlantillasConsentimientoModule {}