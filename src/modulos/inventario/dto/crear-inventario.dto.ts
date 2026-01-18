import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class CrearInventarioDto {
  @ApiProperty({ description: 'Nombre del inventario' })
  @IsString()
  @IsNotEmpty()
  nombre: string;
}
