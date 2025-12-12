import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, Index } from 'typeorm';
import { Activo } from './activo.entidad';
import { Cita } from '../../agenda/entidades/cita.entidad';
import { PlanTratamiento } from '../../tratamientos/entidades/plan-tratamiento.entidad';
import { Usuario } from '../../usuarios/entidades/usuario.entidad';
import { EstadoReserva } from './reserva-material.entidad';

@Entity()
@Index(['activo', 'fecha_hora_inicio', 'fecha_hora_fin'])
@Index(['activo', 'estado'])
@Index(['cita'])
@Index(['plan_tratamiento'])
export class ReservaActivo {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => Activo, (activo) => activo.reservas, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
    activo: Activo;

    @ManyToOne(() => Cita, { nullable: true, onDelete: 'CASCADE' })
    cita: Cita;

    @ManyToOne(() => PlanTratamiento, { nullable: true, onDelete: 'CASCADE' })
    plan_tratamiento: PlanTratamiento;

    @Column()
    fecha_hora_inicio: Date;

    @Column()
    fecha_hora_fin: Date;

    @Column({
        type: 'varchar',
        enum: EstadoReserva,
        default: EstadoReserva.PENDIENTE,
    })
    estado: EstadoReserva;

    @CreateDateColumn()
    fecha_reserva: Date;

    @ManyToOne(() => Usuario, { onDelete: 'SET NULL', nullable: true })
    usuario: Usuario;
}
