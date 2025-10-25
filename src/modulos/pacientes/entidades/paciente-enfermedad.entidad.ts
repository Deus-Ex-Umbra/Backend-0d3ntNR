import { Entity, PrimaryGeneratedColumn, ManyToOne } from 'typeorm';
import { Paciente } from './paciente.entidad';
import { Enfermedad } from '../../catalogo/entidades/enfermedad.entidad';

@Entity()
export class PacienteEnfermedad {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Paciente, (paciente) => paciente.paciente_enfermedades, { onDelete: 'CASCADE' })
  paciente: Paciente;

  @ManyToOne(() => Enfermedad)
  enfermedad: Enfermedad;
}