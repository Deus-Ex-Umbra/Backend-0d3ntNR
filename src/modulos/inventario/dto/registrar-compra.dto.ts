import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNumber, Min, IsDateString, IsBoolean, IsOptional, IsString, ValidateIf } from 'class-validator';
import { TipoGestion } from '../entidades/producto.entidad';

export class RegistrarCompraDto {
  @ApiProperty({ description: 'ID del producto' })
  @IsInt()
  producto_id: number;

  @ApiProperty({ description: 'Cantidad o costo según el tipo de gestión' })
  @IsNumber()
  @Min(0)
  cantidad: number;

  @ApiProperty({ description: 'Costo total de la compra' })
  @IsNumber()
  @Min(0)
  costo_total: number;

  @ApiProperty({ description: 'Fecha de vencimiento (solo para CONSUMIBLE)', required: false })
  @IsOptional()
  @IsDateString()
  fecha_vencimiento?: string;

  @ApiProperty({ description: 'Número de lote (solo para CONSUMIBLE)', required: false })
  @IsOptional()
  @IsString()
  nro_lote?: string;

  @ApiProperty({ description: 'Número de serie (solo para ACTIVO_SERIALIZADO)', required: false })
  @IsOptional()
  @IsString()
  nro_serie?: string;

  @ApiProperty({ description: 'Nombre asignado al activo', required: false })
  @IsOptional()
  @IsString()
  nombre_asignado?: string;

  @ApiProperty({ description: 'Fecha de compra' })
  @IsDateString()
  fecha_compra: string;

  @ApiProperty({ description: 'Generar egreso automático en finanzas', default: false })
  @IsOptional()
  @IsBoolean()
  generar_egreso?: boolean;
}