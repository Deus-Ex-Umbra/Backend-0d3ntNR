import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEnum, IsOptional, IsBoolean } from 'class-validator';
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

  @ApiProperty({ 
    description: 'Modo estricto: valida stock antes de permitir crear citas con materiales',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  modo_estricto?: boolean;
}