import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class CrearNotaDiariaDto {
  @ApiProperty()
  @IsString()
  contenido: string;
}