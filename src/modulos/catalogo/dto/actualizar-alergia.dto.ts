import { PartialType } from '@nestjs/swagger';
import { CrearAlergiaDto } from './crear-alergia.dto';

export class ActualizarAlergiaDto extends PartialType(CrearAlergiaDto) {}