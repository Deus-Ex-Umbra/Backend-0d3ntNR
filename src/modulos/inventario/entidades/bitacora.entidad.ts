import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, Index } from 'typeorm';
import { Inventario } from './inventario.entidad';
import { Activo, EstadoActivo } from './activo.entidad';
import { Usuario } from '../../usuarios/entidades/usuario.entidad';

@Entity()
@Index(['inventario', 'fecha'])
@Index(['activo', 'fecha'])
export class Bitacora {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => Inventario, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
    inventario: Inventario;

    @ManyToOne(() => Activo, (activo) => activo.historial, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
    activo: Activo;

    @Column({
        type: 'varchar',
        enum: EstadoActivo,
    })
    estado_anterior: EstadoActivo;

    @Column({
        type: 'varchar',
        enum: EstadoActivo,
    })
    estado_nuevo: EstadoActivo;

    @Column({ nullable: true })
    referencia_tipo: string;

    @Column({ nullable: true })
    referencia_id: number;

    @Column({ type: 'text', nullable: true })
    motivo: string;

    @CreateDateColumn()
    fecha: Date;

    @ManyToOne(() => Usuario, { onDelete: 'SET NULL', nullable: true })
    usuario: Usuario;
}
