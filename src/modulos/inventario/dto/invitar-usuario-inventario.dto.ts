import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsEnum } from 'class-validator';
import { RolInventario } from '../entidades/permiso-inventario.entidad';

export class InvitarUsuarioInventarioDto {
  @ApiProperty({ description: 'ID del usuario a invitar' })
  @IsInt()
  usuario_id: number;

  @ApiProperty({ enum: RolInventario, description: 'Rol del usuario en el inventario' })
  @IsEnum(RolInventario)
  rol: RolInventario;
}