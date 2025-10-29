import { ApiProperty } from '@nestjs/swagger';
import { IsArray, ValidateNested, IsInt, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

class MaterialTratamientoUsadoDto {
  @ApiProperty({ description: 'ID del material de tratamiento' })
  @IsInt()
  material_tratamiento_id: number;

  @ApiProperty({ description: 'Cantidad realmente usada' })
  @IsNumber()
  @Min(0)
  cantidad_usada: number;
}

export class ConfirmarMaterialesTratamientoDto {
  @ApiProperty({ type: [MaterialTratamientoUsadoDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MaterialTratamientoUsadoDto)
  materiales: MaterialTratamientoUsadoDto[];
}