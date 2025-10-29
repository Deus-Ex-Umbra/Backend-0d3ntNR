import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, IsNotEmpty } from 'class-validator';

export class GenerarPdfConsentimientoDto {
  @ApiProperty({ description: 'ID de la plantilla a usar' })
  @IsInt()
  plantilla_id: number;

  @ApiProperty({ description: 'PDF firmado en formato Base64' })
  @IsString()
  @IsNotEmpty()
  pdf_firmado_base64: string;
}