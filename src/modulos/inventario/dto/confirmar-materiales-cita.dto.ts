import { ApiProperty } from '@nestjs/swagger';
import { IsArray, ValidateNested, IsInt, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

class MaterialUsadoDto {
  @ApiProperty({ description: 'ID del material de cita' })
  @IsInt()
  material_cita_id: number;

  @ApiProperty({ description: 'Cantidad realmente usada' })
  @IsNumber()
  @Min(0)
  cantidad_usada: number;
}

export class ConfirmarMaterialesCitaDto {
  @ApiProperty({ type: [MaterialUsadoDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MaterialUsadoDto)
  materiales: MaterialUsadoDto[];
}