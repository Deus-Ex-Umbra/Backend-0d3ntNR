import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany } from 'typeorm';
import { Producto } from './producto.entidad';
import { CitaConsumible } from './cita-consumible.entidad';
import { PromesaUsoLote } from './promesa-uso-lote.entidad';

@Entity()
export class Lote {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  nro_lote: string;

  @Column({ nullable: true })
  fecha_vencimiento: Date;

  @Column('decimal', { precision: 10, scale: 2 })
  cantidad_actual: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  cantidad_reservada: number;

  @Column('decimal', { precision: 10, scale: 2 })
  costo_unitario_compra: number;

  @Column({ default: true })
  activo: boolean;

  @ManyToOne(() => Producto, (producto) => producto.lotes, { onDelete: 'CASCADE' })
  producto: Producto;

  @OneToMany(() => CitaConsumible, (cc) => cc.lote)
  citas_consumibles: CitaConsumible[];

  @OneToMany(() => PromesaUsoLote, (promesa) => promesa.lote)
  promesas_uso: PromesaUsoLote[];
}