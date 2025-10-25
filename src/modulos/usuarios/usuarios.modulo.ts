import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsuariosControlador } from './usuarios.controlador';
import { UsuariosServicio } from './usuarios.servicio';
import { Usuario } from './entidades/usuario.entidad';

@Module({
  imports: [TypeOrmModule.forFeature([Usuario])],
  controllers: [UsuariosControlador],
  providers: [UsuariosServicio],
  exports: [UsuariosServicio],
})
export class UsuariosModule {}