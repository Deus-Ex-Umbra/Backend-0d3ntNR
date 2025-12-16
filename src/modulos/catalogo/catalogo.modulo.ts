import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Alergia } from './entidades/alergia.entidad';
import { Enfermedad } from './entidades/enfermedad.entidad';
import { Medicamento } from './entidades/medicamento.entidad';
import { ColorCategoria } from './entidades/color-categoria.entidad';
import { Etiqueta } from './entidades/etiqueta.entidad';
import { EtiquetaPlantilla } from './entidades/etiqueta-plantilla.entidad';
import { CatalogoControlador } from './catalogo.controlador';
import { CatalogoServicio } from './catalogo.servicio';
import { TamanoPapel } from './entidades/tamano-papel.entidad';
import { ConfiguracionClinica } from './entidades/configuracion-clinica.entidad';

@Module({
  imports: [TypeOrmModule.forFeature([Alergia, Enfermedad, Medicamento, ColorCategoria, Etiqueta, EtiquetaPlantilla, TamanoPapel, ConfiguracionClinica])],
  controllers: [CatalogoControlador],
  providers: [CatalogoServicio],
  exports: [CatalogoServicio],
})
export class CatalogoModule { }
