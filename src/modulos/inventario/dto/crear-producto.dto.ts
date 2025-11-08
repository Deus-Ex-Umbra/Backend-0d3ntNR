import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEnum, IsInt, Min, IsOptional, IsBoolean } from 'class-validator';
import { TipoGestion } from '../entidades/producto.entidad';

export class CrearProductoDto {
  @ApiProperty({ description: 'ID del inventario' })
  @IsInt()
  inventario_id: number;

  @ApiProperty({ description: 'Nombre del producto' })
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @ApiProperty({ enum: TipoGestion, description: 'Tipo de gestión del producto' })
  @IsEnum(TipoGestion)
  tipo_gestion: TipoGestion;

  @ApiProperty({ description: 'Stock mínimo', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  stock_minimo?: number;

  @ApiProperty({ description: 'Unidad de medida', default: 'unidad' })
  @IsOptional()
  @IsString()
  unidad_medida?: string;

  @ApiProperty({ description: 'Descripción del producto', required: false })
  @IsOptional()
  @IsString()
  descripcion?: string;

  @ApiProperty({ description: 'Notificar cuando el stock esté bajo', default: true })
  @IsOptional()
  @IsBoolean()
  notificar_stock_bajo?: boolean;
}