import { NotaDiaria } from '../../notas/entidades/nota-diaria.entidad';
import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';

@Entity()
export class Usuario {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  nombre: string;

  @Column({ unique: true })
  correo: string;

  @Column()
  contrasena: string;

  @Column({ type: 'text', nullable: true })
  avatar: string;

  @OneToMany(() => NotaDiaria, (nota) => nota.usuario)
  notas: NotaDiaria[];
}