import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional, IsBoolean } from 'class-validator';
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

  @ApiProperty({ required: false, description: 'Modo estricto para validación de stock' })
  @IsOptional()
  @IsBoolean()
  modo_estricto?: boolean;
}