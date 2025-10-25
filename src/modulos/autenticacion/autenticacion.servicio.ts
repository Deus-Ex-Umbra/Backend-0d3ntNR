import { Injectable } from '@nestjs/common';
import { UsuariosServicio } from '../usuarios/usuarios.servicio';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { RegistroUsuarioDto } from './dto/registro-usuario.dto';
import { Usuario } from '../usuarios/entidades/usuario.entidad';

@Injectable()
export class AutenticacionServicio {
  constructor(
    private readonly usuarios_servicio: UsuariosServicio,
    private readonly jwt_servicio: JwtService,
  ) {}

  async validarUsuario(correo: string, contrasena_plana: string): Promise<Omit<Usuario, 'contrasena'> | null> {
    const usuario = await this.usuarios_servicio.encontrarPorCorreoConContrasena(correo);

    if (!usuario) {
      return null;
    }

    const contrasena_valida = await bcrypt.compare(contrasena_plana, usuario.contrasena);

    if (contrasena_valida) {
      const { contrasena, ...resultado } = usuario;
      return resultado;
    }

    return null;
  }

  async iniciarSesion(usuario: Omit<Usuario, 'contrasena'>) {
    const payload = { correo: usuario.correo, sub: usuario.id };
    const token = this.jwt_servicio.sign(payload);

    const usuario_datos_completos = await this.usuarios_servicio.encontrarPorId(usuario.id);

    return {
      token_acceso: token,
      usuario: usuario_datos_completos,
    };
  }

  async registrar(registro_usuario_dto: RegistroUsuarioDto) {
    return this.usuarios_servicio.crear(registro_usuario_dto);
  }
}