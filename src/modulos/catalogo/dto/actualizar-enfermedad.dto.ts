import { PartialType } from '@nestjs/swagger';
import { CrearEnfermedadDto } from './crear-enfermedad.dto';

export class ActualizarEnfermedadDto extends PartialType(CrearEnfermedadDto) {}