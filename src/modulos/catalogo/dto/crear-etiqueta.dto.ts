import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CrearEtiquetaDto {
  @ApiProperty({ description: 'Nombre de la etiqueta' })
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @ApiProperty({ description: 'Descripción de la etiqueta', required: false })
  @IsString()
  @IsOptional()
  descripcion?: string;
}
