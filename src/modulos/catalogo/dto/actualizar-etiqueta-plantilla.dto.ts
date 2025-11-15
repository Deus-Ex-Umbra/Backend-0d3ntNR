import { IsString, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ActualizarEtiquetaPlantillaDto {
  @ApiProperty({ example: 'Nombre del Paciente', required: false })
  @IsString()
  @IsOptional()
  nombre?: string;

  @ApiProperty({ example: 'NOMBRE_PACIENTE', required: false })
  @IsString()
  @IsOptional()
  codigo?: string;

  @ApiProperty({ example: 'Nombre completo del paciente', required: false })
  @IsString()
  @IsOptional()
  descripcion?: string;

  @ApiProperty({ example: true, required: false })
  @IsBoolean()
  @IsOptional()
  activo?: boolean;
}
