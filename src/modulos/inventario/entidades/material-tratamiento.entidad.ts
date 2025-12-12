import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { PlanTratamiento } from '../../tratamientos/entidades/plan-tratamiento.entidad';
import { Producto } from './producto.entidad';

export enum TipoMaterialTratamiento {
  UNICO = 'unico', // Solo consumibles, confirmado al finalizar tratamiento
  POR_CITA = 'por_cita', // Consumibles + activos, por cada cita del tratamiento
}

@Entity()
export class MaterialTratamiento {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => PlanTratamiento, { onDelete: 'CASCADE' })
  plan_tratamiento: PlanTratamiento;

  @ManyToOne(() => Producto, { onDelete: 'CASCADE' })
  producto: Producto;

  @Column({
    type: 'varchar',
    enum: TipoMaterialTratamiento,
  })
  tipo: TipoMaterialTratamiento;

  @Column('decimal', { precision: 10, scale: 2 })
  cantidad_planeada: number;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  cantidad_usada: number;

  @Column({ default: false })
  confirmado: boolean;
}