import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ArchivoAdjunto } from './entidades/archivo-adjunto.entidad';
import { ArchivosAdjuntosControlador } from './archivos-adjuntos.controlador';
import { ArchivosAdjuntosServicio } from './archivos-adjuntos.servicio';
import { PacientesModule } from '../pacientes/pacientes.modulo';
import { TratamientosModule } from '../tratamientos/tratamientos.modulo';
import { AlmacenamientoModule } from '../almacenamiento/almacenamiento.modulo';

@Module({
  imports: [
    TypeOrmModule.forFeature([ArchivoAdjunto]),
    PacientesModule,
    TratamientosModule,
    AlmacenamientoModule,
  ],
  controllers: [ArchivosAdjuntosControlador],
  providers: [ArchivosAdjuntosServicio],
  exports: [ArchivosAdjuntosServicio],
})
export class ArchivosAdjuntosModule {}