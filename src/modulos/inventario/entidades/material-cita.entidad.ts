import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Cita } from '../../agenda/entidades/cita.entidad';
import { Producto } from './producto.entidad';
import { Material } from './material.entidad';
import { Activo } from './activo.entidad';

@Entity()
export class MaterialCita {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Cita, { onDelete: 'CASCADE' })
  cita: Cita;

  @ManyToOne(() => Producto, { onDelete: 'CASCADE' })
  producto: Producto;

  @ManyToOne(() => Material, { nullable: true, onDelete: 'SET NULL' })
  material_especifico: Material;

  @ManyToOne(() => Activo, { nullable: true, onDelete: 'SET NULL' })
  activo_especifico: Activo;

  @Column('decimal', { precision: 10, scale: 2 })
  cantidad_planeada: number;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  cantidad_usada: number;

  @Column({ default: false })
  confirmado: boolean;
}