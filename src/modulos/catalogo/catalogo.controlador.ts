import { Controller, Get, Post, Delete, Param, Body, UseGuards, Put, Req } from '@nestjs/common';
import { CatalogoServicio } from './catalogo.servicio';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../autenticacion/guardias/jwt-auth.guardia';
import { CrearAlergiaDto } from './dto/crear-alergia.dto';
import { CrearEnfermedadDto } from './dto/crear-enfermedad.dto';
import { CrearMedicamentoDto } from './dto/crear-medicamento.dto';
import { CrearColorCategoriaDto } from './dto/crear-color-categoria.dto';
import { CrearEtiquetaDto } from './dto/crear-etiqueta.dto';
import { ActualizarAlergiaDto } from './dto/actualizar-alergia.dto';
import { ActualizarEnfermedadDto } from './dto/actualizar-enfermedad.dto';
import { ActualizarMedicamentoDto } from './dto/actualizar-medicamento.dto';
import { ActualizarColorCategoriaDto } from './dto/actualizar-color-categoria.dto';
import { ActualizarEtiquetaDto } from './dto/actualizar-etiqueta.dto';
import { CrearEtiquetaPlantillaDto } from './dto/crear-etiqueta-plantilla.dto';
import { ActualizarEtiquetaPlantillaDto } from './dto/actualizar-etiqueta-plantilla.dto';
import { CrearTamanoPapelDto } from './dto/crear-tamano-papel.dto';
import { ActualizarTamanoPapelDto } from './dto/actualizar-tamano-papel.dto';
import { ActualizarConfiguracionClinicaDto } from './dto/actualizar-configuracion-clinica.dto';

@ApiTags('Catálogo')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('catalogo')
export class CatalogoControlador {
  constructor(private readonly catalogo_servicio: CatalogoServicio) { }

  @Post('alergias')
  crearAlergia(@Body() dto: CrearAlergiaDto) {
    return this.catalogo_servicio.crearAlergia(dto);
  }

  @Get('alergias')
  obtenerAlergias() {
    return this.catalogo_servicio.obtenerAlergias();
  }

  @Put('alergias/:id')
  actualizarAlergia(@Param('id') id: string, @Body() dto: ActualizarAlergiaDto) {
    return this.catalogo_servicio.actualizarAlergia(+id, dto);
  }

  @Delete('alergias/:id')
  eliminarAlergia(@Param('id') id: string) {
    return this.catalogo_servicio.eliminarAlergia(+id);
  }

  @Post('enfermedades')
  crearEnfermedad(@Body() dto: CrearEnfermedadDto) {
    return this.catalogo_servicio.crearEnfermedad(dto);
  }

  @Get('enfermedades')
  obtenerEnfermedades() {
    return this.catalogo_servicio.obtenerEnfermedades();
  }

  @Put('enfermedades/:id')
  actualizarEnfermedad(@Param('id') id: string, @Body() dto: ActualizarEnfermedadDto) {
    return this.catalogo_servicio.actualizarEnfermedad(+id, dto);
  }

  @Delete('enfermedades/:id')
  eliminarEnfermedad(@Param('id') id: string) {
    return this.catalogo_servicio.eliminarEnfermedad(+id);
  }

  @Post('medicamentos')
  crearMedicamento(@Body() dto: CrearMedicamentoDto) {
    return this.catalogo_servicio.crearMedicamento(dto);
  }

  @Get('medicamentos')
  obtenerMedicamentos() {
    return this.catalogo_servicio.obtenerMedicamentos();
  }

  @Put('medicamentos/:id')
  actualizarMedicamento(@Param('id') id: string, @Body() dto: ActualizarMedicamentoDto) {
    return this.catalogo_servicio.actualizarMedicamento(+id, dto);
  }

  @Delete('medicamentos/:id')
  eliminarMedicamento(@Param('id') id: string) {
    return this.catalogo_servicio.eliminarMedicamento(+id);
  }

  @Post('colores')
  crearColor(@Body() dto: CrearColorCategoriaDto) {
    return this.catalogo_servicio.crearColor(dto);
  }

  @Get('colores')
  obtenerColores() {
    return this.catalogo_servicio.obtenerColores();
  }

  @Put('colores/:id')
  actualizarColor(@Param('id') id: string, @Body() dto: ActualizarColorCategoriaDto) {
    return this.catalogo_servicio.actualizarColor(+id, dto);
  }

  @Delete('colores/:id')
  eliminarColor(@Param('id') id: string) {
    return this.catalogo_servicio.eliminarColor(+id);
  }

  @Post('etiquetas')
  crearEtiqueta(@Body() dto: CrearEtiquetaDto) {
    return this.catalogo_servicio.crearEtiqueta(dto);
  }

  @Get('etiquetas')
  obtenerEtiquetas() {
    return this.catalogo_servicio.obtenerEtiquetas();
  }

  @Put('etiquetas/:id')
  actualizarEtiqueta(@Param('id') id: string, @Body() dto: ActualizarEtiquetaDto) {
    return this.catalogo_servicio.actualizarEtiqueta(+id, dto);
  }

  @Delete('etiquetas/:id')
  eliminarEtiqueta(@Param('id') id: string) {
    return this.catalogo_servicio.eliminarEtiqueta(+id);
  }

  @Post('etiquetas-plantilla')
  crearEtiquetaPlantilla(@Body() dto: CrearEtiquetaPlantillaDto, @Req() req: any) {
    return this.catalogo_servicio.crearEtiquetaPlantilla(req.user.id, dto);
  }

  @Get('etiquetas-plantilla')
  obtenerEtiquetasPlantilla(@Req() req: any) {
    return this.catalogo_servicio.obtenerEtiquetasPlantilla(req.user.id);
  }

  @Put('etiquetas-plantilla/:id')
  actualizarEtiquetaPlantilla(@Param('id') id: string, @Body() dto: ActualizarEtiquetaPlantillaDto, @Req() req: any) {
    return this.catalogo_servicio.actualizarEtiquetaPlantilla(+id, req.user.id, dto);
  }

  @Delete('etiquetas-plantilla/:id')
  eliminarEtiquetaPlantilla(@Param('id') id: string, @Req() req: any) {
    return this.catalogo_servicio.eliminarEtiquetaPlantilla(+id, req.user.id);
  }

  @Post('tamanos-papel')
  crearTamanoPapel(@Body() dto: CrearTamanoPapelDto) {
    return this.catalogo_servicio.crearTamanoPapel(dto);
  }

  @Get('tamanos-papel')
  obtenerTamanosPapel() {
    return this.catalogo_servicio.obtenerTamanosPapel();
  }

  @Put('tamanos-papel/:id')
  actualizarTamanoPapel(@Param('id') id: string, @Body() dto: ActualizarTamanoPapelDto) {
    return this.catalogo_servicio.actualizarTamanoPapel(+id, dto);
  }

  @Delete('tamanos-papel/:id')
  eliminarTamanoPapel(@Param('id') id: string) {
    return this.catalogo_servicio.eliminarTamanoPapel(+id);
  }

  @Get('configuracion-clinica')
  obtenerConfiguracionClinica(@Req() req: any) {
    return this.catalogo_servicio.obtenerConfiguracionClinica(req.user.id);
  }

  @Put('configuracion-clinica')
  actualizarConfiguracionClinica(@Body() dto: ActualizarConfiguracionClinicaDto, @Req() req: any) {
    return this.catalogo_servicio.actualizarConfiguracionClinica(req.user.id, dto);
  }
}
