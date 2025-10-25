import { Injectable, NotFoundException, ConflictException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Usuario } from './entidades/usuario.entidad';
import * as bcrypt from 'bcrypt';
import { RegistroUsuarioDto } from '../autenticacion/dto/registro-usuario.dto';
import { ActualizarUsuarioDto } from './dto/actualizar-usuario.dto';
import { CambiarContrasenaDto } from './dto/cambiar-contrasena.dto';

@Injectable()
export class UsuariosServicio {
  constructor(
    @InjectRepository(Usuario)
    private readonly usuario_repositorio: Repository<Usuario>,
  ) {}

  async crear(registro_usuario_dto: RegistroUsuarioDto): Promise<Omit<Usuario, 'contrasena'>> {
    const { nombre, correo, contrasena } = registro_usuario_dto;

    const usuario_existente = await this.usuario_repositorio.findOne({
      where: { correo }
    });

    if (usuario_existente) {
      throw new ConflictException('Ya existe una cuenta con este correo electrónico');
    }

    const salt = await bcrypt.genSalt();
    const contrasena_hasheada = await bcrypt.hash(contrasena, salt);

    const nuevo_usuario = this.usuario_repositorio.create({
      nombre,
      correo,
      contrasena: contrasena_hasheada,
    });

    const usuario_guardado = await this.usuario_repositorio.save(nuevo_usuario);
    const { contrasena: _, ...usuario_sin_contrasena } = usuario_guardado;
    return usuario_sin_contrasena;
  }

  async encontrarPorCorreoConContrasena(correo: string): Promise<Usuario | null> {
    return this.usuario_repositorio.findOne({ where: { correo } });
  }

  async encontrarPorId(id: number): Promise<Omit<Usuario, 'contrasena'>> {
    const usuario = await this.usuario_repositorio.findOne({ where: { id } });
    if (!usuario) {
      throw new NotFoundException(`Usuario con ID "${id}" no encontrado`);
    }
    const { contrasena, ...resultado } = usuario;
    return resultado;
  }
  
  private async encontrarPorIdConContrasena(id: number): Promise<Usuario> {
    const usuario = await this.usuario_repositorio.findOne({ where: { id } });
    if (!usuario) {
      throw new NotFoundException(`Usuario con ID "${id}" no encontrado`);
    }
    return usuario;
  }

  async actualizar(id: number, actualizar_usuario_dto: ActualizarUsuarioDto): Promise<Omit<Usuario, 'contrasena'>> {
    const usuario = await this.usuario_repositorio.preload({
        id,
        ...actualizar_usuario_dto
    });

    if (!usuario) {
        throw new NotFoundException(`Usuario con ID "${id}" no encontrado`);
    }

    const usuario_actualizado = await this.usuario_repositorio.save(usuario);
    const { contrasena, ...resultado } = usuario_actualizado;
    return resultado;
  }
  
  async cambiarContrasena(id: number, cambiar_contrasena_dto: CambiarContrasenaDto): Promise<void> {
    const { contrasena_actual, nueva_contrasena } = cambiar_contrasena_dto;
    const usuario = await this.encontrarPorIdConContrasena(id);

    const es_valida = await bcrypt.compare(contrasena_actual, usuario.contrasena);
    if (!es_valida) {
      throw new UnauthorizedException('La contraseña actual es incorrecta');
    }

    const salt = await bcrypt.genSalt();
    usuario.contrasena = await bcrypt.hash(nueva_contrasena, salt);

    await this.usuario_repositorio.save(usuario);
  }
}
