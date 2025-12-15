import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  SetMetadata,
  Query,
} from '@nestjs/common';
import { InventarioServicio } from './inventario.servicio';
import { CrearInventarioDto } from './dto/crear-inventario.dto';
import { ActualizarInventarioDto } from './dto/actualizar-inventario.dto';
import { InvitarUsuarioInventarioDto } from './dto/invitar-usuario-inventario.dto';
import { CrearProductoDto } from './dto/crear-producto.dto';
import { ActualizarProductoDto } from './dto/actualizar-producto.dto';
import { RegistrarEntradaMaterialDto, RegistrarEntradaActivoDto } from './dto/registrar-entrada.dto';
import { RegistrarSalidaMaterialDto, RegistrarSalidaActivoDto } from './dto/registrar-salida.dto';
import { CambiarEstadoActivoDto } from './dto/cambiar-estado-activo.dto';
import { ActualizarActivoDto } from './dto/actualizar-activo.dto';
import { AjustarStockDto } from './dto/ajustar-stock.dto';
import { ReservarMaterialesCitaDto, ReservarActivosCitaDto } from './dto/reservar.dto';
import { ConfirmarReservasCitaDto, CancelarReservasDto } from './dto/confirmar-reservas.dto';
import { FiltrosKardexDto, FiltrosBitacoraDto, FiltrosAuditoriaDto } from './dto/filtros-historial.dto';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../autenticacion/guardias/jwt-auth.guardia';
import { PermisoInventarioGuardia } from './guardias/permiso-inventario.guardia';
import { RolInventario } from './entidades/permiso-inventario.entidad';

const RolInventarioDecorador = (rol: RolInventario) => SetMetadata('rol_inventario', rol);

