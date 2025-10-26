import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { Paciente } from '../../pacientes/entidades/paciente.entidad';
import { Usuario } from '../../usuarios/entidades/usuario.entidad';

export type EtapaDental = 'Infantil' | 'Mixta' | 'Adulto';

@Entity()
export class Odontograma {
  @PrimaryGeneratedColumn()
  id: number;
  
  @ManyToOne(() => Usuario, { onDelete: 'CASCADE' })
  usuario: Usuario;

  @ManyToOne(() => Paciente, (paciente) => paciente.odontogramas, { onDelete: 'CASCADE' })
  paciente: Paciente;

  @Column({
    type: 'simple-enum',
    enum: ['Infantil', 'Mixta', 'Adulto'],
    default: 'Adulto',
  })
  etapa_dental: EtapaDental;

  @Column('simple-json')
  datos: object;

  @CreateDateColumn()
  fecha_creacion: Date;
}