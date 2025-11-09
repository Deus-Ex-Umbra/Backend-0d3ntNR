import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Alergia } from './entidades/alergia.entidad';
import { Enfermedad } from './entidades/enfermedad.entidad';
import { Medicamento } from './entidades/medicamento.entidad';
import { ColorCategoria } from './entidades/color-categoria.entidad';
import { Etiqueta } from './entidades/etiqueta.entidad';
import { CatalogoControlador } from './catalogo.controlador';
import { CatalogoServicio } from './catalogo.servicio';

@Module({
  imports: [TypeOrmModule.forFeature([Alergia, Enfermedad, Medicamento, ColorCategoria, Etiqueta])],
  controllers: [CatalogoControlador],
  providers: [CatalogoServicio],
  exports: [CatalogoServicio],
})
export class CatalogoModule {}