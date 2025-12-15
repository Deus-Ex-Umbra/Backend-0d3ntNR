import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { PlanTratamiento } from '../../tratamientos/entidades/plan-tratamiento.entidad';
import { Producto } from './producto.entidad';
import { MomentoConfirmacion } from '../../tratamientos/entidades/material-plantilla.entidad';

export enum TipoMaterialTratamiento {
  UNICO = 'unico',
  POR_CITA = 'por_cita',
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

  @Column({
    type: 'varchar',
    enum: MomentoConfirmacion,
    nullable: true,
  })
  momento_confirmacion: MomentoConfirmacion;
}
