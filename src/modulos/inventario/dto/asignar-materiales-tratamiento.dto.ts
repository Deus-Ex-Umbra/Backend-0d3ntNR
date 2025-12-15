import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, ValidateNested, IsInt, IsNumber, Min, IsEnum, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { TipoMaterialTratamiento } from '../entidades/material-tratamiento.entidad';
import { MomentoConfirmacion } from '../../tratamientos/entidades/material-plantilla.entidad';

class MaterialTratamientoDto {
  @ApiProperty({ description: 'ID del producto' })
  @IsInt()
  producto_id: number;

  @ApiProperty({ enum: TipoMaterialTratamiento })
  @IsEnum(TipoMaterialTratamiento)
  tipo: TipoMaterialTratamiento;

  @ApiProperty({ description: 'Cantidad planeada' })
  @IsNumber()
  @Min(0)
  cantidad_planeada: number;

  @ApiPropertyOptional({ enum: MomentoConfirmacion })
  @IsOptional()
  @IsEnum(MomentoConfirmacion)
  momento_confirmacion?: MomentoConfirmacion;
}

export class AsignarMaterialesTratamientoDto {
  @ApiProperty({ type: [MaterialTratamientoDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MaterialTratamientoDto)
  materiales: MaterialTratamientoDto[];
}