import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, DeleteDateColumn } from 'typeorm';
import { Inventario } from './inventario.entidad';
import { Material } from './material.entidad';
import { Activo } from './activo.entidad';

// Tipos principales de producto
export enum TipoProducto {
  MATERIAL = 'material',
  ACTIVO_FIJO = 'activo_fijo',
}

// Subtipos para Material (consumibles)
export enum SubtipoMaterial {
  CON_LOTE_VENCIMIENTO = 'con_lote_vencimiento', // Fármacos, medicamentos
  CON_SERIE = 'con_serie', // Implantes
  SIN_LOTE = 'sin_lote', // Papel toalla, guantes, etc.
}

// Subtipos para Activo Fijo
export enum SubtipoActivoFijo {
  INSTRUMENTAL = 'instrumental', // Ciclo de vida rápido
  MOBILIARIO_EQUIPO = 'mobiliario_equipo', // Ciclo de vida lento
}

@Entity()
export class Producto {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  nombre: string;

  @Column({
    type: 'varchar',
    enum: TipoProducto,
  })
  tipo: TipoProducto;

  @Column({
    type: 'varchar',
    enum: SubtipoMaterial,
    nullable: true,
  })
  subtipo_material: SubtipoMaterial;

  @Column({
    type: 'varchar',
    enum: SubtipoActivoFijo,
    nullable: true,
  })
  subtipo_activo_fijo: SubtipoActivoFijo;

  @Column({ default: 0 })
  stock_minimo: number;

  @Column({ default: 'unidad' })
  unidad_medida: string;

  @Column({ type: 'text', nullable: true })
  descripcion: string;

  @Column({ default: true })
  notificar_stock_bajo: boolean;

  @Column({ default: true })
  activo: boolean;

  @ManyToOne(() => Inventario, (inventario) => inventario.productos, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  inventario: Inventario;

  @OneToMany(() => Material, (material) => material.producto)
  materiales: Material[];

  @OneToMany(() => Activo, (activo) => activo.producto)
  activos: Activo[];

  @DeleteDateColumn({ nullable: true })
  eliminado_en?: Date | null;
}