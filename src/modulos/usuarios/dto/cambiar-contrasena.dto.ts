import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class CambiarContrasenaDto {
  @ApiProperty({ description: 'Contraseña actual del usuario' })
  @IsString()
  contrasena_actual: string;

  @ApiProperty({ description: 'Nueva contraseña, mínimo 6 caracteres' })
  @IsString()
  @MinLength(6)
  nueva_contrasena: string;
}
