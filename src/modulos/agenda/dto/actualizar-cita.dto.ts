import { PartialType } from '@nestjs/swagger';
import { CrearCitaDto } from './crear-cita.dto';

export class ActualizarCitaDto extends PartialType(CrearCitaDto) {}