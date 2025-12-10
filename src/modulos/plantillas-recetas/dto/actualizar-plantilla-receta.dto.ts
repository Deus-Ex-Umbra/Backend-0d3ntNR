import { PartialType } from '@nestjs/swagger';
import { CrearPlantillaRecetaDto } from './crear-plantilla-receta.dto';

export class ActualizarPlantillaRecetaDto extends PartialType(CrearPlantillaRecetaDto) {}
