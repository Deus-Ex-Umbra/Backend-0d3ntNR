import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsInt, IsOptional, Min, Max, IsIn } from 'class-validator';

export class CrearPlantillaConsentimientoDto {
  @ApiProperty({ description: 'Nombre de la plantilla' })
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @ApiProperty({ description: 'Contenido HTML/texto de la plantilla' })
  @IsString()
  @IsNotEmpty()
  contenido: string;

  @ApiProperty({ description: 'Tamaño de papel', required: false, enum: ['carta', 'legal', 'a4'], default: 'carta' })
  @IsOptional()
  @IsString()
  @IsIn(['carta', 'legal', 'a4'])
  tamano_papel?: 'carta' | 'legal' | 'a4';

  @ApiProperty({ description: 'Margen superior en mm', required: false, default: 20 })
  @IsOptional()
  @IsInt()
  @Min(0)
  margen_superior?: number;

  @ApiProperty({ description: 'Margen inferior en mm', required: false, default: 20 })
  @IsOptional()
  @IsInt()
  @Min(0)
  margen_inferior?: number;

  @ApiProperty({ description: 'Margen izquierdo en mm', required: false, default: 20 })
  @IsOptional()
  @IsInt()
  @Min(0)
  margen_izquierdo?: number;

  @ApiProperty({ description: 'Margen derecho en mm', required: false, default: 20 })
  @IsOptional()
  @IsInt()
  @Min(0)
  margen_derecho?: number;
}