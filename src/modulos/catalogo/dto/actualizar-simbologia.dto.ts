import { PartialType } from '@nestjs/swagger';
import { CrearSimbologiaDto } from './crear-simbologia.dto';

export class ActualizarSimbologiaDto extends PartialType(CrearSimbologiaDto) {}
