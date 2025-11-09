import { PartialType } from '@nestjs/swagger';
import { CrearEtiquetaDto } from './crear-etiqueta.dto';

export class ActualizarEtiquetaDto extends PartialType(CrearEtiquetaDto) {}
