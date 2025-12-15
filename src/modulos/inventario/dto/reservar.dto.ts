import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNumber, Min, IsOptional, IsArray, ValidateNested, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export class ReservaMaterialItemDto {
    @ApiProperty({ description: 'ID del producto' })
    @IsInt()
    producto_id: number;

    @ApiProperty({ description: 'Cantidad a reservar' })
    @IsNumber()
    @Min(0.01)
    cantidad: number;

    @ApiPropertyOptional({ description: 'ID del material específico (lote/serie)' })
    @IsOptional()
    @IsInt()
    material_id?: number;
}

export class ReservarMaterialesCitaDto {
    @ApiProperty({ description: 'ID de la cita' })
    @IsInt()
    cita_id: number;

    @ApiProperty({ type: [ReservaMaterialItemDto], description: 'Materiales a reservar' })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ReservaMaterialItemDto)
    materiales: ReservaMaterialItemDto[];
}

export class ReservaActivoItemDto {
    @ApiProperty({ description: 'ID del activo' })
    @IsInt()
    activo_id: number;

    @ApiProperty({ description: 'Fecha y hora de inicio de uso' })
    @IsDateString()
    fecha_hora_inicio: string;

    @ApiProperty({ description: 'Fecha y hora de fin de uso' })
    @IsDateString()
    fecha_hora_fin: string;
}

export class ReservarActivosCitaDto {
    @ApiProperty({ description: 'ID de la cita' })
    @IsInt()
    cita_id: number;

    @ApiProperty({ type: [ReservaActivoItemDto], description: 'Activos a reservar' })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ReservaActivoItemDto)
    activos: ReservaActivoItemDto[];
}

export class ReservarMaterialesTratamientoDto {
    @ApiProperty({ description: 'ID del plan de tratamiento' })
    @IsInt()
    plan_tratamiento_id: number;

    @ApiProperty({ type: [ReservaMaterialItemDto], description: 'Materiales a reservar' })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ReservaMaterialItemDto)
    materiales: ReservaMaterialItemDto[];
}
