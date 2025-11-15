import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { Usuario } from '../../usuarios/entidades/usuario.entidad';

@Entity('reportes')
export class Reporte {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Usuario, { onDelete: 'CASCADE' })
  usuario: Usuario;

  @Column()
  nombre: string;

  @Column({ type: 'text' })
  areas: string;

  @Column({ nullable: true })
  fecha_inicio: Date;

  @Column({ nullable: true })
  fecha_fin: Date;

  @Column()
  ruta_archivo: string;

  @Column({ type: 'text', nullable: true })
  analisis_gemini: string;

  @CreateDateColumn()
  fecha_creacion: Date;
}
