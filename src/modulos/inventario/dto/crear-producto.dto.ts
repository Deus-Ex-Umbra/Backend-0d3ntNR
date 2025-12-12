import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEnum, IsInt, Min, IsOptional, IsBoolean, ValidateIf } from 'class-validator';
import { TipoProducto, SubtipoMaterial, SubtipoActivoFijo } from '../entidades/producto.entidad';

export class CrearProductoDto {
  @ApiProperty({ description: 'ID del inventario' })
  @IsInt()
  inventario_id: number;

  @ApiProperty({ description: 'Nombre del producto' })
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @ApiProperty({ enum: TipoProducto, description: 'Tipo de producto (material o activo_fijo)' })
  @IsEnum(TipoProducto)
  tipo: TipoProducto;

  @ApiPropertyOptional({ enum: SubtipoMaterial, description: 'Subtipo de material (requerido si tipo es material)' })
  @ValidateIf(o => o.tipo === TipoProducto.MATERIAL)
  @IsEnum(SubtipoMaterial)
  subtipo_material?: SubtipoMaterial;

  @ApiPropertyOptional({ enum: SubtipoActivoFijo, description: 'Subtipo de activo fijo (requerido si tipo es activo_fijo)' })
  @ValidateIf(o => o.tipo === TipoProducto.ACTIVO_FIJO)
  @IsEnum(SubtipoActivoFijo)
  subtipo_activo_fijo?: SubtipoActivoFijo;

  @ApiPropertyOptional({ description: 'Stock mínimo', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  stock_minimo?: number;

  @ApiPropertyOptional({ description: 'Unidad de medida', default: 'unidad' })
  @IsOptional()
  @IsString()
  unidad_medida?: string;

  @ApiPropertyOptional({ description: 'Descripción del producto' })
  @IsOptional()
  @IsString()
  descripcion?: string;

  @ApiPropertyOptional({ description: 'Notificar cuando el stock esté bajo', default: true })
  @IsOptional()
  @IsBoolean()
  notificar_stock_bajo?: boolean;
}