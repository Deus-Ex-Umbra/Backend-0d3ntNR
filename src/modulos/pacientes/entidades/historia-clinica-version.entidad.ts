import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Paciente } from './paciente.entidad';
import { Usuario } from '../../usuarios/entidades/usuario.entidad';

@Entity()
export class HistoriaClinicaVersion {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Paciente, (paciente) => paciente.historias_clinicas, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  paciente: Paciente;

  @ManyToOne(() => Usuario, { onDelete: 'SET NULL', nullable: true })
  usuario: Usuario;

  @Column()
  nombre: string;

  @Column({ type: 'int' })
  numero_version: number;

  @Column('text', { nullable: true })
  contenido_html: string;

  @Column('json', { nullable: true })
  config: any;

  @Column({ default: false })
  finalizada: boolean;

  @CreateDateColumn({ type: 'timestamp' })
  creado_en: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  actualizado_en: Date;
}
