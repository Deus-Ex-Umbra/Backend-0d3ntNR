import { Controller, Post, Body, UseGuards, Request, HttpCode, HttpStatus } from '@nestjs/common';
import { AutenticacionServicio } from './autenticacion.servicio';
import { RegistroUsuarioDto } from './dto/registro-usuario.dto';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { LocalAuthGuard } from './guardias/local-auth.guardia';
import { InicioSesionDto } from './dto/inicio-sesion.dto';

@ApiTags('Autenticación')
@Controller('autenticacion')
export class AutenticacionControlador {
  constructor(
    private readonly autenticacion_servicio: AutenticacionServicio,
  ) {}

  @Post('registro')
  @ApiOperation({
    summary: 'Registrar nuevo usuario',
    description: 'Crea una nueva cuenta de usuario en el sistema',
  })
  @ApiResponse({
    status: 201,
    description: 'Usuario registrado exitosamente',
    schema: {
      example: {
        id: 1,
        nombre: 'Dr. Juan Pérez',
        correo: 'juan@ejemplo.com',
        avatar: null,
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Datos inválidos',
  })
  @ApiResponse({
    status: 409,
    description: 'El correo ya está registrado',
  })
  async registrar(@Body() registro_usuario_dto: RegistroUsuarioDto) {
    return this.autenticacion_servicio.registrar(registro_usuario_dto);
  }

  @UseGuards(LocalAuthGuard)
  @Post('inicio-sesion')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Iniciar sesión',
    description: 'Autenticar usuario y obtener token JWT',
  })
  @ApiResponse({
    status: 200,
    description: 'Inicio de sesión exitoso',
    schema: {
      example: {
        token_acceso: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        usuario: {
          id: 1,
          nombre: 'Dr. Juan Pérez',
          correo: 'juan@ejemplo.com',
          avatar: null,
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Credenciales incorrectas',
  })
  async iniciarSesion(
    @Request() req,
    @Body() inicio_sesion_dto: InicioSesionDto,
  ) {
    return this.autenticacion_servicio.iniciarSesion(req.user);
  }
}