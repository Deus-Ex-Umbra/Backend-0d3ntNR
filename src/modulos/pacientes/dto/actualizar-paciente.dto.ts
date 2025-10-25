import { PartialType } from '@nestjs/swagger';
import { CrearPacienteDto } from './crear-paciente.dto';

export class ActualizarPacienteDto extends PartialType(CrearPacienteDto) {}