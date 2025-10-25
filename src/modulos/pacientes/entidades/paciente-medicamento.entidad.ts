import { Entity, PrimaryGeneratedColumn, ManyToOne } from 'typeorm';
import { Paciente } from './paciente.entidad';
import { Medicamento } from '../../catalogo/entidades/medicamento.entidad';

@Entity()
export class PacienteMedicamento {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Paciente, (paciente) => paciente.paciente_medicamentos, { onDelete: 'CASCADE' })
  paciente: Paciente;

  @ManyToOne(() => Medicamento)
  medicamento: Medicamento;
}