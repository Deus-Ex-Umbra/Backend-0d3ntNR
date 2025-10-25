import { PartialType } from '@nestjs/swagger';
import { CrearEdicionDto } from './crear-edicion.dto';

export class ActualizarEdicionDto extends PartialType(CrearEdicionDto) {}