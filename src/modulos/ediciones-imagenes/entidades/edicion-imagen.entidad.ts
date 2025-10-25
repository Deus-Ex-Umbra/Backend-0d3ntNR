import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { ArchivoAdjunto } from '../../archivos-adjuntos/entidades/archivo-adjunto.entidad';
import { Usuario } from '../../usuarios/entidades/usuario.entidad';

@Entity()
export class EdicionImagen {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => ArchivoAdjunto, { onDelete: 'CASCADE' })
  archivo_original: ArchivoAdjunto;

  @Column({ nullable: true })
  nombre: string;

  @Column({ nullable: true })
  descripcion: string;

  @Column('simple-json')
  datos_canvas: object;

  @Column()
  version: number;

  @ManyToOne(() => EdicionImagen, { nullable: true, onDelete: 'SET NULL' })
  edicion_padre: EdicionImagen | null;

  @Column('text')
  imagen_resultado_base64: string;

  @CreateDateColumn()
  fecha_creacion: Date;

  @ManyToOne(() => Usuario)
  usuario: Usuario;
}