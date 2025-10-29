import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany } from 'typeorm';
import { Inventario } from './inventario.entidad';
import { Lote } from './lote.entidad';
import { Activo } from './activo.entidad';

export enum TipoGestion {
  CONSUMIBLE = 'consumible',
  ACTIVO_SERIALIZADO = 'activo_serializado',
  ACTIVO_GENERAL = 'activo_general',
}

@Entity()
export class Producto {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  nombre: string;

  @Column({
    type: 'simple-enum',
    enum: TipoGestion,
  })
  tipo_gestion: TipoGestion;

  @Column({ default: 0 })
  stock_minimo: number;

  @Column({ default: 'unidad' })
  unidad_medida: string;

  @Column({ default: true })
  activo: boolean;

  @ManyToOne(() => Inventario, (inventario) => inventario.productos, { onDelete: 'CASCADE' })
  inventario: Inventario;

  @OneToMany(() => Lote, (lote) => lote.producto)
  lotes: Lote[];

  @OneToMany(() => Activo, (activo) => activo.producto)
  activos: Activo[];
}