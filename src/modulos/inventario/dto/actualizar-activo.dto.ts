import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { EstadoActivo } from '../entidades/activo.entidad';

export class ActualizarActivoDto {
  @ApiProperty({ enum: EstadoActivo, required: false })
  @IsOptional()
  @IsEnum(EstadoActivo)
  estado?: EstadoActivo;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  ubicacion?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  nombre_asignado?: string;
}