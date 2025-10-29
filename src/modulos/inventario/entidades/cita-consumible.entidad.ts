import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Cita } from '../../agenda/entidades/cita.entidad';
import { Lote } from './lote.entidad';

@Entity()
export class CitaConsumible {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('decimal', { precision: 10, scale: 2 })
  cantidad_usada: number;

  @ManyToOne(() => Cita, { onDelete: 'CASCADE' })
  cita: Cita;

  @ManyToOne(() => Lote, (lote) => lote.citas_consumibles, { onDelete: 'CASCADE' })
  lote: Lote;
}