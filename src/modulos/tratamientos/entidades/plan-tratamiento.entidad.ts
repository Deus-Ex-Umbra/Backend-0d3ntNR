import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, DeleteDateColumn } from 'typeorm';
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
  
  @ManyToOne(() => Usuario, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  usuario: Usuario;

  @ManyToOne(() => Paciente, (paciente) => paciente.planes_tratamiento, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  paciente: Paciente;

  @ManyToOne(() => Tratamiento, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  tratamiento: Tratamiento;

  @Column('decimal', { precision: 10, scale: 2 })
  costo_total: number;

  @Column('decimal', { precision: 10, scale: 2 })
  total_abonado: number;

  @Column({ default: false })
  materiales_inicio_confirmados: boolean;

  @Column({ default: false })
  materiales_finales_confirmados: boolean;

  @Column({ default: false })
  finalizado: boolean;

  @OneToMany(() => Cita, (cita) => cita.plan_tratamiento)
  citas: Cita[];
  
  @OneToMany(() => Pago, (pago) => pago.plan_tratamiento)
  pagos: Pago[];

  @OneToMany(() => ArchivoAdjunto, (archivo) => archivo.plan_tratamiento)
  archivos_adjuntos: ArchivoAdjunto[];

  @DeleteDateColumn({ nullable: true })
  eliminado_en?: Date | null;
}