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
} from '@nestjs/common';
import { PacientesServicio } from './pacientes.servicio';
import { CrearPacienteDto } from './dto/crear-paciente.dto';
import { ActualizarPacienteDto } from './dto/actualizar-paciente.dto';
import { RespuestaAnamnesisDto } from './dto/respuesta-anamnesis.dto';
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
}