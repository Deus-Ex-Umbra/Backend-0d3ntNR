import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Egreso } from './entidades/egreso.entidad';
import { Pago } from './entidades/pago.entidad';
import { Cita } from '../agenda/entidades/cita.entidad';
import { FinanzasControlador } from './finanzas.controlador';
import { FinanzasServicio } from './finanzas.servicio';
import { TratamientosModule } from '../tratamientos/tratamientos.modulo';
import { AgendaModule } from '../agenda/agenda.modulo';

@Module({
  imports: [
    TypeOrmModule.forFeature([Egreso, Pago, Cita]),
    forwardRef(() => TratamientosModule),
    forwardRef(() => AgendaModule),
  ],
  controllers: [FinanzasControlador],
  providers: [FinanzasServicio],
  exports: [FinanzasServicio],
})
export class FinanzasModule {}