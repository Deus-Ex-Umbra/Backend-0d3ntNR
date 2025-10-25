import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class ActualizarArchivoDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  nombre_archivo?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  descripcion?: string;
}
