import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AlmacenamientoServicio } from './almacenamiento.servicio';

@Module({
  imports: [ConfigModule],
  providers: [AlmacenamientoServicio],
  exports: [AlmacenamientoServicio],
})
export class AlmacenamientoModule {}