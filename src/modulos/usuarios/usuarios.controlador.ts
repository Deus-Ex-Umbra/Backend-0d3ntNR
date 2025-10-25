import { Controller, Get, Put, Body, UseGuards, Request, HttpCode, HttpStatus } from '@nestjs/common';
import { UsuariosServicio } from './usuarios.servicio';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../autenticacion/guardias/jwt-auth.guardia';
import { ActualizarUsuarioDto } from './dto/actualizar-usuario.dto';
import { CambiarContrasenaDto } from './dto/cambiar-contrasena.dto';

@ApiTags('Usuarios')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('usuarios')
export class UsuariosControlador {
  constructor(private readonly usuarios_servicio: UsuariosServicio) {}

  @Get('perfil')
  @ApiOperation({
    summary: 'Obtener perfil del usuario actual',
    description: 'Retorna la información del usuario autenticado',
  })
  @ApiResponse({
    status: 200,
    description: 'Perfil del usuario',
  })
  obtenerPerfil(@Request() req) {
    return this.usuarios_servicio.encontrarPorId(req.user.id);
  }

  @Put('perfil')
  @ApiOperation({
    summary: 'Actualizar perfil del usuario',
    description: 'Permite actualizar nombre y avatar del usuario autenticado',
  })
  @ApiResponse({
    status: 200,
    description: 'Perfil actualizado exitosamente',
  })
  actualizarPerfil(
    @Request() req,
    @Body() actualizar_usuario_dto: ActualizarUsuarioDto,
  ) {
    return this.usuarios_servicio.actualizar(
      req.user.id,
      actualizar_usuario_dto,
    );
  }

  @Put('perfil/cambiar-contrasena')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Cambiar la contraseña del usuario actual' })
  @ApiResponse({ status: 204, description: 'Contraseña cambiada exitosamente' })
  @ApiResponse({ status: 401, description: 'La contraseña actual es incorrecta' })
  async cambiarContrasena(
    @Request() req,
    @Body() cambiar_contrasena_dto: CambiarContrasenaDto,
  ) {
    await this.usuarios_servicio.cambiarContrasena(req.user.id, cambiar_contrasena_dto);
  }
}
