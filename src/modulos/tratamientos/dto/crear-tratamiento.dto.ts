import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsInt, IsNumber, Min, IsOptional, IsArray, ValidateNested, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { TipoMaterialPlantilla } from '../entidades/material-plantilla.entidad';

export class MaterialPlantillaDto {
  @ApiProperty()
  @IsInt()
  producto_id: number;

  @ApiProperty({ enum: TipoMaterialPlantilla })
  @IsEnum(TipoMaterialPlantilla)
  tipo: TipoMaterialPlantilla;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  cantidad: number;
}

export class CrearTratamientoDto {
  @ApiProperty()
  @IsString()
  nombre: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  numero_citas: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  costo_total: number;

  @ApiProperty({ description: 'Días entre citas', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  intervalo_dias?: number;

  @ApiProperty({ description: 'Semanas entre citas', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  intervalo_semanas?: number;

  @ApiProperty({ description: 'Meses entre citas', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  intervalo_meses?: number;

  @ApiProperty({ description: 'Horas aproximadas de cada cita', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  horas_aproximadas_citas?: number;

  @ApiProperty({ description: 'Minutos aproximados de cada cita', default: 30 })
  @IsOptional()
  @IsInt()
  @Min(0)
  minutos_aproximados_citas?: number;

  @ApiProperty({ description: 'Materiales de la plantilla', type: [MaterialPlantillaDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MaterialPlantillaDto)
  materiales?: MaterialPlantillaDto[];
}