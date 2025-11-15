import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { Activo } from './activo.entidad';
import { Cita } from '../../agenda/entidades/cita.entidad';

@Entity()
export class PromesaUsoActivo {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Activo, { onDelete: 'CASCADE' })
  activo: Activo;

  @ManyToOne(() => Cita, { onDelete: 'CASCADE' })
  cita: Cita;

  @Column()
  fecha_hora_inicio: Date;

  @Column()
  fecha_hora_fin: Date;

  @CreateDateColumn()
  fecha_creacion: Date;
}
