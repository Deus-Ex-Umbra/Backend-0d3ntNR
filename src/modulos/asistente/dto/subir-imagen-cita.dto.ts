import { ApiProperty } from '@nestjs/swagger';
import { IsBase64, IsString } from 'class-validator';

export class SubirImagenCitaDto {
  @ApiProperty({ description: 'Imagen de las citas en formato Base64' })
  @IsString()
  @IsBase64()
  imagen_base64: string;
}