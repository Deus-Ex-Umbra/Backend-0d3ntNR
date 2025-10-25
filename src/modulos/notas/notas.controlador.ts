import { Controller, Post, Body, Get, UseGuards, Request, Query } from '@nestjs/common';
import { NotasServicio } from './notas.servicio';
import { CrearNotaDiariaDto } from './dto/crear-nota-diaria.dto';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../autenticacion/guardias/jwt-auth.guardia';

@ApiTags('Notas Diarias')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notas')
export class NotasControlador {
  constructor(private readonly notas_servicio: NotasServicio) {}

  @Post()
  crear(@Request() req, @Body() crear_nota_dto: CrearNotaDiariaDto) {
    return this.notas_servicio.crear(req.user.id, crear_nota_dto);
  }

  @Get()
  obtenerNotas(@Request() req, @Query('dias') dias: string) {
    return this.notas_servicio.obtenerUltimasNotas(req.user.id, +dias);
  }
}