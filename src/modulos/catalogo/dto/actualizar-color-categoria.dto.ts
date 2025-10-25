import { PartialType } from '@nestjs/swagger';
import { CrearColorCategoriaDto } from './crear-color-categoria.dto';

export class ActualizarColorCategoriaDto extends PartialType(CrearColorCategoriaDto) {}