import { ApiProperty } from '@nestjs/swagger';
import { IsArray, ValidateNested, IsInt, IsNumber, Min, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

class MaterialCitaDto {
  @ApiProperty({ description: 'ID del producto' })
  @IsInt()
  producto_id: number;

  @ApiProperty({ description: 'Cantidad planeada' })
  @IsNumber()
  @Min(0)
  cantidad_planeada: number;
  
  @ApiProperty({ description: 'ID del inventario (opcional)', required: false })
  @IsInt()
  @IsOptional()
  inventario_id?: number;

  @ApiProperty({ description: 'ID del lote específico (opcional)', required: false })
  @IsInt()
  @IsOptional()
  lote_id?: number;

  @ApiProperty({ description: 'ID del activo específico (opcional)', required: false })
  @IsInt()
  @IsOptional()
  activo_id?: number;
}

export class AsignarMaterialesCitaDto {
  @ApiProperty({ type: [MaterialCitaDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MaterialCitaDto)
  materiales: MaterialCitaDto[];
}