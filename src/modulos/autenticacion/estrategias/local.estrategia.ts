import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { AutenticacionServicio } from '../autenticacion.servicio';

@Injectable()
export class LocalEstrategia extends PassportStrategy(Strategy) {
  constructor(private readonly autenticacion_servicio: AutenticacionServicio) {
    super({ 
      usernameField: 'correo',
      passwordField: 'contrasena'
    });
  }

  async validate(correo: string, contrasena: string): Promise<any> {
    console.log('LocalEstrategia - Validando usuario:', correo);
    
    const usuario = await this.autenticacion_servicio.validarUsuario(correo, contrasena);
    
    if (!usuario) {
      console.log('LocalEstrategia - Usuario no válido');
      throw new UnauthorizedException('Credenciales incorrectas');
    }
    
    console.log('LocalEstrategia - Usuario validado exitosamente');
    return usuario;
  }
}