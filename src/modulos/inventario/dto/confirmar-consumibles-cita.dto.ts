import { ApiProperty } from '@nestjs/swagger';
import { IsArray, ValidateNested, IsInt, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

class ConsumibleUsadoDto {
  @ApiProperty({ description: 'ID del producto consumible' })
  @IsInt()
  producto_id: number;

  @ApiProperty({ description: 'Cantidad usada' })
  @IsNumber()
  @Min(0)
  cantidad: number;
}

export class ConfirmarConsumiblesCitaDto {
  @ApiProperty({ type: [ConsumibleUsadoDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConsumibleUsadoDto)
  consumibles: ConsumibleUsadoDto[];
}