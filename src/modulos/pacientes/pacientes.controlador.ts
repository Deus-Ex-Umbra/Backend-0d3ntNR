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
  crear(@Body() crear_paciente_dto: CrearPacienteDto) {
    return this.pacientes_servicio.crear(crear_paciente_dto);
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
  encontrarTodos(@Query('termino_busqueda') termino_busqueda?: string) {
    return this.pacientes_servicio.encontrarTodos(termino_busqueda);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un paciente por ID' })
  @ApiResponse({ status: 200, description: 'Paciente encontrado' })
  @ApiResponse({ status: 404, description: 'Paciente no encontrado' })
  encontrarUno(@Param('id') id: string) {
    return this.pacientes_servicio.encontrarPorId(+id);
  }

  @Get(':id/anamnesis')
  @ApiOperation({ summary: 'Obtener la anamnesis de un paciente por ID' })
  @ApiResponse({ status: 200, description: 'Anamnesis del paciente', type: RespuestaAnamnesisDto })
  @ApiResponse({ status: 404, description: 'Paciente no encontrado' })
  obtenerAnamnesis(@Param('id') id: string): Promise<RespuestaAnamnesisDto> {
    return this.pacientes_servicio.obtenerAnamnesisPorPaciente(+id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar un paciente' })
  @ApiResponse({ status: 200, description: 'Paciente actualizado' })
  actualizar(
    @Param('id') id: string,
    @Body() actualizar_paciente_dto: ActualizarPacienteDto,
  ) {
    return this.pacientes_servicio.actualizar(+id, actualizar_paciente_dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar un paciente' })
  @ApiResponse({ status: 200, description: 'Paciente eliminado' })
  eliminar(@Param('id') id: string) {
    return this.pacientes_servicio.eliminar(+id);
  }
}