import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsInt, Min, IsOptional, IsBoolean, IsEnum } from 'class-validator';
import { SubtipoMaterial, SubtipoActivoFijo } from '../entidades/producto.entidad';

export class ActualizarProductoDto {
  @ApiPropertyOptional({ description: 'Nombre del producto' })
  @IsOptional()
  @IsString()
  nombre?: string;

  @ApiPropertyOptional({ enum: SubtipoMaterial, description: 'Subtipo de material' })
  @IsOptional()
  @IsEnum(SubtipoMaterial)
  subtipo_material?: SubtipoMaterial;

  @ApiPropertyOptional({ enum: SubtipoActivoFijo, description: 'Subtipo de activo fijo' })
  @IsOptional()
  @IsEnum(SubtipoActivoFijo)
  subtipo_activo_fijo?: SubtipoActivoFijo;

  @ApiPropertyOptional({ description: 'Stock mínimo' })
  @IsOptional()
  @IsInt()
  @Min(0)
  stock_minimo?: number;

  @ApiPropertyOptional({ description: 'Unidad de medida' })
  @IsOptional()
  @IsString()
  unidad_medida?: string;

  @ApiPropertyOptional({ description: 'Descripción del producto' })
  @IsOptional()
  @IsString()
  descripcion?: string;

  @ApiPropertyOptional({ description: 'Notificar cuando el stock esté bajo' })
  @IsOptional()
  @IsBoolean()
  notificar_stock_bajo?: boolean;

  @ApiPropertyOptional({ description: 'Estado activo del producto' })
  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}