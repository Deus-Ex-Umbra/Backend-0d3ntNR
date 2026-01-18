import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class ActualizarInventarioDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  nombre?: string;
}
