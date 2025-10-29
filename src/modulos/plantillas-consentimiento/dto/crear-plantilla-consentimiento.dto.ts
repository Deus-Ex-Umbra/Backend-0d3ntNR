import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class CrearPlantillaConsentimientoDto {
  @ApiProperty({ description: 'Nombre de la plantilla' })
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @ApiProperty({ description: 'Contenido HTML/texto de la plantilla' })
  @IsString()
  @IsNotEmpty()
  contenido: string;
}