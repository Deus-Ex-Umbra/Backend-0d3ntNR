import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsBase64 } from 'class-validator';

export class ActualizarUsuarioDto {
  @ApiProperty({ description: 'Nuevo nombre del usuario', required: false })
  @IsOptional()
  @IsString()
  nombre?: string;

  @ApiProperty({ description: 'Nueva imagen de avatar del usuario en formato Base64', required: false })
  @IsOptional()
  @IsString()
  avatar?: string;
}