import { Injectable, CanActivate, ExecutionContext, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Inventario } from '../entidades/inventario.entidad';
import { PermisoInventario, RolInventario } from '../entidades/permiso-inventario.entidad';
import { Reflector } from '@nestjs/core';

@Injectable()
export class PermisoInventarioGuardia implements CanActivate {
  constructor(
    @InjectRepository(Inventario)
    private readonly inventario_repositorio: Repository<Inventario>,
    @InjectRepository(PermisoInventario)
    private readonly permiso_repositorio: Repository<PermisoInventario>,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const usuario_id = request.user.id;
    const inventario_id = +request.params.inventario_id || +request.body.inventario_id;

    const rol_requerido = this.reflector.get<RolInventario>('rol_inventario', context.getHandler());

    if (!inventario_id) {
      throw new NotFoundException('ID de inventario no especificado');
    }

    const inventario = await this.inventario_repositorio.findOne({
      where: { id: inventario_id, activo: true },
      relations: ['propietario'],
    });

    if (!inventario) {
      throw new NotFoundException('Inventario no encontrado');
    }

    if (inventario.propietario.id === usuario_id) {
      return true;
    }

    const permiso = await this.permiso_repositorio.findOne({
      where: {
        inventario: { id: inventario_id },
        usuario_invitado: { id: usuario_id },
      },
    });

    if (!permiso) {
      throw new ForbiddenException('No tienes permiso para acceder a este inventario');
    }

    if (rol_requerido === RolInventario.EDITOR && permiso.rol === RolInventario.LECTOR) {
      throw new ForbiddenException('Necesitas permisos de editor para esta acción');
    }

    return true;
  }
}