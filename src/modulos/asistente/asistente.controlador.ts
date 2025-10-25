import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { AsistenteServicio } from './asistente.servicio';
import { SubirImagenCitaDto } from './dto/subir-imagen-cita.dto';
import { SolicitudFraseDto } from './dto/solicitud-frase.dto';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../autenticacion/guardias/jwt-auth.guardia';

@ApiTags('Asistente IA')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('asistente')
export class AsistenteControlador {
  constructor(private readonly asistente_servicio: AsistenteServicio) {}

  @Post('ocr-citas')
  digitalizarCitas(@Body() subir_imagen_dto: SubirImagenCitaDto) {
    return this.asistente_servicio.digitalizarCitasDesdeImagen(subir_imagen_dto.imagen_base64);
  }

  @Post('frase-motivacional')
  obtenerFrase(@Request() req, @Body() solicitud_frase_dto: SolicitudFraseDto) {
    return this.asistente_servicio.generarFraseMotivacional(req.user.id, solicitud_frase_dto.dias);
  }
}