@ApiTags('Inventario')
@ApiBearerAuth()
@Controller('inventario')
@UseGuards(JwtAuthGuard)
export class InventarioControlador {
  constructor(private readonly inventario_servicio: InventarioServicio) { }
  @Post()
  @ApiOperation({ summary: 'Crear un nuevo inventario' })
  crear(@Request() req, @Body() dto: CrearInventarioDto) {
    return this.inventario_servicio.crearInventario(req.user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Obtener todos los inventarios del usuario' })
  obtenerTodos(@Request() req) {
    return this.inventario_servicio.obtenerInventarios(req.user.id);
  }

  @Get(':inventario_id')
  @ApiOperation({ summary: 'Obtener un inventario por ID' })
  @UseGuards(PermisoInventarioGuardia)
  obtenerPorId(@Request() req, @Param('inventario_id') inventario_id: string) {
    return this.inventario_servicio.obtenerInventarioPorId(req.user.id, +inventario_id);
  }

  @Put(':inventario_id')
  @ApiOperation({ summary: 'Actualizar un inventario' })
  @RolInventarioDecorador(RolInventario.EDITOR)
  @UseGuards(PermisoInventarioGuardia)
  actualizarInventario(
    @Request() req,
    @Param('inventario_id') inventario_id: string,
    @Body() dto: ActualizarInventarioDto,
  ) {
    return this.inventario_servicio.actualizarInventario(req.user.id, +inventario_id, dto);
  }

  @Post(':inventario_id/invitar')
  @ApiOperation({ summary: 'Invitar un usuario al inventario' })
  invitarUsuario(@Request() req, @Param('inventario_id') inventario_id: string, @Body() dto: InvitarUsuarioInventarioDto) {
    return this.inventario_servicio.invitarUsuario(req.user.id, +inventario_id, dto);
  }

  @Delete(':inventario_id/permisos/:permiso_id')
  @ApiOperation({ summary: 'Eliminar permiso de un usuario' })
  eliminarPermiso(
    @Request() req,
    @Param('inventario_id') inventario_id: string,
    @Param('permiso_id') permiso_id: string,
  ) {
    return this.inventario_servicio.eliminarPermiso(req.user.id, +inventario_id, +permiso_id);
  }

  @Delete(':inventario_id')
  @ApiOperation({ summary: 'Eliminar un inventario' })
  eliminarInventario(@Request() req, @Param('inventario_id') inventario_id: string) {
    return this.inventario_servicio.eliminarInventario(req.user.id, +inventario_id);
  }

  @Post('productos')
  @ApiOperation({ summary: 'Crear un nuevo producto' })
  @RolInventarioDecorador(RolInventario.EDITOR)
  crearProducto(@Request() req, @Body() dto: CrearProductoDto) {
    return this.inventario_servicio.crearProducto(req.user.id, dto);
  }

  @Get(':inventario_id/productos')
  @ApiOperation({ summary: 'Obtener productos de un inventario' })
  @UseGuards(PermisoInventarioGuardia)
  obtenerProductos(@Request() req, @Param('inventario_id') inventario_id: string) {
    return this.inventario_servicio.obtenerProductos(req.user.id, +inventario_id);
  }

  @Get(':inventario_id/productos/:producto_id')
  @ApiOperation({ summary: 'Obtener un producto por ID' })
  @UseGuards(PermisoInventarioGuardia)
  obtenerProductoPorId(
    @Request() req,
    @Param('inventario_id') inventario_id: string,
    @Param('producto_id') producto_id: string,
  ) {
    return this.inventario_servicio.obtenerProductoPorId(req.user.id, +inventario_id, +producto_id);
  }

  @Get(':inventario_id/productos/:producto_id/stock')
  @ApiOperation({ summary: 'Obtener stock de un producto' })
  @UseGuards(PermisoInventarioGuardia)
  obtenerStockProducto(
    @Request() req,
    @Param('inventario_id') inventario_id: string,
    @Param('producto_id') producto_id: string,
  ) {
    return this.inventario_servicio.obtenerStockProducto(req.user.id, +inventario_id, +producto_id);
  }

  @Put(':inventario_id/productos/:producto_id')
  @ApiOperation({ summary: 'Actualizar un producto' })
  @RolInventarioDecorador(RolInventario.EDITOR)
  @UseGuards(PermisoInventarioGuardia)
  actualizarProducto(
    @Request() req,
    @Param('inventario_id') inventario_id: string,
    @Param('producto_id') producto_id: string,
    @Body() dto: ActualizarProductoDto,
  ) {
    return this.inventario_servicio.actualizarProducto(req.user.id, +inventario_id, +producto_id, dto);
  }

  @Delete(':inventario_id/productos/:producto_id')
  @ApiOperation({ summary: 'Eliminar un producto' })
  @RolInventarioDecorador(RolInventario.EDITOR)
  @UseGuards(PermisoInventarioGuardia)
  eliminarProducto(
    @Request() req,
    @Param('inventario_id') inventario_id: string,
    @Param('producto_id') producto_id: string,
  ) {
    return this.inventario_servicio.eliminarProducto(req.user.id, +inventario_id, +producto_id);
  }

  @Post(':inventario_id/materiales/entrada')
  @ApiOperation({ summary: 'Registrar entrada de material (consumible)' })
  @RolInventarioDecorador(RolInventario.EDITOR)
  @UseGuards(PermisoInventarioGuardia)
  registrarEntradaMaterial(
    @Request() req,
    @Param('inventario_id') inventario_id: string,
    @Body() dto: RegistrarEntradaMaterialDto,
  ) {
    return this.inventario_servicio.registrarEntradaMaterial(req.user.id, +inventario_id, dto);
  }

  @Post(':inventario_id/activos/entrada')
  @ApiOperation({ summary: 'Registrar entrada de activo fijo' })
  @RolInventarioDecorador(RolInventario.EDITOR)
  @UseGuards(PermisoInventarioGuardia)
  registrarEntradaActivo(
    @Request() req,
    @Param('inventario_id') inventario_id: string,
    @Body() dto: RegistrarEntradaActivoDto,
  ) {
    return this.inventario_servicio.registrarEntradaActivo(req.user.id, +inventario_id, dto);
  }

  @Post(':inventario_id/materiales/salida')
  @ApiOperation({ summary: 'Registrar salida de material' })
  @RolInventarioDecorador(RolInventario.EDITOR)
  @UseGuards(PermisoInventarioGuardia)
  registrarSalidaMaterial(
    @Request() req,
    @Param('inventario_id') inventario_id: string,
    @Body() dto: RegistrarSalidaMaterialDto,
  ) {
    return this.inventario_servicio.registrarSalidaMaterial(req.user.id, +inventario_id, dto);
  }

  @Post(':inventario_id/activos/:activo_id/vender')
  @ApiOperation({ summary: 'Vender un activo fijo' })
  @RolInventarioDecorador(RolInventario.EDITOR)
  @UseGuards(PermisoInventarioGuardia)
  venderActivo(
    @Request() req,
    @Param('inventario_id') inventario_id: string,
    @Param('activo_id') activo_id: string,
    @Body() dto: RegistrarSalidaActivoDto,
  ) {
    return this.inventario_servicio.venderActivo(req.user.id, +inventario_id, +activo_id, dto);
  }

  @Put(':inventario_id/activos/:activo_id')
  @ApiOperation({ summary: 'Actualizar un activo' })
  @RolInventarioDecorador(RolInventario.EDITOR)
  @UseGuards(PermisoInventarioGuardia)
  actualizarActivo(
    @Request() req,
    @Param('inventario_id') inventario_id: string,
    @Param('activo_id') activo_id: string,
    @Body() dto: ActualizarActivoDto,
  ) {
    return this.inventario_servicio.actualizarActivo(req.user.id, +inventario_id, +activo_id, dto);
  }

  @Put(':inventario_id/activos/:activo_id/estado')
  @ApiOperation({ summary: 'Cambiar estado de un activo' })
  @RolInventarioDecorador(RolInventario.EDITOR)
  @UseGuards(PermisoInventarioGuardia)
  cambiarEstadoActivo(
    @Request() req,
    @Param('inventario_id') inventario_id: string,
    @Param('activo_id') activo_id: string,
    @Body() dto: CambiarEstadoActivoDto,
  ) {
    return this.inventario_servicio.cambiarEstadoActivo(req.user.id, +inventario_id, +activo_id, dto);
  }

  @Post(':inventario_id/ajustar-stock')
  @ApiOperation({ summary: 'Ajustar stock de un producto' })
  @RolInventarioDecorador(RolInventario.EDITOR)
  @UseGuards(PermisoInventarioGuardia)
  ajustarStock(
    @Request() req,
    @Param('inventario_id') inventario_id: string,
    @Body() dto: AjustarStockDto,
  ) {
    return this.inventario_servicio.ajustarStock(req.user.id, +inventario_id, dto);
  }

  @Get(':inventario_id/reporte/valor')
  @ApiOperation({ summary: 'Obtener reporte de valor del inventario' })
  @UseGuards(PermisoInventarioGuardia)
  obtenerReporteValor(@Request() req, @Param('inventario_id') inventario_id: string) {
    return this.inventario_servicio.obtenerReporteValorInventario(req.user.id, +inventario_id);
  }
  @Get(':inventario_id/kardex')
  @ApiOperation({ summary: 'Obtener historial Kardex del inventario' })
  @UseGuards(PermisoInventarioGuardia)
  obtenerKardex(
    @Request() req,
    @Param('inventario_id') inventario_id: string,
    @Query() filtros: FiltrosKardexDto,
  ) {
    return this.inventario_servicio.kardex.obtenerHistorialInventario(+inventario_id, filtros);
  }

  @Get(':inventario_id/kardex/producto/:producto_id')
  @ApiOperation({ summary: 'Obtener historial Kardex de un producto' })
  @UseGuards(PermisoInventarioGuardia)
  obtenerKardexProducto(
    @Request() req,
    @Param('inventario_id') inventario_id: string,
    @Param('producto_id') producto_id: string,
    @Query() filtros: FiltrosKardexDto,
  ) {
    return this.inventario_servicio.kardex.obtenerHistorialProducto(+inventario_id, +producto_id, filtros);
  }

  @Get(':inventario_id/kardex/reporte')
  @ApiOperation({ summary: 'Generar reporte Kardex' })
  @UseGuards(PermisoInventarioGuardia)
  generarReporteKardex(
    @Request() req,
    @Param('inventario_id') inventario_id: string,
    @Query('fecha_inicio') fecha_inicio: string,
    @Query('fecha_fin') fecha_fin: string,
  ) {
    return this.inventario_servicio.kardex.generarReporteKardex(
      +inventario_id,
      new Date(fecha_inicio),
      new Date(fecha_fin),
    );
  }

  @Get(':inventario_id/bitacora')
  @ApiOperation({ summary: 'Obtener bitácora de activos del inventario' })
  @UseGuards(PermisoInventarioGuardia)
  obtenerBitacora(
    @Request() req,
    @Param('inventario_id') inventario_id: string,
    @Query() filtros: FiltrosBitacoraDto,
  ) {
    return this.inventario_servicio.bitacora.obtenerHistorialInventario(+inventario_id, filtros);
  }

  @Get(':inventario_id/bitacora/activo/:activo_id')
  @ApiOperation({ summary: 'Obtener bitácora de un activo específico' })
  @UseGuards(PermisoInventarioGuardia)
  obtenerBitacoraActivo(
    @Request() req,
    @Param('inventario_id') inventario_id: string,
    @Param('activo_id') activo_id: string,
    @Query() filtros: FiltrosBitacoraDto,
  ) {
    return this.inventario_servicio.bitacora.obtenerHistorialActivo(+inventario_id, +activo_id, filtros);
  }

  @Get(':inventario_id/bitacora/recientes')
  @ApiOperation({ summary: 'Obtener eventos recientes de bitácora' })
  @UseGuards(PermisoInventarioGuardia)
  obtenerEventosRecientes(
    @Request() req,
    @Param('inventario_id') inventario_id: string,
    @Query('limite') limite?: number,
  ) {
    return this.inventario_servicio.bitacora.obtenerEventosRecientes(+inventario_id, limite);
  }

  @Get(':inventario_id/auditoria')
  @ApiOperation({ summary: 'Buscar en auditoría (búsqueda avanzada)' })
  @UseGuards(PermisoInventarioGuardia)
  buscarAuditoria(
    @Request() req,
    @Param('inventario_id') inventario_id: string,
    @Query() filtros: FiltrosAuditoriaDto,
  ) {
    return this.inventario_servicio.auditoria.buscarAuditoria(+inventario_id, filtros);
  }

  @Get(':inventario_id/auditoria/producto/:producto_id')
  @ApiOperation({ summary: 'Obtener auditoría de un producto' })
  @UseGuards(PermisoInventarioGuardia)
  obtenerAuditoriaProducto(
    @Request() req,
    @Param('inventario_id') inventario_id: string,
    @Param('producto_id') producto_id: string,
    @Query() filtros: FiltrosAuditoriaDto,
  ) {
    return this.inventario_servicio.auditoria.obtenerHistorialProducto(+inventario_id, +producto_id, filtros);
  }

  @Get(':inventario_id/auditoria/usuario/:usuario_id')
  @ApiOperation({ summary: 'Obtener acciones de un usuario' })
  @UseGuards(PermisoInventarioGuardia)
  obtenerAccionesUsuario(
    @Request() req,
    @Param('inventario_id') inventario_id: string,
    @Param('usuario_id') usuario_id: string,
    @Query() filtros: FiltrosAuditoriaDto,
  ) {
    return this.inventario_servicio.auditoria.obtenerAccionesUsuario(+inventario_id, +usuario_id, filtros);
  }

  @Get(':inventario_id/auditoria/reporte-antisabotaje')
  @ApiOperation({ summary: 'Generar reporte anti-sabotaje' })
  @UseGuards(PermisoInventarioGuardia)
  generarReporteAntiSabotaje(
    @Request() req,
    @Param('inventario_id') inventario_id: string,
    @Query('fecha_inicio') fecha_inicio: string,
    @Query('fecha_fin') fecha_fin: string,
  ) {
    return this.inventario_servicio.auditoria.generarReporteAntiSabotaje(
      +inventario_id,
      new Date(fecha_inicio),
      new Date(fecha_fin),
    );
  }

  @Get(':inventario_id/auditoria/buscar-datos')
  @ApiOperation({ summary: 'Buscar en datos JSON de auditoría' })
  @UseGuards(PermisoInventarioGuardia)
  buscarEnDatos(
    @Request() req,
    @Param('inventario_id') inventario_id: string,
    @Query('texto') texto: string,
    @Query('limite') limite?: number,
  ) {
    return this.inventario_servicio.auditoria.buscarEnDatos(+inventario_id, texto, limite);
  }

  @Get('citas/:cita_id/reservas')
  @ApiOperation({ summary: 'Obtener reservas de una cita' })
  obtenerReservasCita(@Request() req, @Param('cita_id') cita_id: string) {
    return this.inventario_servicio.reservas.obtenerReservasCita(+cita_id);
  }

  @Post('citas/:cita_id/confirmar-materiales')
  @ApiOperation({ summary: 'Confirmar uso de materiales de una cita' })
  confirmarMaterialesCita(
    @Request() req,
    @Param('cita_id') cita_id: string,
    @Body() body: { materiales: { material_cita_id: number; cantidad_usada: number }[] }
  ) {
    return this.inventario_servicio.reservas.confirmarMaterialesCita(+cita_id, body.materiales, req.user.id);
  }

  @Get('tratamientos/:plan_id/reservas')
  @ApiOperation({ summary: 'Obtener reservas de un plan de tratamiento' })
  obtenerReservasTratamiento(@Request() req, @Param('plan_id') plan_id: string) {
    return this.inventario_servicio.reservas.obtenerReservasTratamiento(+plan_id);
  }

  @Get(':inventario_id/activos-disponibles')
  @ApiOperation({ summary: 'Obtener activos disponibles para un rango de tiempo' })
  @UseGuards(PermisoInventarioGuardia)
  obtenerActivosDisponibles(
    @Request() req,
    @Param('inventario_id') inventario_id: string,
    @Query('producto_id') producto_id: string,
    @Query('fecha_inicio') fecha_inicio: string,
    @Query('fecha_fin') fecha_fin: string,
    @Query('cita_id_excluir') cita_id_excluir?: string,
  ) {
    return this.inventario_servicio.reservas.obtenerActivosDisponibles(
      +producto_id,
      new Date(fecha_inicio),
      new Date(fecha_fin),
      cita_id_excluir ? +cita_id_excluir : undefined,
    );
  }

  @Post('verificar-disponibilidad-activo')
  @ApiOperation({ summary: 'Verificar disponibilidad de un activo' })
  verificarDisponibilidadActivo(
    @Request() req,
    @Body() body: { activo_id: number; fecha_inicio: string; fecha_fin: string; cita_id_excluir?: number },
  ) {
    return this.inventario_servicio.reservas.verificarDisponibilidadActivo(
      body.activo_id,
      new Date(body.fecha_inicio),
      new Date(body.fecha_fin),
      body.cita_id_excluir,
    );
  }
}