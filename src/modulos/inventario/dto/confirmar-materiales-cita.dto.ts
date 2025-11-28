import { ApiProperty } from '@nestjs/swagger';
import { IsArray, ValidateNested, IsInt, IsNumber, Min, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

class MaterialUsadoDto {
  @ApiProperty({ description: 'ID del material de cita' })
  @IsInt()
  material_cita_id: number;

  @ApiProperty({ description: 'Cantidad realmente usada' })
  @IsNumber()
  @Min(0)
  cantidad_usada: number;

  @ApiProperty({ description: 'ID del inventario (informativo)', required: false })
  @IsInt()
  @IsOptional()
  inventario_id?: number;

  @ApiProperty({ description: 'ID del lote utilizado (opcional)', required: false })
  @IsInt()
  @IsOptional()
  lote_id?: number;

  @ApiProperty({ description: 'ID del activo utilizado (opcional)', required: false })
  @IsInt()
  @IsOptional()
  activo_id?: number;
}

export class ConfirmarMaterialesCitaDto {
  @ApiProperty({ type: [MaterialUsadoDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MaterialUsadoDto)
  materiales: MaterialUsadoDto[];
}