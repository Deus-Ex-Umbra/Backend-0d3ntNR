import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, ValidateNested, IsInt, IsNumber, Min, IsOptional, IsString, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

class MaterialGeneralConfirmacionDto {
  @ApiProperty({ description: 'ID del material tratamiento' })
  @IsInt()
  material_tratamiento_id: number;

  @ApiProperty({ description: 'Cantidad usada' })
  @IsNumber()
  @Min(0)
  cantidad_usada: number;
}

export class ConfirmarMaterialesGeneralesDto {
  @ApiProperty({ type: [MaterialGeneralConfirmacionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MaterialGeneralConfirmacionDto)
  materiales: MaterialGeneralConfirmacionDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  estado_pago?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  monto_pago?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  metodo_pago?: string;
}
