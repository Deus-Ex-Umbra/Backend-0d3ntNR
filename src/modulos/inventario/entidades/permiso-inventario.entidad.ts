import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Inventario } from './inventario.entidad';
import { Usuario } from '../../usuarios/entidades/usuario.entidad';

export enum RolInventario {
  LECTOR = 'lector',
  EDITOR = 'editor',
}

@Entity()
export class PermisoInventario {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    enum: RolInventario,
  })
  rol: RolInventario;

  @ManyToOne(() => Inventario, (inventario) => inventario.permisos, { onDelete: 'CASCADE' })
  inventario: Inventario;

  @ManyToOne(() => Usuario, { onDelete: 'CASCADE' })
  usuario_invitado: Usuario;
}