import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { Producto } from './producto.entidad';
import { Usuario } from '../../usuarios/entidades/usuario.entidad';

export enum TipoMovimiento {
  COMPRA = 'compra',
  AJUSTE = 'ajuste',
  USO_CITA = 'uso_cita',
  USO_TRATAMIENTO = 'uso_tratamiento',
  DEVOLUCION = 'devolucion',
  ENTRADA = 'entrada',
  SALIDA = 'salida',
}

@Entity()
export class MovimientoInventario {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Producto, { onDelete: 'CASCADE' })
  producto: Producto;

  @Column({
    type: 'simple-enum',
    enum: TipoMovimiento,
  })
  tipo: TipoMovimiento;

  @Column('decimal', { precision: 10, scale: 2 })
  cantidad: number;

  @Column('decimal', { precision: 10, scale: 2 })
  stock_anterior: number;

  @Column('decimal', { precision: 10, scale: 2 })
  stock_nuevo: number;

  @Column({ nullable: true })
  referencia: string;

  @Column('text', { nullable: true })
  observaciones: string;

  @CreateDateColumn()
  fecha: Date;

  @ManyToOne(() => Usuario, { onDelete: 'CASCADE' })
  usuario: Usuario;
}