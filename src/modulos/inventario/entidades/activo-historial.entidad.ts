import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { Activo } from './activo.entidad';
import { Usuario } from '../../usuarios/entidades/usuario.entidad';
import { EstadoActivo } from './activo.entidad';

@Entity()
export class ActivoHistorial {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    enum: EstadoActivo,
  })
  estado_anterior: EstadoActivo;

  @Column({
    enum: EstadoActivo,
  })
  estado_nuevo: EstadoActivo;

  @CreateDateColumn()
  fecha: Date;

  @ManyToOne(() => Activo, (activo) => activo.historial, { onDelete: 'CASCADE' })
  activo: Activo;

  @ManyToOne(() => Usuario, { onDelete: 'CASCADE' })
  usuario: Usuario;
}