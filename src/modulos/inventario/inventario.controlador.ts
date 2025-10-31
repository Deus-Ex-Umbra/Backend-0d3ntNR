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
import { RegistrarCompraDto } from './dto/registrar-compra.dto';
import { ConfirmarConsumiblesCitaDto } from './dto/confirmar-consumibles-cita.dto';
import { CambiarEstadoActivoDto } from './dto/cambiar-estado-activo.dto';
import { AsignarMaterialesCitaDto } from './dto/asignar-materiales-cita.dto';
import { ConfirmarMaterialesCitaDto } from './dto/confirmar-materiales-cita.dto';
import { AsignarMaterialesTratamientoDto } from './dto/asignar-materiales-tratamiento.dto';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../autenticacion/guardias/jwt-auth.guardia';
import { PermisoInventarioGuardia } from './guardias/permiso-inventario.guardia';
import { RolInventario } from './entidades/permiso-inventario.entidad';
import { AjustarStockDto } from './dto/ajustar-stock.dto';
import { ActualizarActivoDto } from './dto/actualizar-activo.dto';

export const RolInventarioDecorador = (rol: RolInventario) => SetMetadata('rol_inventario', rol);

@ApiTags('Inventario')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('inventario')
export class InventarioControlador {
  constructor(private readonly inventario_servicio: InventarioServicio) {}

