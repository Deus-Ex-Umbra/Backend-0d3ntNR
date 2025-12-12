import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNumber, Min, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

// Item de confirmación de material
export class ConfirmacionMaterialItemDto {
    @ApiProperty({ description: 'ID de la reserva de material' })
    @IsInt()
    reserva_material_id: number;

    @ApiProperty({ description: 'Cantidad usada realmente' })
    @IsNumber()
    @Min(0)
    cantidad_confirmada: number;
}

// Item de confirmación de activo
export class ConfirmacionActivoItemDto {
    @ApiProperty({ description: 'ID de la reserva de activo' })
    @IsInt()
    reserva_activo_id: number;
}

// DTO para confirmar reservas de una cita
export class ConfirmarReservasCitaDto {
    @ApiProperty({ description: 'ID de la cita' })
    @IsInt()
    cita_id: number;

    @ApiPropertyOptional({ type: [ConfirmacionMaterialItemDto], description: 'Materiales a confirmar' })
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ConfirmacionMaterialItemDto)
    materiales?: ConfirmacionMaterialItemDto[];

    @ApiPropertyOptional({ type: [ConfirmacionActivoItemDto], description: 'Activos a confirmar' })
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ConfirmacionActivoItemDto)
    activos?: ConfirmacionActivoItemDto[];
}

// DTO para confirmar reservas únicas de un tratamiento
export class ConfirmarReservasTratamientoDto {
    @ApiProperty({ description: 'ID del plan de tratamiento' })
    @IsInt()
    plan_tratamiento_id: number;

    @ApiProperty({ type: [ConfirmacionMaterialItemDto], description: 'Materiales a confirmar' })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ConfirmacionMaterialItemDto)
    materiales: ConfirmacionMaterialItemDto[];
}

// DTO para cancelar reservas
export class CancelarReservasDto {
    @ApiPropertyOptional({ type: [Number], description: 'IDs de reservas de material a cancelar' })
    @IsOptional()
    @IsArray()
    @IsInt({ each: true })
    reservas_material_ids?: number[];

    @ApiPropertyOptional({ type: [Number], description: 'IDs de reservas de activo a cancelar' })
    @IsOptional()
    @IsArray()
    @IsInt({ each: true })
    reservas_activo_ids?: number[];
}
