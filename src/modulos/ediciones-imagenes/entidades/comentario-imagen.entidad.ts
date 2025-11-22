import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { EdicionImagen } from './edicion-imagen.entidad';
import { Usuario } from '../../usuarios/entidades/usuario.entidad';

@Entity()
export class ComentarioImagen {
    @PrimaryGeneratedColumn()
    id: number;

    @Column('float')
    x: number;

    @Column('float')
    y: number;

    @Column()
    titulo: string;

    @Column('text')
    contenido: string;

    @Column({ default: '#FF0000' })
    color: string;

    @CreateDateColumn()
    fecha_creacion: Date;

    @ManyToOne(() => EdicionImagen, (edicion) => edicion.comentarios, { onDelete: 'CASCADE' })
    edicion: EdicionImagen;

    @ManyToOne(() => Usuario, { onDelete: 'CASCADE' })
    usuario: Usuario;
}
