import { Entity, PrimaryGeneratedColumn, Column, OneToMany, ManyToOne } from 'typeorm';
import { PlanTratamiento } from '../../tratamientos/entidades/plan-tratamiento.entidad';
import { ArchivoAdjunto } from '../../archivos-adjuntos/entidades/archivo-adjunto.entidad';
import { PacienteAlergia } from './paciente-alergia.entidad';
import { PacienteEnfermedad } from './paciente-enfermedad.entidad';
import { PacienteMedicamento } from './paciente-medicamento.entidad';
import { Usuario } from '../../usuarios/entidades/usuario.entidad';

@Entity()
export class Paciente {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Usuario, { onDelete: 'CASCADE' })
  usuario: Usuario;

  @Column()
  nombre: string;

  @Column()
  apellidos: string;

  @Column({ nullable: true })
  telefono: string;

  @Column({ nullable: true })
  correo: string;

  @Column({ nullable: true })
  direccion: string;
  
  @Column('text', { nullable: true })
  notas_generales: string;

  @Column('text', { nullable: true })
  notas_medicas: string;

  @Column({ nullable: true })
  color_categoria: string;

  @OneToMany(() => PlanTratamiento, (plan) => plan.paciente)
  planes_tratamiento: PlanTratamiento[];

  @OneToMany(() => ArchivoAdjunto, (archivo) => archivo.paciente)
  archivos_adjuntos: ArchivoAdjunto[];

  @OneToMany(() => PacienteAlergia, (pa) => pa.paciente, { cascade: true })
  paciente_alergias: PacienteAlergia[];

  @OneToMany(() => PacienteEnfermedad, (pe) => pe.paciente, { cascade: true })
  paciente_enfermedades: PacienteEnfermedad[];

  @OneToMany(() => PacienteMedicamento, (pm) => pm.paciente, { cascade: true })
  paciente_medicamentos: PacienteMedicamento[];
}