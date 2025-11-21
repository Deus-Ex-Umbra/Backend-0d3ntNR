import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { Producto } from './producto.entidad';
import { Usuario } from '../../usuarios/entidades/usuario.entidad';
import { Inventario } from './inventario.entidad';
import { Lote } from './lote.entidad';
import { Activo } from './activo.entidad';

export enum TipoMovimiento {
  ENTRADA_LOTE = 'entrada_lote',
  ENTRADA_SERIE = 'entrada_serie',
  ENTRADA_GENERAL = 'entrada_general',
  SALIDA_LOTE = 'salida_lote',
  SALIDA_SERIE = 'salida_serie',
  SALIDA_GENERAL = 'salida_general',
  COMPRA = 'compra',
  AJUSTE = 'ajuste',
  USO_CITA = 'uso_cita',
  USO_TRATAMIENTO = 'uso_tratamiento',
  DEVOLUCION = 'devolucion',
  PRODUCTO_CREADO = 'producto_creado',
  PRODUCTO_EDITADO = 'producto_editado',
  PRODUCTO_ELIMINADO = 'producto_eliminado',
  LOTE_CREADO = 'lote_creado',
  LOTE_EDITADO = 'lote_editado',
  LOTE_ELIMINADO = 'lote_eliminado',
  SERIE_CREADA = 'serie_creada',
  SERIE_EDITADA = 'serie_editada',
  SERIE_ELIMINADA = 'serie_eliminada',
  GENERAL_CREADO = 'general_creado',
  GENERAL_EDITADO = 'general_editado',
  GENERAL_ELIMINADO = 'general_eliminado',
  ACTIVO_CAMBIO_ESTADO = 'activo_cambio_estado',
  ACTIVO_VENDIDO = 'activo_vendido',
}

export enum CategoriaMovimiento {
  ENTRADA_STOCK = 'entrada_stock',
  SALIDA_STOCK = 'salida_stock',
  AUDITORIA_PRODUCTO = 'auditoria_producto',
  AUDITORIA_LOTE = 'auditoria_lote',
  AUDITORIA_SERIE = 'auditoria_serie',
  AUDITORIA_GENERAL = 'auditoria_general',
}

@Entity()
export class MovimientoInventario {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Inventario, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  inventario: Inventario;

  @ManyToOne(() => Producto, { onDelete: 'CASCADE', onUpdate: 'CASCADE', nullable: true })
  producto: Producto;

  @ManyToOne(() => Lote, { onDelete: 'CASCADE', onUpdate: 'CASCADE', nullable: true })
  lote: Lote;

  @ManyToOne(() => Activo, { onDelete: 'CASCADE', onUpdate: 'CASCADE', nullable: true })
  activo: Activo;

  @Column({
    enum: TipoMovimiento,
  })
  tipo: TipoMovimiento;

  @Column({
    enum: CategoriaMovimiento,
    nullable: true,
  })
  categoria: CategoriaMovimiento;

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
  datos_anteriores: string;

  @Column({ type: 'text', nullable: true })
  datos_nuevos: string;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  costo_total: number;

  @CreateDateColumn()
  fecha: Date;

  @ManyToOne(() => Usuario, { onDelete: 'CASCADE', onUpdate: 'CASCADE', nullable: true })
  usuario: Usuario;
}