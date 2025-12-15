import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Tratamiento } from './tratamiento.entidad';
import { Producto } from '../../inventario/entidades/producto.entidad';

export enum TipoMaterialPlantilla {
  GENERAL = 'general',
  POR_CITA = 'por_cita',
}

export enum MomentoConfirmacion {
  PRIMERA_CITA = 'primera_cita',
  FIN_TRATAMIENTO = 'fin_tratamiento',
}

@Entity()
export class MaterialPlantilla {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Tratamiento, { onDelete: 'CASCADE' })
  tratamiento: Tratamiento;

  @ManyToOne(() => Producto, { onDelete: 'CASCADE' })
  producto: Producto;

  @Column({
    enum: TipoMaterialPlantilla,
  })
  tipo: TipoMaterialPlantilla;

  @Column('decimal', { precision: 10, scale: 2 })
  cantidad: number;

  @Column({
    type: 'varchar',
    enum: MomentoConfirmacion,
    nullable: true,
  })
  momento_confirmacion: MomentoConfirmacion;
}

