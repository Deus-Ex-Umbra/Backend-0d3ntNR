import { PartialType } from '@nestjs/swagger';
import { CrearTratamientoDto } from './crear-tratamiento.dto';

export class ActualizarTratamientoDto extends PartialType(CrearTratamientoDto) {}