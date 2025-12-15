import { Controller, Post, Body, Param, Get, UseGuards, Request, Delete } from '@nestjs/common';
import { PlanesTratamientoServicio } from './planes-tratamiento.servicio';
import { AsignarPlanTratamientoDto } from './dto/asignar-plan-tratamiento.dto';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../autenticacion/guardias/jwt-auth.guardia';

@ApiTags('Planes de Tratamiento')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('planes-tratamiento')
export class PlanesTratamientoControlador {
  constructor(private readonly planes_servicio: PlanesTratamientoServicio) { }

  @Post()
  asignarPlan(@Request() req, @Body() asignar_plan_dto: AsignarPlanTratamientoDto) {
    return this.planes_servicio.asignarPlan(req.user.id, asignar_plan_dto);
  }

  @Get()
  obtenerTodos(@Request() req) {
    return this.planes_servicio.obtenerTodos(req.user.id);
  }

  @Get('paciente/:paciente_id')
  obtenerPlanesPorPaciente(@Request() req, @Param('paciente_id') paciente_id: string) {
    return this.planes_servicio.obtenerPlanesPorPaciente(req.user.id, +paciente_id);
  }

  @Get(':id/materiales')
  obtenerMaterialesPlan(@Request() req, @Param('id') id: string) {
    return this.planes_servicio.obtenerMaterialesPlanTratamiento(req.user.id, +id);
  }

  @Post(':id/confirmar-consumibles')
  confirmarConsumibles(@Request() req, @Param('id') id: string) {
    return this.planes_servicio.confirmarConsumiblesGenerales(req.user.id, +id);
  }

  @Delete('eliminar/:id')
  eliminarPlan(@Request() req, @Param('id') id: string) {
    return this.planes_servicio.eliminarPlan(req.user.id, +id);
  }
}
