import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNumber, Min, IsDateString, IsBoolean, IsOptional, IsString, IsEnum } from 'class-validator';
import { TipoMovimientoKardex } from '../entidades/kardex.entidad';

export class RegistrarEntradaMaterialDto {
    @ApiProperty({ description: 'ID del producto' })
    @IsInt()
    producto_id: number;

    @ApiProperty({ description: 'Cantidad a ingresar' })
    @IsNumber()
    @Min(0.01)
    cantidad: number;

    @ApiProperty({ description: 'Costo unitario' })
    @IsNumber()
    @Min(0)
    costo_unitario: number;

    @ApiProperty({
        enum: [TipoMovimientoKardex.COMPRA, TipoMovimientoKardex.REGALO, TipoMovimientoKardex.DONACION, TipoMovimientoKardex.OTRO_INGRESO],
        description: 'Tipo de entrada'
    })
    @IsEnum(TipoMovimientoKardex)
    tipo_entrada: TipoMovimientoKardex;

    @ApiPropertyOptional({ description: 'Número de lote (para productos con lote)' })
    @IsOptional()
    @IsString()
    nro_lote?: string;

    @ApiPropertyOptional({ description: 'Número de serie (para productos con serie)' })
    @IsOptional()
    @IsString()
    nro_serie?: string;

    @ApiPropertyOptional({ description: 'Fecha de vencimiento (para productos con lote)' })
    @IsOptional()
    @IsDateString()
    fecha_vencimiento?: string;

    @ApiPropertyOptional({ description: 'Fecha de ingreso', default: 'now' })
    @IsOptional()
    @IsDateString()
    fecha_ingreso?: string;

    @ApiPropertyOptional({ description: 'Observaciones' })
    @IsOptional()
    @IsString()
    observaciones?: string;

    @ApiPropertyOptional({ description: 'Generar egreso automático en finanzas', default: false })
    @IsOptional()
    @IsBoolean()
    generar_egreso?: boolean;
}

export class RegistrarEntradaActivoDto {
    @ApiProperty({ description: 'ID del producto' })
    @IsInt()
    producto_id: number;

    @ApiProperty({ description: 'Costo de compra' })
    @IsNumber()
    @Min(0)
    costo_compra: number;

    @ApiProperty({
        enum: [TipoMovimientoKardex.COMPRA, TipoMovimientoKardex.REGALO, TipoMovimientoKardex.DONACION, TipoMovimientoKardex.OTRO_INGRESO],
        description: 'Tipo de entrada'
    })
    @IsEnum(TipoMovimientoKardex)
    tipo_entrada: TipoMovimientoKardex;

    @ApiPropertyOptional({ description: 'Código interno asignado por el usuario' })
    @IsOptional()
    @IsString()
    codigo_interno?: string;

    @ApiPropertyOptional({ description: 'Número de serie' })
    @IsOptional()
    @IsString()
    nro_serie?: string;

    @ApiPropertyOptional({ description: 'Nombre asignado al activo' })
    @IsOptional()
    @IsString()
    nombre_asignado?: string;

    @ApiPropertyOptional({ description: 'Ubicación del activo' })
    @IsOptional()
    @IsString()
    ubicacion?: string;

    @ApiProperty({ description: 'Fecha de compra/adquisición' })
    @IsDateString()
    fecha_compra: string;

    @ApiPropertyOptional({ description: 'Observaciones' })
    @IsOptional()
    @IsString()
    observaciones?: string;

    @ApiPropertyOptional({ description: 'Generar egreso automático en finanzas', default: false })
    @IsOptional()
    @IsBoolean()
    generar_egreso?: boolean;
}
