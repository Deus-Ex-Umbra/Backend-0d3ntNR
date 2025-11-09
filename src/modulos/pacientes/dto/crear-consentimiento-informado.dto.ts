import { IsNotEmpty, IsString, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CrearConsentimientoInformadoDto {
  @ApiProperty({ description: 'ID del paciente' })
  @IsNumber()
  @IsNotEmpty()
  paciente_id: number;

  @ApiProperty({ description: 'ID de la plantilla a usar' })
  @IsNumber()
  @IsNotEmpty()
  plantilla_id: number;

  @ApiProperty({ description: 'Nombre del consentimiento' })
  @IsString()
  @IsNotEmpty()
  nombre: string;
}
