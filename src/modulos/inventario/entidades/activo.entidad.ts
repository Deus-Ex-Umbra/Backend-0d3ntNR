import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany } from 'typeorm';
import { Producto } from './producto.entidad';
import { ActivoHistorial } from './activo-historial.entidad';

export enum EstadoActivo {
  DISPONIBLE = 'disponible',
  EN_USO = 'en_uso',
  EN_MANTENIMIENTO = 'en_mantenimiento',
  ROTO = 'roto',
  DESECHADO = 'desechado',
}

@Entity()
export class Activo {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  nro_serie: string;

  @Column({ nullable: true })
  nombre_asignado: string;

  @Column('decimal', { precision: 10, scale: 2 })
  costo_compra: number;

  @Column({ type: 'date' })
  fecha_compra: Date;
  
  @Column({ nullable: true })
  ubicacion: string;

  @Column({
    type: 'simple-enum',
    enum: EstadoActivo,
    default: EstadoActivo.DISPONIBLE,
  })
  estado: EstadoActivo;

  @ManyToOne(() => Producto, (producto) => producto.activos, { onDelete: 'CASCADE' })
  producto: Producto;

  @OneToMany(() => ActivoHistorial, (historial) => historial.activo)
  historial: ActivoHistorial[];
}