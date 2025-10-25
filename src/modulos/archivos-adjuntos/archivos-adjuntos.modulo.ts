import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ArchivoAdjunto } from './entidades/archivo-adjunto.entidad';
import { ArchivosAdjuntosControlador } from './archivos-adjuntos.controlador';
import { ArchivosAdjuntosServicio } from './archivos-adjuntos.servicio';
import { PacientesModule } from '../pacientes/pacientes.modulo';
import { TratamientosModule } from '../tratamientos/tratamientos.modulo';

@Module({
  imports: [
    TypeOrmModule.forFeature([ArchivoAdjunto]),
    PacientesModule,
    TratamientosModule,
  ],
  controllers: [ArchivosAdjuntosControlador],
  providers: [ArchivosAdjuntosServicio],
})
export class ArchivosAdjuntosModule {}
