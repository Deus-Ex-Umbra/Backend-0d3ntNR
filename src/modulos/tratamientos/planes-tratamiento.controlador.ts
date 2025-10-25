import { Controller, Post, Body, Param, Get, UseGuards } from '@nestjs/common';
import { PlanesTratamientoServicio } from './planes-tratamiento.servicio';
import { AsignarPlanTratamientoDto } from './dto/asignar-plan-tratamiento.dto';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../autenticacion/guardias/jwt-auth.guardia';

@ApiTags('Planes de Tratamiento')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('planes-tratamiento')
export class PlanesTratamientoControlador {
  constructor(private readonly planes_servicio: PlanesTratamientoServicio) {}

  @Post()
  asignarPlan(@Body() asignar_plan_dto: AsignarPlanTratamientoDto) {
    return this.planes_servicio.asignarPlan(asignar_plan_dto);
  }
  
  @Get()
  obtenerTodos() {
    return this.planes_servicio.obtenerTodos();
  }
  
  @Get('paciente/:paciente_id')
  obtenerPlanesPorPaciente(@Param('paciente_id') paciente_id: string) {
    return this.planes_servicio.obtenerPlanesPorPaciente(+paciente_id);
  }
}