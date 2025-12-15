import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, IsDateString, IsEnum, IsArray } from 'class-validator';
import { TipoMovimientoKardex, TipoOperacionKardex } from '../entidades/kardex.entidad';
import { TipoAccionAuditoria, CategoriaAuditoria } from '../entidades/auditoria.entidad';
import { EstadoActivo } from '../entidades/activo.entidad';

export class FiltrosKardexDto {
    @ApiPropertyOptional({ description: 'ID del producto' })
    @IsOptional()
    @IsInt()
    producto_id?: number;

    @ApiPropertyOptional({ description: 'ID del material' })
    @IsOptional()
    @IsInt()
    material_id?: number;

    @ApiPropertyOptional({ enum: TipoMovimientoKardex, description: 'Tipo de movimiento' })
    @IsOptional()
    @IsEnum(TipoMovimientoKardex)
    tipo?: TipoMovimientoKardex;

    @ApiPropertyOptional({ enum: TipoOperacionKardex, description: 'Tipo de operación (entrada/salida)' })
    @IsOptional()
    @IsEnum(TipoOperacionKardex)
    operacion?: TipoOperacionKardex;

    @ApiPropertyOptional({ description: 'Fecha de inicio del rango' })
    @IsOptional()
    @IsDateString()
    fecha_inicio?: string;

    @ApiPropertyOptional({ description: 'Fecha de fin del rango' })
    @IsOptional()
    @IsDateString()
    fecha_fin?: string;

    @ApiPropertyOptional({ description: 'ID del usuario que realizó el movimiento' })
    @IsOptional()
    @IsInt()
    usuario_id?: number;

    @ApiPropertyOptional({ description: 'Límite de resultados', default: 50 })
    @IsOptional()
    @IsInt()
    limite?: number;

    @ApiPropertyOptional({ description: 'Offset para paginación', default: 0 })
    @IsOptional()
    @IsInt()
    offset?: number;
}

export class FiltrosBitacoraDto {
    @ApiPropertyOptional({ description: 'ID del activo' })
    @IsOptional()
    @IsInt()
    activo_id?: number;

    @ApiPropertyOptional({ enum: EstadoActivo, description: 'Estado anterior' })
    @IsOptional()
    @IsEnum(EstadoActivo)
    estado_anterior?: EstadoActivo;

    @ApiPropertyOptional({ enum: EstadoActivo, description: 'Estado nuevo' })
    @IsOptional()
    @IsEnum(EstadoActivo)
    estado_nuevo?: EstadoActivo;

    @ApiPropertyOptional({ description: 'Fecha de inicio del rango' })
    @IsOptional()
    @IsDateString()
    fecha_inicio?: string;

    @ApiPropertyOptional({ description: 'Fecha de fin del rango' })
    @IsOptional()
    @IsDateString()
    fecha_fin?: string;

    @ApiPropertyOptional({ description: 'ID del usuario que realizó el cambio' })
    @IsOptional()
    @IsInt()
    usuario_id?: number;

    @ApiPropertyOptional({ description: 'Límite de resultados', default: 50 })
    @IsOptional()
    @IsInt()
    limite?: number;

    @ApiPropertyOptional({ description: 'Offset para paginación', default: 0 })
    @IsOptional()
    @IsInt()
    offset?: number;
}

export class FiltrosAuditoriaDto {
    @ApiPropertyOptional({ description: 'ID del producto' })
    @IsOptional()
    @IsInt()
    producto_id?: number;

    @ApiPropertyOptional({ description: 'ID del material' })
    @IsOptional()
    @IsInt()
    material_id?: number;

    @ApiPropertyOptional({ description: 'ID del activo' })
    @IsOptional()
    @IsInt()
    activo_id?: number;

    @ApiPropertyOptional({ enum: TipoAccionAuditoria, description: 'Tipo de acción' })
    @IsOptional()
    @IsEnum(TipoAccionAuditoria)
    accion?: TipoAccionAuditoria;

    @ApiPropertyOptional({ type: [String], enum: TipoAccionAuditoria, description: 'Tipos de acción (múltiples)' })
    @IsOptional()
    @IsArray()
    @IsEnum(TipoAccionAuditoria, { each: true })
    acciones?: TipoAccionAuditoria[];

    @ApiPropertyOptional({ enum: CategoriaAuditoria, description: 'Categoría de auditoría' })
    @IsOptional()
    @IsEnum(CategoriaAuditoria)
    categoria?: CategoriaAuditoria;

    @ApiPropertyOptional({ description: 'Fecha de inicio del rango' })
    @IsOptional()
    @IsDateString()
    fecha_inicio?: string;

    @ApiPropertyOptional({ description: 'Fecha de fin del rango' })
    @IsOptional()
    @IsDateString()
    fecha_fin?: string;

    @ApiPropertyOptional({ description: 'ID del usuario que realizó la acción' })
    @IsOptional()
    @IsInt()
    usuario_id?: number;

    @ApiPropertyOptional({ description: 'Dirección IP' })
    @IsOptional()
    @IsString()
    ip_address?: string;

    @ApiPropertyOptional({ description: 'Búsqueda en datos (JSON)' })
    @IsOptional()
    @IsString()
    busqueda_datos?: string;

    @ApiPropertyOptional({ description: 'Límite de resultados', default: 50 })
    @IsOptional()
    @IsInt()
    limite?: number;

    @ApiPropertyOptional({ description: 'Offset para paginación', default: 0 })
    @IsOptional()
    @IsInt()
    offset?: number;

    @ApiPropertyOptional({ description: 'Ordenar por campo', default: 'fecha' })
    @IsOptional()
    @IsString()
    ordenar_por?: string;

    @ApiPropertyOptional({ description: 'Orden ascendente o descendente', default: 'DESC' })
    @IsOptional()
    @IsString()
    orden?: 'ASC' | 'DESC';
}
