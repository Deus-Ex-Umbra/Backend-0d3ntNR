import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { PlantillasConsentimientoServicio } from './plantillas-consentimiento.servicio';
import { CrearPlantillaConsentimientoDto } from './dto/crear-plantilla-consentimiento.dto';
import { ActualizarPlantillaConsentimientoDto } from './dto/actualizar-plantilla-consentimiento.dto';
import { GenerarPdfConsentimientoDto } from './dto/generar-pdf-consentimiento.dto';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../autenticacion/guardias/jwt-auth.guardia';

@ApiTags('Plantillas de Consentimiento')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('plantillas-consentimiento')
export class PlantillasConsentimientoControlador {
  constructor(private readonly plantillas_servicio: PlantillasConsentimientoServicio) {}

  @Post()
  @ApiOperation({ summary: 'Crear nueva plantilla de consentimiento' })
  crear(@Request() req, @Body() dto: CrearPlantillaConsentimientoDto) {
    return this.plantillas_servicio.crear(req.user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Obtener todas las plantillas del usuario' })
  obtenerTodas(@Request() req) {
    return this.plantillas_servicio.obtenerTodas(req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener plantilla por ID' })
  obtenerPorId(@Request() req, @Param('id') id: string) {
    return this.plantillas_servicio.obtenerPorId(req.user.id, +id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar plantilla' })
  actualizar(@Request() req, @Param('id') id: string, @Body() dto: ActualizarPlantillaConsentimientoDto) {
    return this.plantillas_servicio.actualizar(req.user.id, +id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar plantilla' })
  eliminar(@Request() req, @Param('id') id: string) {
    return this.plantillas_servicio.eliminar(req.user.id, +id);
  }

  @Post('pacientes/:paciente_id/generar-consentimiento')
  @ApiOperation({ summary: 'Generar PDF de consentimiento para un paciente' })
  generarPdf(
    @Request() req,
    @Param('paciente_id') paciente_id: string,
    @Body() dto: GenerarPdfConsentimientoDto,
  ) {
    return this.plantillas_servicio.generarYGuardarPdf(req.user.id, +paciente_id, dto);
  }
}