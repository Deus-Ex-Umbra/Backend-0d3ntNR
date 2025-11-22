import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, DeleteDateColumn, OneToMany } from 'typeorm';
import { ArchivoAdjunto } from '../../archivos-adjuntos/entidades/archivo-adjunto.entidad';
import { Usuario } from '../../usuarios/entidades/usuario.entidad';
import { ComentarioImagen } from './comentario-imagen.entidad';

@Entity()
export class EdicionImagen {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => ArchivoAdjunto, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  archivo_original: ArchivoAdjunto;

  @Column({ nullable: true })
  nombre: string;

  @Column({ nullable: true })
  descripcion: string;

  @Column('simple-json')
  datos_canvas: object;

  @Column()
  version: number;

  @ManyToOne(() => EdicionImagen, { nullable: true, onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  edicion_padre: EdicionImagen | null;

  @Column({ type: 'text' })
  ruta_imagen_resultado: string;

  @CreateDateColumn()
  fecha_creacion: Date;

  @DeleteDateColumn({ nullable: true })
  eliminado_en?: Date | null;

  @ManyToOne(() => Usuario, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  usuario: Usuario;

  @OneToMany(() => ComentarioImagen, (comentario) => comentario.edicion)
  comentarios: ComentarioImagen[];
}