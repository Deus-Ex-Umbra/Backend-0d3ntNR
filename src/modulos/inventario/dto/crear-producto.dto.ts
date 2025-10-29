import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEnum, IsInt, Min, IsOptional } from 'class-validator';
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
}