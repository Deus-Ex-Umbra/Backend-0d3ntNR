import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CrearEtiquetaPlantillaDto {
  @ApiProperty({ example: 'Nombre del Paciente' })
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @ApiProperty({ example: 'NOMBRE_PACIENTE' })
  @IsString()
  @IsNotEmpty()
  codigo: string;

  @ApiProperty({ example: 'Nombre completo del paciente', required: false })
  @IsString()
  @IsOptional()
  descripcion?: string;
}
