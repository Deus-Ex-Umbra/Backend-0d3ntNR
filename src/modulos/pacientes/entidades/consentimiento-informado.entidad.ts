import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { Paciente } from './paciente.entidad';
import { Usuario } from '../../usuarios/entidades/usuario.entidad';

@Entity('consentimientos_informados')
export class ConsentimientoInformado {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Paciente, { onDelete: 'CASCADE' })
  paciente: Paciente;

  @ManyToOne(() => Usuario, { onDelete: 'CASCADE' })
  usuario: Usuario;

  @Column()
  nombre: string;

  @Column({ type: 'text' })
  contenido_html: string;

  @Column()
  ruta_archivo: string;

  @CreateDateColumn()
  fecha_creacion: Date;
}
