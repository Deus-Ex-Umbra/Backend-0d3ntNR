import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotaDiaria } from './entidades/nota-diaria.entidad';
import { NotasControlador } from './notas.controlador';
import { NotasServicio } from './notas.servicio';

@Module({
  imports: [TypeOrmModule.forFeature([NotaDiaria])],
  controllers: [NotasControlador],
  providers: [NotasServicio],
  exports: [NotasServicio]
})
export class NotasModule {}