import { PartialType } from '@nestjs/swagger';
import { OmitType } from '@nestjs/swagger';
import { CrearProductoDto } from './crear-producto.dto';

export class ActualizarProductoDto extends PartialType(
  OmitType(CrearProductoDto, ['inventario_id'] as const)
) {}