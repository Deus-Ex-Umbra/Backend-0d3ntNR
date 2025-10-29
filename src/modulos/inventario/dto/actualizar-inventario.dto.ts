import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional } from 'class-validator';
import { VisibilidadInventario } from '../entidades/inventario.entidad';

export class ActualizarInventarioDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  nombre?: string;

  @ApiProperty({ enum: VisibilidadInventario, required: false })
  @IsOptional()
  @IsEnum(VisibilidadInventario)
  visibilidad?: VisibilidadInventario;
}