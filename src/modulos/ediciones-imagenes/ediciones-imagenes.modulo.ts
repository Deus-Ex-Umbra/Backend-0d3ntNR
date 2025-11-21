import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EdicionImagen } from './entidades/edicion-imagen.entidad';
import { ArchivoAdjunto } from '../archivos-adjuntos/entidades/archivo-adjunto.entidad';
import { EdicionesImagenesControlador } from './ediciones-imagenes.controlador';
import { EdicionesImagenesServicio } from './ediciones-imagenes.servicio';
import { AlmacenamientoModule } from '../almacenamiento/almacenamiento.modulo';

@Module({
  imports: [TypeOrmModule.forFeature([EdicionImagen, ArchivoAdjunto]), AlmacenamientoModule],
  controllers: [EdicionesImagenesControlador],
  providers: [EdicionesImagenesServicio],
  exports: [EdicionesImagenesServicio],
})
export class EdicionesImagenesModule {}