import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany } from 'typeorm';
import { Paciente } from '../../pacientes/entidades/paciente.entidad';
import { Tratamiento } from './tratamiento.entidad';
import { Cita } from '../../agenda/entidades/cita.entidad';
import { Pago } from '../../finanzas/entidades/pago.entidad';
import { ArchivoAdjunto } from '../../archivos-adjuntos/entidades/archivo-adjunto.entidad';
import { Usuario } from '../../usuarios/entidades/usuario.entidad';

@Entity()
export class PlanTratamiento {
  @PrimaryGeneratedColumn()
  id: number;
  
  @ManyToOne(() => Usuario, { onDelete: 'CASCADE' })
  usuario: Usuario;

  @ManyToOne(() => Paciente, (paciente) => paciente.planes_tratamiento, { onDelete: 'CASCADE' })
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