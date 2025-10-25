import { Entity, PrimaryGeneratedColumn, ManyToOne } from 'typeorm';
import { Paciente } from './paciente.entidad';
import { Alergia } from '../../catalogo/entidades/alergia.entidad';

@Entity()
export class PacienteAlergia {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Paciente, (paciente) => paciente.paciente_alergias, { onDelete: 'CASCADE' })
  paciente: Paciente;

  @ManyToOne(() => Alergia)
  alergia: Alergia;
}