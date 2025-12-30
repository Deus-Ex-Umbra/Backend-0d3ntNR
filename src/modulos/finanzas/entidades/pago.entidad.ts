import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, DeleteDateColumn } from 'typeorm';
import { PlanTratamiento } from '../../tratamientos/entidades/plan-tratamiento.entidad';
import { Cita } from '../../agenda/entidades/cita.entidad';
import { Usuario } from '../../usuarios/entidades/usuario.entidad';

@Entity()
export class Pago {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Usuario, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  usuario: Usuario;

  @Column()
  fecha: Date;

  @Column('decimal', { precision: 10, scale: 2 })
  monto: number;

  @Column()
  concepto: string;

  @ManyToOne(() => PlanTratamiento, (plan) => plan.pagos, { nullable: true, onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  plan_tratamiento: PlanTratamiento;

  @ManyToOne(() => Cita, { nullable: true, onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  cita: Cita;

  @DeleteDateColumn({ select: false })
  eliminado_en: Date;
}