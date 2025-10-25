import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Odontograma } from './entidades/odontograma.entidad';
import { OdontogramaControlador } from './odontograma.controlador';
import { OdontogramaServicio } from './odontograma.servicio';
import { PacientesModule } from '../pacientes/pacientes.modulo';

@Module({
  imports: [TypeOrmModule.forFeature([Odontograma]), PacientesModule],
  controllers: [OdontogramaControlador],
  providers: [OdontogramaServicio],
})
export class OdontogramaModule {}

