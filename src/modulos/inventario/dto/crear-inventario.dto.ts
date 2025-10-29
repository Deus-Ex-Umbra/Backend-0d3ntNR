import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEnum, IsOptional } from 'class-validator';
import { VisibilidadInventario } from '../entidades/inventario.entidad';

export class CrearInventarioDto {
  @ApiProperty({ description: 'Nombre del inventario' })
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @ApiProperty({ 
    enum: VisibilidadInventario, 
    description: 'Visibilidad del inventario',
    default: VisibilidadInventario.PRIVADO,
  })
  @IsOptional()
  @IsEnum(VisibilidadInventario)
  visibilidad?: VisibilidadInventario;
}