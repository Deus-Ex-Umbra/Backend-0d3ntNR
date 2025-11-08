import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany } from 'typeorm';
import { Usuario } from '../../usuarios/entidades/usuario.entidad';
import { PermisoInventario } from './permiso-inventario.entidad';
import { Producto } from './producto.entidad';

export enum VisibilidadInventario {
  PRIVADO = 'privado',
  PUBLICO = 'publico',
}

@Entity()
export class Inventario {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  nombre: string;

  @Column({
    type: 'simple-enum',
    enum: VisibilidadInventario,
    default: VisibilidadInventario.PRIVADO,
  })
  visibilidad: VisibilidadInventario;

  @Column({ default: true })
  activo: boolean;

  @Column({ default: false })
  modo_estricto: boolean;

  @ManyToOne(() => Usuario, { onDelete: 'CASCADE' })
  propietario: Usuario;

  @OneToMany(() => PermisoInventario, (permiso) => permiso.inventario)
  permisos: PermisoInventario[];

  @OneToMany(() => Producto, (producto) => producto.inventario)
  productos: Producto[];
}