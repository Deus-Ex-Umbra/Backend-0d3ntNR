import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Usuario } from '../../usuarios/entidades/usuario.entidad';

@Entity()
export class ConfiguracionClinica {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'text', nullable: true })
    logo: string;

    @Column({ nullable: true })
    logo_enlace: string;

    @Column({ nullable: true })
    nombre_clinica: string;

    @Column({ default: 'Bienvenido,' })
    mensaje_bienvenida_antes: string;

    @Column({ default: '¿qué haremos hoy?' })
    mensaje_bienvenida_despues: string;

    @Column({ type: 'text', nullable: true })
    tema_personalizado: string;

    @ManyToOne(() => Usuario)
    @JoinColumn({ name: 'usuario_id' })
    usuario: Usuario;

    @Column()
    usuario_id: number;

    @CreateDateColumn()
    fecha_creacion: Date;

    @UpdateDateColumn()
    fecha_actualizacion: Date;
}
