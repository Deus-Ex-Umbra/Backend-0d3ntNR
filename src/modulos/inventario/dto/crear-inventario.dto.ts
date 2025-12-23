import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';

export class CrearInventarioDto {
  @ApiProperty({ description: 'Nombre del inventario' })
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @ApiProperty({
    description: 'Modo estricto: valida stock antes de permitir crear citas con materiales',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  modo_estricto?: boolean;
}
