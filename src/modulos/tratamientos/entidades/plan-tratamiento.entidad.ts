import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany } from 'typeorm';
import { Paciente } from '../../pacientes/entidades/paciente.entidad';
import { Tratamiento } from './tratamiento.entidad';
import { Cita } from '../../agenda/entidades/cita.entidad';
import { Pago } from '../../finanzas/entidades/pago.entidad';
import { ArchivoAdjunto } from '../../archivos-adjuntos/entidades/archivo-adjunto.entidad';

@Entity()
export class PlanTratamiento {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Paciente, (paciente) => paciente.planes_tratamiento)
  paciente: Paciente;

  @ManyToOne(() => Tratamiento)
  tratamiento: Tratamiento;

  @Column('decimal', { precision: 10, scale: 2 })
  costo_total: number;

  @Column('decimal', { precision: 10, scale: 2 })
  total_abonado: number;

  @OneToMany(() => Cita, (cita) => cita.plan_tratamiento)
  citas: Cita[];
  
  @OneToMany(() => Pago, (pago) => pago.plan_tratamiento)
  pagos: Pago[];

  @OneToMany(() => ArchivoAdjunto, (archivo) => archivo.plan_tratamiento)
  archivos_adjuntos: ArchivoAdjunto[];
}
