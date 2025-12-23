import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class ActualizarInventarioDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  nombre?: string;

  @ApiProperty({ required: false, description: 'Modo estricto para validación de stock' })
  @IsOptional()
  @IsBoolean()
  modo_estricto?: boolean;
}
