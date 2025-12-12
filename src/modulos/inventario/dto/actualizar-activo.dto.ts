import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNumber, Min, IsOptional, IsString } from 'class-validator';

export class ActualizarActivoDto {
  @ApiPropertyOptional({ description: 'Código interno asignado por el usuario' })
  @IsOptional()
  @IsString()
  codigo_interno?: string;

  @ApiPropertyOptional({ description: 'Número de serie' })
  @IsOptional()
  @IsString()
  nro_serie?: string;

  @ApiPropertyOptional({ description: 'Nombre asignado' })
  @IsOptional()
  @IsString()
  nombre_asignado?: string;

  @ApiPropertyOptional({ description: 'Ubicación' })
  @IsOptional()
  @IsString()
  ubicacion?: string;

  @ApiPropertyOptional({ description: 'Costo de compra' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  costo_compra?: number;
}