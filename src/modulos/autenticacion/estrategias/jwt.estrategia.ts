import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsuariosServicio } from '../../usuarios/usuarios.servicio';

@Injectable()
export class JwtEstrategia extends PassportStrategy(Strategy) {
  constructor(
    private readonly config_servicio: ConfigService,
    private readonly usuarios_servicio: UsuariosServicio,
  ) {
    const secret = config_servicio.get<string>('JWT_SECRET');
    if (!secret) {
      throw new UnauthorizedException('La clave secreta JWT no está configurada.');
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: any) {
    try {
      const usuario = await this.usuarios_servicio.encontrarPorId(payload.sub);
      if (!usuario) {
        throw new UnauthorizedException('Usuario no encontrado');
      }
      return { id: payload.sub, correo: payload.correo };
    } catch (error) {
      throw new UnauthorizedException('Token inválido');
    }
  }
}