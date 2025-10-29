import { ApiProperty } from '@nestjs/swagger';
import { IsArray, ValidateNested, IsInt, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

class MaterialCitaDto {
  @ApiProperty({ description: 'ID del producto' })
  @IsInt()
  producto_id: number;

  @ApiProperty({ description: 'Cantidad planeada' })
  @IsNumber()
  @Min(0)
  cantidad_planeada: number;
}

export class AsignarMaterialesCitaDto {
  @ApiProperty({ type: [MaterialCitaDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MaterialCitaDto)
  materiales: MaterialCitaDto[];
}