import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { Producto } from './producto.entidad';
import { Usuario } from '../../usuarios/entidades/usuario.entidad';
import { Inventario } from './inventario.entidad';

export enum TipoMovimiento {
  // Movimientos de stock
  COMPRA = 'compra',
  AJUSTE = 'ajuste',
  USO_CITA = 'uso_cita',
  USO_TRATAMIENTO = 'uso_tratamiento',
  DEVOLUCION = 'devolucion',
  ENTRADA = 'entrada',
  SALIDA = 'salida',
  
  // Auditoría de productos
  PRODUCTO_CREADO = 'producto_creado',
  PRODUCTO_EDITADO = 'producto_editado',
  PRODUCTO_ELIMINADO = 'producto_eliminado',
  
  // Auditoría de lotes
  LOTE_CREADO = 'lote_creado',
  LOTE_ELIMINADO = 'lote_eliminado',
  
  // Auditoría de activos
  ACTIVO_CREADO = 'activo_creado',
  ACTIVO_EDITADO = 'activo_editado',
  ACTIVO_ELIMINADO = 'activo_eliminado',
  ACTIVO_CAMBIO_ESTADO = 'activo_cambio_estado',
  ACTIVO_VENDIDO = 'activo_vendido',
}

@Entity()
export class MovimientoInventario {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Inventario, { onDelete: 'CASCADE' })
  inventario: Inventario;

  @ManyToOne(() => Producto, { onDelete: 'SET NULL', nullable: true })
  producto: Producto;

  @Column({
    type: 'simple-enum',
    enum: TipoMovimiento,
  })
  tipo: TipoMovimiento;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  cantidad: number;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  stock_anterior: number;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  stock_nuevo: number;

  @Column({ nullable: true })
  referencia: string;

  @Column({ type: 'text', nullable: true })
  observaciones: string;

  @Column({ type: 'text', nullable: true })
  datos_anteriores: string; // JSON con datos previos para auditoría

  @Column({ type: 'text', nullable: true })
  datos_nuevos: string; // JSON con datos nuevos para auditoría

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  costo_total: number;

  @CreateDateColumn()
  fecha: Date;

  @ManyToOne(() => Usuario, { onDelete: 'SET NULL', nullable: true })
  usuario: Usuario;
}