  @Post()
  @ApiOperation({ summary: 'Crear nuevo inventario' })
  crear(@Request() req, @Body() dto: CrearInventarioDto) {
    return this.inventario_servicio.crearInventario(req.user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Obtener todos los inventarios del usuario' })
  obtenerTodos(@Request() req) {
    return this.inventario_servicio.obtenerInventarios(req.user.id);
  }

  @Get(':inventario_id')
  @ApiOperation({ summary: 'Obtener inventario por ID' })
  @UseGuards(PermisoInventarioGuardia)
  @RolInventarioDecorador(RolInventario.LECTOR)
  obtenerPorId(@Request() req, @Param('inventario_id') inventario_id: string) {
    return this.inventario_servicio.obtenerInventarioPorId(req.user.id, +inventario_id);
  }

  @Put(':inventario_id')
  @ApiOperation({ summary: 'Actualizar inventario' })
  actualizarInventario(
    @Request() req,
    @Param('inventario_id') inventario_id: string,
    @Body() dto: ActualizarInventarioDto,
  ) {
    return this.inventario_servicio.actualizarInventario(req.user.id, +inventario_id, dto);
  }

  @Post(':inventario_id/invitar')
  @ApiOperation({ summary: 'Invitar usuario a inventario' })
  @UseGuards(PermisoInventarioGuardia)
  invitarUsuario(@Request() req, @Param('inventario_id') inventario_id: string, @Body() dto: InvitarUsuarioInventarioDto) {
    return this.inventario_servicio.invitarUsuario(req.user.id, +inventario_id, dto);
  }

  @Delete(':inventario_id/permisos/:permiso_id')
  @ApiOperation({ summary: 'Eliminar permiso de usuario' })
  @UseGuards(PermisoInventarioGuardia)
  eliminarPermiso(
    @Request() req,
    @Param('inventario_id') inventario_id: string,
    @Param('permiso_id') permiso_id: string,
  ) {
    return this.inventario_servicio.eliminarPermiso(req.user.id, +inventario_id, +permiso_id);
  }

  @Delete(':inventario_id')
  @ApiOperation({ summary: 'Eliminar inventario' })
  eliminarInventario(@Request() req, @Param('inventario_id') inventario_id: string) {
    return this.inventario_servicio.eliminarInventario(req.user.id, +inventario_id);
  }

  @Post('productos')
  @ApiOperation({ summary: 'Crear nuevo producto' })
  @UseGuards(PermisoInventarioGuardia)
  @RolInventarioDecorador(RolInventario.EDITOR)
  crearProducto(@Request() req, @Body() dto: CrearProductoDto) {
    return this.inventario_servicio.crearProducto(req.user.id, dto);
  }

  @Get(':inventario_id/productos')
  @ApiOperation({ summary: 'Obtener productos de un inventario' })
  @UseGuards(PermisoInventarioGuardia)
  @RolInventarioDecorador(RolInventario.LECTOR)
  obtenerProductos(@Request() req, @Param('inventario_id') inventario_id: string) {
    return this.inventario_servicio.obtenerProductos(req.user.id, +inventario_id);
  }

  @Get(':inventario_id/productos/:producto_id/stock')
  @ApiOperation({ summary: 'Obtener stock actual de un producto' })
  @UseGuards(PermisoInventarioGuardia)
  @RolInventarioDecorador(RolInventario.LECTOR)
  obtenerStockProducto(
    @Request() req,
    @Param('inventario_id') inventario_id: string,
    @Param('producto_id') producto_id: string,
  ) {
    return this.inventario_servicio.obtenerStockProducto(req.user.id, +inventario_id, +producto_id);
  }

  @Put(':inventario_id/productos/:producto_id')
  @ApiOperation({ summary: 'Actualizar producto' })
  @UseGuards(PermisoInventarioGuardia)
  @RolInventarioDecorador(RolInventario.EDITOR)
  actualizarProducto(
    @Request() req,
    @Param('inventario_id') inventario_id: string,
    @Param('producto_id') producto_id: string,
    @Body() dto: ActualizarProductoDto,
  ) {
    return this.inventario_servicio.actualizarProducto(req.user.id, +inventario_id, +producto_id, dto);
  }

  @Delete(':inventario_id/productos/:producto_id')
  @ApiOperation({ summary: 'Eliminar producto (borrado lógico)' })
  @UseGuards(PermisoInventarioGuardia)
  @RolInventarioDecorador(RolInventario.EDITOR)
  eliminarProducto(
    @Request() req,
    @Param('inventario_id') inventario_id: string,
    @Param('producto_id') producto_id: string,
  ) {
    return this.inventario_servicio.eliminarProducto(req.user.id, +inventario_id, +producto_id);
  }

  @Post(':inventario_id/registrar-compra')
  @ApiOperation({ summary: 'Registrar compra de producto' })
  @UseGuards(PermisoInventarioGuardia)
  @RolInventarioDecorador(RolInventario.EDITOR)
  registrarCompra(@Request() req, @Param('inventario_id') inventario_id: string, @Body() dto: RegistrarCompraDto) {
    return this.inventario_servicio.registrarCompra(req.user.id, +inventario_id, dto);
  }

  @Post('citas/:cita_id/confirmar-consumibles')
  @ApiOperation({ summary: 'Confirmar consumibles usados en una cita (método antiguo, usar materiales en su lugar)' })
  confirmarConsumibles(@Request() req, @Param('cita_id') cita_id: string, @Body() dto: ConfirmarConsumiblesCitaDto) {
    return this.inventario_servicio.confirmarConsumiblesCita(req.user.id, +cita_id, dto);
  }

  @Post('citas/:cita_id/asignar-materiales')
  @ApiOperation({ summary: 'Asignar materiales planeados a una cita' })
  asignarMaterialesCita(@Request() req, @Param('cita_id') cita_id: string, @Body() dto: AsignarMaterialesCitaDto) {
    return this.inventario_servicio.asignarMaterialesCita(req.user.id, +cita_id, dto);
  }

  @Get('citas/:cita_id/materiales')
  @ApiOperation({ summary: 'Obtener materiales asignados a una cita' })
  obtenerMaterialesCita(@Request() req, @Param('cita_id') cita_id: string) {
    return this.inventario_servicio.obtenerMaterialesCita(req.user.id, +cita_id);
  }

  @Post('citas/:cita_id/confirmar-materiales')
  @ApiOperation({ summary: 'Confirmar materiales realmente usados en una cita' })
  confirmarMaterialesCita(@Request() req, @Param('cita_id') cita_id: string, @Body() dto: ConfirmarMaterialesCitaDto) {
    return this.inventario_servicio.confirmarMaterialesCita(req.user.id, +cita_id, dto);
  }

  @Post('tratamientos/:plan_tratamiento_id/asignar-materiales')
  @ApiOperation({ summary: 'Asignar materiales a un tratamiento' })
  asignarMaterialesTratamiento(
    @Request() req,
    @Param('plan_tratamiento_id') plan_tratamiento_id: string,
    @Body() dto: AsignarMaterialesTratamientoDto,
  ) {
    return this.inventario_servicio.asignarMaterialesTratamiento(req.user.id, +plan_tratamiento_id, dto);
  }

  @Put(':inventario_id/activos/:activo_id/estado')
  @ApiOperation({ summary: 'Cambiar estado de un activo' })
  @UseGuards(PermisoInventarioGuardia)
  @RolInventarioDecorador(RolInventario.EDITOR)
  cambiarEstadoActivo(
    @Request() req,
    @Param('inventario_id') inventario_id: string,
    @Param('activo_id') activo_id: string,
    @Body() dto: CambiarEstadoActivoDto,
  ) {
    return this.inventario_servicio.cambiarEstadoActivo(req.user.id, +inventario_id, +activo_id, dto);
  }

  @Get(':inventario_id/activos/:activo_id/historial')
  @ApiOperation({ summary: 'Obtener historial de cambios de estado de un activo' })
  @UseGuards(PermisoInventarioGuardia)
  @RolInventarioDecorador(RolInventario.LECTOR)
  obtenerHistorialActivo(
    @Request() req,
    @Param('inventario_id') inventario_id: string,
    @Param('activo_id') activo_id: string,
  ) {
    return this.inventario_servicio.obtenerHistorialActivo(req.user.id, +inventario_id, +activo_id);
  }

  @Get(':inventario_id/historial-movimientos')
  @ApiOperation({ summary: 'Obtener historial de movimientos del inventario' })
  @ApiQuery({ name: 'producto_id', required: false, type: Number, description: 'Filtrar por producto específico' })
  @UseGuards(PermisoInventarioGuardia)
  @RolInventarioDecorador(RolInventario.LECTOR)
  obtenerHistorialMovimientos(
    @Request() req,
    @Param('inventario_id') inventario_id: string,
    @Query('producto_id') producto_id?: string,
  ) {
    return this.inventario_servicio.obtenerHistorialMovimientos(
      req.user.id,
      +inventario_id,
      producto_id ? +producto_id : undefined,
    );
  }

  @Get(':inventario_id/reporte-valor')
  @ApiOperation({ summary: 'Obtener reporte de valor total del inventario' })
  @UseGuards(PermisoInventarioGuardia)
  @RolInventarioDecorador(RolInventario.LECTOR)
  obtenerReporteValor(@Request() req, @Param('inventario_id') inventario_id: string) {
    return this.inventario_servicio.obtenerReporteValorInventario(req.user.id, +inventario_id);
  }

  @Delete(':inventario_id/lotes/:lote_id')
  @ApiOperation({ summary: 'Eliminar lote' })
  @UseGuards(PermisoInventarioGuardia)
  @RolInventarioDecorador(RolInventario.EDITOR)
  eliminarLote(
    @Request() req,
    @Param('inventario_id') inventario_id: string,
    @Param('lote_id') lote_id: string,
  ) {
    return this.inventario_servicio.eliminarLote(req.user.id, +inventario_id, +lote_id);
  }

  @Put(':inventario_id/activos/:activo_id')
  @ApiOperation({ summary: 'Actualizar activo' })
  @UseGuards(PermisoInventarioGuardia)
  @RolInventarioDecorador(RolInventario.EDITOR)
  actualizarActivo(
    @Request() req,
    @Param('inventario_id') inventario_id: string,
    @Param('activo_id') activo_id: string,
    @Body() dto: ActualizarActivoDto,
  ) {
    return this.inventario_servicio.actualizarActivo(req.user.id, +inventario_id, +activo_id, dto);
  }

  @Delete(':inventario_id/activos/:activo_id')
  @ApiOperation({ summary: 'Eliminar activo' })
  @UseGuards(PermisoInventarioGuardia)
  @RolInventarioDecorador(RolInventario.EDITOR)
  eliminarActivo(
    @Request() req,
    @Param('inventario_id') inventario_id: string,
    @Param('activo_id') activo_id: string,
  ) {
    return this.inventario_servicio.eliminarActivo(req.user.id, +inventario_id, +activo_id);
  }

  @Post(':inventario_id/ajustar-stock')
  @ApiOperation({ summary: 'Ajuste manual de stock' })
  @UseGuards(PermisoInventarioGuardia)
  @RolInventarioDecorador(RolInventario.EDITOR)
  ajustarStock(
    @Request() req,
    @Param('inventario_id') inventario_id: string,
    @Body() dto: AjustarStockDto,
  ) {
    return this.inventario_servicio.ajustarStock(req.user.id, +inventario_id, dto);
  }
}