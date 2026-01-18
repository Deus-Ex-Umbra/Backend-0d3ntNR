import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  Query,
  UseGuards,
  Request,
  StreamableFile,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import * as fs from 'fs';
import { PacientesServicio } from './pacientes.servicio';
import { CrearPacienteDto } from './dto/crear-paciente.dto';
import { ActualizarPacienteDto } from './dto/actualizar-paciente.dto';
import { RespuestaAnamnesisDto } from './dto/respuesta-anamnesis.dto';
import { CrearHistoriaClinicaDto } from './dto/crear-historia-clinica.dto';
import { ActualizarHistoriaClinicaDto } from './dto/actualizar-historia-clinica.dto';
import {
  ApiTags,
  ApiBearerAuth,
  ApiQuery,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../autenticacion/guardias/jwt-auth.guardia';

@ApiTags('Pacientes')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('pacientes')
export class PacientesControlador {
  constructor(private readonly pacientes_servicio: PacientesServicio) {}

  @Post()
  @ApiOperation({ summary: 'Crear un nuevo paciente' })
  @ApiResponse({ status: 201, description: 'Paciente creado exitosamente' })
  crear(@Request() req, @Body() crear_paciente_dto: CrearPacienteDto) {
    return this.pacientes_servicio.crear(req.user.id, crear_paciente_dto);
  }

  @Get()
  @ApiOperation({ summary: 'Obtener todos los pacientes' })
  @ApiQuery({
    name: 'termino_busqueda',
    required: false,
    type: String,
    description: 'Filtra pacientes por nombre, apellidos o ID.',
  })
  @ApiResponse({ status: 200, description: 'Lista de pacientes' })
  encontrarTodos(@Request() req, @Query('termino_busqueda') termino_busqueda?: string) {
    return this.pacientes_servicio.encontrarTodos(req.user.id, termino_busqueda);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un paciente por ID' })
  @ApiResponse({ status: 200, description: 'Paciente encontrado' })
  @ApiResponse({ status: 404, description: 'Paciente no encontrado' })
  encontrarUno(@Request() req, @Param('id') id: string) {
    return this.pacientes_servicio.encontrarPorId(req.user.id, +id);
  }

  @Get(':id/anamnesis')
  @ApiOperation({ summary: 'Obtener la anamnesis de un paciente por ID' })
  @ApiResponse({ status: 200, description: 'Anamnesis del paciente', type: RespuestaAnamnesisDto })
  @ApiResponse({ status: 404, description: 'Paciente no encontrado' })
  obtenerAnamnesis(@Request() req, @Param('id') id: string): Promise<RespuestaAnamnesisDto> {
    return this.pacientes_servicio.obtenerAnamnesisPorPaciente(req.user.id, +id);
  }

  @Get(':id/historias-clinicas')
  @ApiOperation({ summary: 'Listar versiones de historia clínica de un paciente' })
  @ApiResponse({ status: 200, description: 'Lista de versiones' })
  listarHistoriasClinicas(@Request() req, @Param('id') id: string) {
    return this.pacientes_servicio.listarHistoriasClinicas(req.user.id, +id);
  }

  @Get(':id/historias-clinicas/:versionId')
  @ApiOperation({ summary: 'Obtener una versión específica de historia clínica' })
  @ApiResponse({ status: 200, description: 'Versión encontrada' })
  obtenerHistoriaClinica(
    @Request() req,
    @Param('id') id: string,
    @Param('versionId') versionId: string,
  ) {
    return this.pacientes_servicio.obtenerHistoriaClinica(req.user.id, +id, +versionId);
  }

  @Post(':id/historias-clinicas')
  @ApiOperation({ summary: 'Crear una nueva versión de la historia clínica' })
  @ApiResponse({ status: 201, description: 'Versión creada' })
  crearHistoriaClinica(
    @Request() req,
    @Param('id') paciente_id: string,
    @Body() crear_historia_dto: CrearHistoriaClinicaDto,
  ) {
    return this.pacientes_servicio.crearHistoriaClinica(req.user.id, +paciente_id, crear_historia_dto);
  }

  @Put(':id/historias-clinicas/:versionId')
  @ApiOperation({ summary: 'Actualizar una versión de historia clínica (no finalizada)' })
  @ApiResponse({ status: 200, description: 'Versión actualizada' })
  actualizarHistoriaClinica(
    @Request() req,
    @Param('id') paciente_id: string,
    @Param('versionId') version_id: string,
    @Body() actualizar_historia_dto: ActualizarHistoriaClinicaDto,
  ) {
    return this.pacientes_servicio.actualizarHistoriaClinica(
      req.user.id,
      +paciente_id,
      +version_id,
      actualizar_historia_dto,
    );
  }

  @Post(':id/historias-clinicas/:versionId/finalizar')
  @ApiOperation({ summary: 'Finalizar una versión de historia clínica' })
  @ApiResponse({ status: 200, description: 'Versión finalizada' })
  finalizarHistoriaClinica(
    @Request() req,
    @Param('id') paciente_id: string,
    @Param('versionId') version_id: string,
  ) {
    return this.pacientes_servicio.finalizarHistoriaClinica(req.user.id, +paciente_id, +version_id);
  }

  @Post(':id/historias-clinicas/:versionId/clonar')
  @ApiOperation({ summary: 'Crear una nueva versión clonando la actual y finalizar la anterior' })
  @ApiResponse({ status: 201, description: 'Versión clonada' })
  clonarHistoriaClinica(
    @Request() req,
    @Param('id') paciente_id: string,
    @Param('versionId') version_id: string,
  ) {
    return this.pacientes_servicio.clonarHistoriaClinica(req.user.id, +paciente_id, +version_id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar un paciente' })
  @ApiResponse({ status: 200, description: 'Paciente actualizado' })
  actualizar(
    @Request() req,
    @Param('id') id: string,
    @Body() actualizar_paciente_dto: ActualizarPacienteDto,
  ) {
    return this.pacientes_servicio.actualizar(req.user.id, +id, actualizar_paciente_dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar un paciente' })
  @ApiResponse({ status: 200, description: 'Paciente eliminado' })
  eliminar(@Request() req, @Param('id') id: string) {
    return this.pacientes_servicio.eliminar(req.user.id, +id);
  }

  @Get(':id/ultima-cita')
  @ApiOperation({ summary: 'Obtener la última cita pasada de un paciente' })
  @ApiResponse({ status: 200, description: 'Última cita del paciente' })
  @ApiResponse({ status: 404, description: 'No se encontraron citas' })
  obtenerUltimaCita(@Request() req, @Param('id') id: string) {
    return this.pacientes_servicio.obtenerUltimaCita(req.user.id, +id);
  }

  @Get(':id/ultimo-tratamiento')
  @ApiOperation({ summary: 'Obtener el último tratamiento del paciente' })
  @ApiResponse({ status: 200, description: 'Último tratamiento del paciente' })
  @ApiResponse({ status: 404, description: 'No se encontraron tratamientos' })
  obtenerUltimoTratamiento(@Request() req, @Param('id') id: string) {
    return this.pacientes_servicio.obtenerUltimoTratamiento(req.user.id, +id);
  }
  
  @Post(':id/consentimientos')
  @ApiOperation({ summary: 'Crear un consentimiento informado para un paciente' })
  @ApiResponse({ status: 201, description: 'Consentimiento creado exitosamente' })
  @ApiResponse({ status: 404, description: 'Paciente o plantilla no encontrados' })
  async crearConsentimiento(
    @Request() req,
    @Param('id') paciente_id: string,
    @Body() body: { plantilla_id: number; nombre: string },
  ) {
    return await this.pacientes_servicio.crearConsentimientoInformado(
      +paciente_id,
      body.plantilla_id,
      body.nombre,
      req.user.id,
    );
  }

  @Get(':id/consentimientos')
  @ApiOperation({ summary: 'Obtener consentimientos informados de un paciente' })
  @ApiResponse({ status: 200, description: 'Lista de consentimientos del paciente' })
  async obtenerConsentimientos(
    @Request() req,
    @Param('id') paciente_id: string
  ) {
    return await this.pacientes_servicio.obtenerConsentimientosPaciente(req.user.id, +paciente_id);
  }

  @Get('consentimientos/:id/descargar')
  @ApiOperation({ summary: 'Descargar un consentimiento informado en PDF' })
  @ApiResponse({ status: 200, description: 'Archivo PDF del consentimiento' })
  @ApiResponse({ status: 404, description: 'Consentimiento no encontrado' })
  async descargarConsentimiento(
    @Request() req,
    @Param('id') id: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const archivo = await this.pacientes_servicio.obtenerArchivoConsentimiento(req.user.id, +id);
    
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="consentimiento_${id}.pdf"`,
    });

    return new StreamableFile(archivo as any); // Cast to any or StreamableFile compatible type if needed, but Readable is compatible
  }

  @Delete('consentimientos/:id')
  @ApiOperation({ summary: 'Eliminar un consentimiento informado' })
  @ApiResponse({ status: 200, description: 'Consentimiento eliminado exitosamente' })
  @ApiResponse({ status: 404, description: 'Consentimiento no encontrado' })
  async eliminarConsentimiento(
    @Request() req,
    @Param('id') id: string
  ) {
    await this.pacientes_servicio.eliminarConsentimiento(req.user.id, +id);
    return { mensaje: 'Consentimiento eliminado exitosamente' };
  }
}