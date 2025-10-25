import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class RegistroUsuarioDto {
  @ApiProperty({ description: 'Nombre completo del usuario' })
  @IsNotEmpty()
  @IsString()
  nombre: string;

  @ApiProperty({ description: 'Correo electrónico único del usuario' })
  @IsNotEmpty()
  @IsEmail()
  correo: string;

  @ApiProperty({ description: 'Contraseña del usuario, mínimo 6 caracteres' })
  @IsNotEmpty()
  @IsString()
  @MinLength(6)
  contrasena: string;
}