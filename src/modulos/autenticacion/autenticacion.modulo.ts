import { Module } from '@nestjs/common';
import { AutenticacionServicio } from './autenticacion.servicio';
import { AutenticacionControlador } from './autenticacion.controlador';
import { UsuariosModule } from '../usuarios/usuarios.modulo';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtEstrategia } from './estrategias/jwt.estrategia';
import { LocalEstrategia } from './estrategias/local.estrategia';

@Module({
  imports: [
    UsuariosModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config_servicio: ConfigService) => {
        const secret = config_servicio.get<string>('JWT_SECRET');
        if (!secret) {
          throw new Error('La clave secreta JWT_SECRET no está definida en el .env');
        }
        const tiempo_expiracion_str = config_servicio.get<string>('JWT_EXPIRATION_TIME', '86400');
        const tiempo_expiracion_num = parseInt(tiempo_expiracion_str, 10);

        console.log('JWT configurado correctamente');
        
        return {
          secret,
          signOptions: {
            expiresIn: tiempo_expiracion_num,
          },
        };
      },
    }),
  ],
  providers: [AutenticacionServicio, LocalEstrategia, JwtEstrategia],
  controllers: [AutenticacionControlador],
})
export class AutenticacionModule {}