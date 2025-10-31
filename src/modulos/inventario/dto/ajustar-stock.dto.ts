import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, IsNumber, IsString, Min } from 'class-validator';

export enum TipoAjuste {
  ENTRADA = 'entrada',
  SALIDA = 'salida',
}

export class AjustarStockDto {
  @ApiProperty()
  @IsInt()
  producto_id: number;

  @ApiProperty({ enum: TipoAjuste })
  @IsEnum(TipoAjuste)
  tipo: TipoAjuste;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  cantidad: number;

  @ApiProperty()
  @IsString()
  observaciones: string;
}