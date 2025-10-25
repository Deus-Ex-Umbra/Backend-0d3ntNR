import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsBase64 } from 'class-validator';

export class CrearSimbologiaDto {
  @ApiProperty()
  @IsString()
  nombre: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  descripcion?: string;

  @ApiProperty({ description: 'Imagen del símbolo en formato Base64' })
  @IsString()
  imagen_base64: string;

  @ApiProperty({ required: false, default: true })
  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
