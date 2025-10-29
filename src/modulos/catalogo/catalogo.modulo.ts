import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Alergia } from './entidades/alergia.entidad';
import { Enfermedad } from './entidades/enfermedad.entidad';
import { Medicamento } from './entidades/medicamento.entidad';
import { ColorCategoria } from './entidades/color-categoria.entidad';
import { CatalogoControlador } from './catalogo.controlador';
import { CatalogoServicio } from './catalogo.servicio';

@Module({
  imports: [TypeOrmModule.forFeature([Alergia, Enfermedad, Medicamento, ColorCategoria])],
  controllers: [CatalogoControlador],
  providers: [CatalogoServicio],
  exports: [CatalogoServicio],
})
export class CatalogoModule {}