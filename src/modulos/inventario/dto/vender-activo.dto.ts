import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, Min, IsBoolean, IsOptional, IsDateString } from 'class-validator';

export class VenderActivoDto {
  @ApiProperty({ description: 'Monto de la venta' })
  @IsNumber()
  @Min(0)
  monto_venta: number;

  @ApiProperty({ description: 'Registrar el pago en finanzas', default: true })
  @IsOptional()
  @IsBoolean()
  registrar_pago?: boolean;

  @ApiPropertyOptional({ description: 'Fecha de la venta' })
  @IsOptional()
  @IsDateString()
  fecha_venta?: string;
}
