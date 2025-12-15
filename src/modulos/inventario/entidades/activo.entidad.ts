import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, CreateDateColumn, DeleteDateColumn } from 'typeorm';
import { Producto } from './producto.entidad';
import { Bitacora } from './bitacora.entidad';
import { ReservaActivo } from './reserva-activo.entidad';

export enum EstadoActivo {
  DISPONIBLE = 'disponible',
  EN_USO = 'en_uso',
  EN_MANTENIMIENTO = 'en_mantenimiento',
  DESECHADO = 'desechado',
  VENDIDO = 'vendido',
}

@Entity()
export class Activo {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  codigo_interno: string;

  @Column({ nullable: true })
  nro_serie: string;

  @Column({ nullable: true })
  nombre_asignado: string;

  @Column('decimal', { precision: 10, scale: 2 })
  costo_compra: number;

  @Column()
  fecha_compra: Date;

  @Column({ nullable: true })
  ubicacion: string;

  @Column({
    type: 'varchar',
    enum: EstadoActivo,
    default: EstadoActivo.DISPONIBLE,
  })
  estado: EstadoActivo;

  @ManyToOne(() => Producto, (producto) => producto.activos, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  producto: Producto;

  @OneToMany(() => Bitacora, (bitacora) => bitacora.activo)
  historial: Bitacora[];

  @OneToMany(() => ReservaActivo, (reserva) => reserva.activo)
  reservas: ReservaActivo[];

  @DeleteDateColumn({ nullable: true })
  eliminado_en?: Date | null;
}