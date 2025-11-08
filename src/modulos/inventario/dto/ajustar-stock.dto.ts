import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, IsNumber, IsString, Min, IsBoolean, IsOptional } from 'class-validator';

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

  @ApiProperty({ description: 'Generar movimiento en finanzas', default: true })
  @IsOptional()
  @IsBoolean()
  generar_movimiento_financiero?: boolean;

  @ApiProperty({ description: 'Monto del movimiento financiero' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  monto?: number;
}