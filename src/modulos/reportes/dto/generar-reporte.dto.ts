import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsEnum, IsOptional, IsDateString, ArrayMinSize } from 'class-validator';

export enum AreaReporte {
  FINANZAS = 'finanzas',
  AGENDA = 'agenda',
  TRATAMIENTOS = 'tratamientos',
  INVENTARIO = 'inventario',
}

export class GenerarReporteDto {
  @ApiProperty({ 
    enum: AreaReporte, 
    isArray: true, 
    description: 'Áreas a incluir en el reporte',
    example: ['finanzas', 'agenda']
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsEnum(AreaReporte, { each: true })
  areas: AreaReporte[];

  @ApiProperty({ required: false, description: 'Fecha de inicio del período a reportar' })
  @IsOptional()
  @IsDateString()
  fecha_inicio?: string;

  @ApiProperty({ required: false, description: 'Fecha de fin del período a reportar' })
  @IsOptional()
  @IsDateString()
  fecha_fin?: string;
}