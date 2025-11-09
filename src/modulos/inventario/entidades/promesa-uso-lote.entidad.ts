import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { Lote } from './lote.entidad';
import { Cita } from '../../agenda/entidades/cita.entidad';

@Entity()
export class PromesaUsoLote {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Lote, { onDelete: 'CASCADE' })
  lote: Lote;

  @ManyToOne(() => Cita, { onDelete: 'CASCADE' })
  cita: Cita;

  @Column('decimal', { precision: 10, scale: 2 })
  cantidad_reservada: number;

  @CreateDateColumn()
  fecha_creacion: Date;
}
