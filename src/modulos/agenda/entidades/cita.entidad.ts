import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, DeleteDateColumn, OneToMany } from 'typeorm';
import { Paciente } from '../../pacientes/entidades/paciente.entidad';
import { PlanTratamiento } from '../../tratamientos/entidades/plan-tratamiento.entidad';
import { Usuario } from '../../usuarios/entidades/usuario.entidad';
import { ReservaMaterial } from '../../inventario/entidades/reserva-material.entidad';

@Entity()
export class Cita {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Usuario, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  usuario: Usuario;

  @Column()
  fecha: Date;

  @Column()
  descripcion: string;

  @Column({ nullable: true })
  estado_pago: string;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  monto_esperado: number;

  @Column({ default: 0 })
  horas_aproximadas: number;

  @Column({ default: 30 })
  minutos_aproximados: number;

  @Column({ default: false })
  materiales_confirmados: boolean;

  @ManyToOne(() => Paciente, { nullable: true, onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  paciente: Paciente;

  @ManyToOne(() => PlanTratamiento, (plan) => plan.citas, { nullable: true, onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  plan_tratamiento: PlanTratamiento;

  @OneToMany(() => ReservaMaterial, (reserva) => reserva.cita)
  reservas_materiales: ReservaMaterial[];

  @DeleteDateColumn({ nullable: true })
  eliminado_en?: Date | null;
}