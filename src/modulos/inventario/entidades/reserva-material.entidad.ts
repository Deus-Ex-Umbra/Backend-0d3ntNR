import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, Index } from 'typeorm';
import { Material } from './material.entidad';
import { Cita } from '../../agenda/entidades/cita.entidad';
import { PlanTratamiento } from '../../tratamientos/entidades/plan-tratamiento.entidad';
import { Usuario } from '../../usuarios/entidades/usuario.entidad';

export enum TipoReservaMaterial {
    CITA = 'cita',
    TRATAMIENTO_UNICA = 'tratamiento_unica', // Reserva única del tratamiento
    TRATAMIENTO_POR_CITA = 'tratamiento_por_cita', // Por cada cita del tratamiento
}

export enum EstadoReserva {
    PENDIENTE = 'pendiente',
    CONFIRMADA = 'confirmada', // Stock descontado
    CANCELADA = 'cancelada',
}

@Entity()
@Index(['material', 'estado'])
@Index(['cita'])
@Index(['plan_tratamiento'])
export class ReservaMaterial {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => Material, (material) => material.reservas, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
    material: Material;

    @ManyToOne(() => Cita, { nullable: true, onDelete: 'CASCADE' })
    cita: Cita;

    @ManyToOne(() => PlanTratamiento, { nullable: true, onDelete: 'CASCADE' })
    plan_tratamiento: PlanTratamiento;

    @Column({
        type: 'varchar',
        enum: TipoReservaMaterial,
    })
    tipo: TipoReservaMaterial;

    @Column('decimal', { precision: 10, scale: 2 })
    cantidad_reservada: number;

    @Column('decimal', { precision: 10, scale: 2, nullable: true })
    cantidad_confirmada: number;

    @Column({
        type: 'varchar',
        enum: EstadoReserva,
        default: EstadoReserva.PENDIENTE,
    })
    estado: EstadoReserva;

    @CreateDateColumn()
    fecha_reserva: Date;

    @Column({ nullable: true })
    fecha_confirmacion: Date;

    @ManyToOne(() => Usuario, { onDelete: 'SET NULL', nullable: true })
    usuario: Usuario;
}
