import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Usuario } from '../../usuarios/entidades/usuario.entidad';

@Entity()
export class Egreso {
  @PrimaryGeneratedColumn()
  id: number;
  
  @ManyToOne(() => Usuario, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  usuario: Usuario;

  @Column()
  concepto: string;

  @Column()
  fecha: Date;

  @Column('decimal', { precision: 10, scale: 2 })
  monto: number;
}