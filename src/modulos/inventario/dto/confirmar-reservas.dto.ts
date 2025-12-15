import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNumber, Min, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class ConfirmacionMaterialItemDto {
    @ApiProperty({ description: 'ID de la reserva de material' })
    @IsInt()
    reserva_material_id: number;

    @ApiProperty({ description: 'Cantidad usada realmente' })
    @IsNumber()
    @Min(0)
    cantidad_confirmada: number;
}

export class ConfirmacionActivoItemDto {
    @ApiProperty({ description: 'ID de la reserva de activo' })
    @IsInt()
    reserva_activo_id: number;
}

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
