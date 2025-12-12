import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { EstadoActivo } from '../entidades/activo.entidad';

export class CambiarEstadoActivoDto {
  @ApiProperty({ enum: EstadoActivo, description: 'Nuevo estado del activo' })
  @IsEnum(EstadoActivo)
  estado: EstadoActivo;

  @ApiPropertyOptional({ description: 'Motivo del cambio de estado' })
  @IsOptional()
  @IsString()
  motivo?: string;

  @ApiPropertyOptional({ description: 'Referencia (ID de cita, etc.)' })
  @IsOptional()
  @IsString()
  referencia?: string;
}