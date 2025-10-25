import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { Usuario } from '../../usuarios/entidades/usuario.entidad';

@Entity()
export class NotaDiaria {
  @PrimaryGeneratedColumn()
  id: number;

  @CreateDateColumn()
  fecha: Date;
  
  @Column('text')
  contenido: string;

  @ManyToOne(() => Usuario, (usuario) => usuario.notas)
  usuario: Usuario;
}