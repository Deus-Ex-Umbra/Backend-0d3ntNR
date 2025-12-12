import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNumber, Min, IsBoolean, IsOptional, IsString, IsEnum } from 'class-validator';
import { TipoMovimientoKardex } from '../entidades/kardex.entidad';

// DTO para registrar salida de materiales (consumibles)
export class RegistrarSalidaMaterialDto {
    @ApiProperty({ description: 'ID del producto' })
    @IsInt()
    producto_id: number;

    @ApiProperty({ description: 'Cantidad a salir' })
    @IsNumber()
    @Min(0.01)
    cantidad: number;

    @ApiProperty({
        enum: [TipoMovimientoKardex.VENTA, TipoMovimientoKardex.DESECHO, TipoMovimientoKardex.ROBO, TipoMovimientoKardex.AJUSTE],
        description: 'Tipo de salida'
    })
    @IsEnum(TipoMovimientoKardex)
    tipo_salida: TipoMovimientoKardex;

    @ApiPropertyOptional({ description: 'ID del material específico (si se desea descontar de uno específico)' })
    @IsOptional()
    @IsInt()
    material_id?: number;

    @ApiPropertyOptional({ description: 'Monto de venta (si es venta)' })
    @IsOptional()
    @IsNumber()
    @Min(0)
    monto_venta?: number;

    @ApiPropertyOptional({ description: 'Observaciones/motivo' })
    @IsOptional()
    @IsString()
    observaciones?: string;

    @ApiPropertyOptional({ description: 'Registrar ingreso en finanzas (si es venta)', default: false })
    @IsOptional()
    @IsBoolean()
    registrar_pago?: boolean;
}

// DTO para registrar salida/venta de activos fijos
export class RegistrarSalidaActivoDto {
    @ApiProperty({ description: 'ID del activo' })
    @IsInt()
    activo_id: number;

    @ApiProperty({
        enum: [TipoMovimientoKardex.VENTA, TipoMovimientoKardex.DESECHO, TipoMovimientoKardex.ROBO],
        description: 'Tipo de salida'
    })
    @IsEnum(TipoMovimientoKardex)
    tipo_salida: TipoMovimientoKardex;

    @ApiPropertyOptional({ description: 'Monto de venta (si es venta)' })
    @IsOptional()
    @IsNumber()
    @Min(0)
    monto_venta?: number;

    @ApiPropertyOptional({ description: 'Observaciones/motivo' })
    @IsOptional()
    @IsString()
    observaciones?: string;

    @ApiPropertyOptional({ description: 'Registrar ingreso en finanzas (si es venta)', default: true })
    @IsOptional()
    @IsBoolean()
    registrar_pago?: boolean;
}
