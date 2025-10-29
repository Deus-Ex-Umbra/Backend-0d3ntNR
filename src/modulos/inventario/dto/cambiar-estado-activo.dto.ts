import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { EstadoActivo } from '../entidades/activo.entidad';

export class CambiarEstadoActivoDto {
  @ApiProperty({ enum: EstadoActivo, description: 'Nuevo estado del activo' })
  @IsEnum(EstadoActivo)
  estado: EstadoActivo;
}