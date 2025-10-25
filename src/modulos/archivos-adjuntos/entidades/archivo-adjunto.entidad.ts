import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { Paciente } from '../../pacientes/entidades/paciente.entidad';
import { PlanTratamiento } from '../../tratamientos/entidades/plan-tratamiento.entidad';

@Entity()
export class ArchivoAdjunto {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  nombre_archivo: string;

  @Column()
  tipo_mime: string;

  @Column({ nullable: true })
  descripcion: string;

  @Column('text')
  contenido_base64: string;

  @CreateDateColumn()
  fecha_subida: Date;

  @ManyToOne(() => Paciente, (paciente) => paciente.archivos_adjuntos, { onDelete: 'CASCADE' })
  paciente: Paciente;

  @ManyToOne(() => PlanTratamiento, (plan) => plan.archivos_adjuntos, { nullable: true, onDelete: 'SET NULL' })
  plan_tratamiento: PlanTratamiento | null;
}

