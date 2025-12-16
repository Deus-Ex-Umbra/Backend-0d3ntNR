import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNumber, Min, IsBoolean, IsOptional, IsString, IsEnum, IsDateString } from 'class-validator';
import { TipoMovimientoKardex } from '../entidades/kardex.entidad';

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

export class RegistrarSalidaActivoDto {
    @ApiPropertyOptional({ description: 'ID del activo (opcional, se usa el del URL si no se provee)' })
    @IsOptional()
    @IsInt()
    activo_id?: number;

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

    @ApiPropertyOptional({ description: 'Fecha de la venta' })
    @IsOptional()
    @IsDateString()
    fecha_venta?: string;
}
