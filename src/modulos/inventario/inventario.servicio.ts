import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, In } from 'typeorm';
import { Inventario, VisibilidadInventario } from './entidades/inventario.entidad';
import { PermisoInventario, RolInventario } from './entidades/permiso-inventario.entidad';
import { Producto, TipoProducto, SubtipoMaterial, SubtipoActivoFijo } from './entidades/producto.entidad';
import { Material } from './entidades/material.entidad';
import { Activo, EstadoActivo } from './entidades/activo.entidad';
import { MaterialCita } from './entidades/material-cita.entidad';
import { MaterialTratamiento, TipoMaterialTratamiento } from './entidades/material-tratamiento.entidad';
import { TipoMovimientoKardex } from './entidades/kardex.entidad';
import { TipoAccionAuditoria } from './entidades/auditoria.entidad';
import { Usuario } from '../usuarios/entidades/usuario.entidad';
import { Cita } from '../agenda/entidades/cita.entidad';
import { PlanTratamiento } from '../tratamientos/entidades/plan-tratamiento.entidad';
import { KardexServicio } from './kardex.servicio';
import { BitacoraServicio } from './bitacora.servicio';
import { AuditoriaServicio } from './auditoria.servicio';
import { ReservasServicio } from './reservas.servicio';
import { FinanzasServicio } from '../finanzas/finanzas.servicio';
import { CrearInventarioDto } from './dto/crear-inventario.dto';
import { ActualizarInventarioDto } from './dto/actualizar-inventario.dto';
import { InvitarUsuarioInventarioDto } from './dto/invitar-usuario-inventario.dto';
import { CrearProductoDto } from './dto/crear-producto.dto';
import { ActualizarProductoDto } from './dto/actualizar-producto.dto';
import { RegistrarEntradaMaterialDto, RegistrarEntradaActivoDto } from './dto/registrar-entrada.dto';
import { RegistrarSalidaMaterialDto, RegistrarSalidaActivoDto } from './dto/registrar-salida.dto';
import { CambiarEstadoActivoDto } from './dto/cambiar-estado-activo.dto';
import { ActualizarActivoDto } from './dto/actualizar-activo.dto';
import { AjustarStockDto, TipoAjuste } from './dto/ajustar-stock.dto';
import { AsignarMaterialesTratamientoDto } from './dto/asignar-materiales-tratamiento.dto';
import { ConfirmarMaterialesGeneralesDto } from './dto/confirmar-materiales-generales.dto';

@Injectable()
export class InventarioServicio {
  constructor(
    @InjectRepository(Inventario)
    private readonly inventario_repositorio: Repository<Inventario>,
    @InjectRepository(PermisoInventario)
    private readonly permiso_repositorio: Repository<PermisoInventario>,
    @InjectRepository(Producto)
    private readonly producto_repositorio: Repository<Producto>,
    @InjectRepository(Material)
    private readonly material_repositorio: Repository<Material>,
    @InjectRepository(Activo)
    private readonly activo_repositorio: Repository<Activo>,
    @InjectRepository(MaterialCita)
    private readonly material_cita_repositorio: Repository<MaterialCita>,
    @InjectRepository(MaterialTratamiento)
    private readonly material_tratamiento_repositorio: Repository<MaterialTratamiento>,
    @InjectRepository(Cita)
    private readonly cita_repositorio: Repository<Cita>,
    @InjectRepository(PlanTratamiento)
    private readonly plan_tratamiento_repositorio: Repository<PlanTratamiento>,
    private readonly kardex_servicio: KardexServicio,
    private readonly bitacora_servicio: BitacoraServicio,
    private readonly auditoria_servicio: AuditoriaServicio,
    private readonly reservas_servicio: ReservasServicio,
    @Inject(forwardRef(() => FinanzasServicio))
    private readonly finanzas_servicio: FinanzasServicio,
  ) { }

  async crearInventario(usuario_id: number, dto: CrearInventarioDto): Promise<Inventario> {
    const inventario = this.inventario_repositorio.create({
      ...dto,
      propietario: { id: usuario_id } as Usuario,
    });
    const guardado = await this.inventario_repositorio.save(inventario);
    await this.auditoria_servicio.registrarAccion(
      guardado,
      TipoAccionAuditoria.INVENTARIO_CREADO,
      usuario_id,
      { datos_nuevos: dto },
    );

    return guardado;
  }

  async obtenerInventarios(usuario_id: number): Promise<any[]> {
    const inventarios_propios = await this.inventario_repositorio.find({
      where: { propietario: { id: usuario_id } },
      relations: ['propietario', 'permisos', 'permisos.usuario_invitado', 'productos', 'productos.materiales', 'productos.activos'],
    });

    const permisos = await this.permiso_repositorio.find({
      where: { usuario_invitado: { id: usuario_id } },
      relations: ['inventario', 'inventario.propietario', 'inventario.productos', 'inventario.productos.materiales', 'inventario.productos.activos'],
    });

    const inventarios_compartidos = permisos.map(p => ({
      ...p.inventario,
      rol_usuario: p.rol,
      es_propietario: false,
      resumen: this.calcularResumenInventario(p.inventario),
    }));

    const inventarios_propios_formateados = inventarios_propios.map(inv => ({
      ...inv,
      es_propietario: true,
      resumen: this.calcularResumenInventario(inv),
    }));

    return [...inventarios_propios_formateados, ...inventarios_compartidos];
  }

  private calcularResumenInventario(inventario: any): any {
    const productos = inventario.productos || [];
    let valor_total = 0;
    let total_consumibles = 0;
    let total_activos = 0;

    for (const producto of productos) {
      if (producto.tipo === TipoProducto.MATERIAL && producto.materiales) {
        for (const m of producto.materiales.filter((mat: Material) => mat.activo)) {
          valor_total += Number(m.cantidad_actual) * Number(m.costo_unitario || 0);
          total_consumibles += Number(m.cantidad_actual);
        }
      } else if (producto.tipo === TipoProducto.ACTIVO_FIJO && producto.activos) {
        const activos_validos = producto.activos.filter((a: Activo) => a.estado !== EstadoActivo.DESECHADO);
        total_activos += activos_validos.length;
        for (const a of activos_validos) {
          valor_total += Number(a.costo_compra || 0);
        }
      }
    }

    return {
      valor_total: Math.round(valor_total * 100) / 100,
      total_productos: productos.length,
      total_consumibles,
      total_activos,
    };
  }

  async obtenerInventarioPorId(usuario_id: number, inventario_id: number): Promise<any> {
    const inventario = await this.inventario_repositorio.findOne({
      where: { id: inventario_id },
      relations: ['propietario', 'permisos', 'permisos.usuario_invitado', 'productos'],
    });

    if (!inventario) {
      throw new NotFoundException('Inventario no encontrado');
    }

    const es_propietario = inventario.propietario.id === usuario_id;
    const permiso = inventario.permisos.find(p => p.usuario_invitado?.id === usuario_id);

    if (!es_propietario && !permiso && inventario.visibilidad !== VisibilidadInventario.PUBLICO) {
      throw new ForbiddenException('No tiene acceso a este inventario');
    }

    return {
      ...inventario,
      es_propietario,
      rol_usuario: es_propietario ? 'propietario' : permiso?.rol,
      resumen: this.calcularResumenInventario(inventario),
    };
  }

  async actualizarInventario(
    usuario_id: number,
    inventario_id: number,
    dto: ActualizarInventarioDto,
  ): Promise<Inventario> {
    const inventario = await this.obtenerInventarioPorId(usuario_id, inventario_id);

    const datos_anteriores = { ...inventario };
    Object.assign(inventario, dto);

    const actualizado = await this.inventario_repositorio.save(inventario);

    await this.auditoria_servicio.registrarAccion(
      actualizado,
      TipoAccionAuditoria.INVENTARIO_EDITADO,
      usuario_id,
      { datos_anteriores, datos_nuevos: actualizado },
    );

    return actualizado;
  }

  async eliminarInventario(usuario_id: number, inventario_id: number): Promise<void> {
    const inventario = await this.inventario_repositorio.findOne({
      where: { id: inventario_id, propietario: { id: usuario_id } },
    });

    if (!inventario) {
      throw new NotFoundException('Inventario no encontrado o no es propietario');
    }

    await this.inventario_repositorio.softDelete(inventario_id);
  }

  async invitarUsuario(
    usuario_id: number,
    inventario_id: number,
    dto: InvitarUsuarioInventarioDto,
  ): Promise<PermisoInventario> {
    const inventario = await this.inventario_repositorio.findOne({
      where: { id: inventario_id, propietario: { id: usuario_id } },
    });

    if (!inventario) {
      throw new NotFoundException('Inventario no encontrado o no es propietario');
    }

    const permiso_existente = await this.permiso_repositorio.findOne({
      where: { inventario: { id: inventario_id }, usuario_invitado: { id: dto.usuario_id } },
    });

    if (permiso_existente) {
      permiso_existente.rol = dto.rol;
      return this.permiso_repositorio.save(permiso_existente);
    }

    const permiso = this.permiso_repositorio.create({
      inventario,
      usuario_invitado: { id: dto.usuario_id } as Usuario,
      rol: dto.rol,
    });

    return this.permiso_repositorio.save(permiso);
  }

  async eliminarPermiso(usuario_id: number, inventario_id: number, permiso_id: number): Promise<void> {
    const inventario = await this.inventario_repositorio.findOne({
      where: { id: inventario_id, propietario: { id: usuario_id } },
    });

    if (!inventario) {
      throw new NotFoundException('Inventario no encontrado o no es propietario');
    }

    await this.permiso_repositorio.delete(permiso_id);
  }

  async crearProducto(usuario_id: number, dto: CrearProductoDto): Promise<Producto> {
    const inventario = await this.obtenerInventarioPorId(usuario_id, dto.inventario_id);
    if (dto.tipo === TipoProducto.MATERIAL && !dto.subtipo_material) {
      throw new BadRequestException('Debe especificar subtipo_material para productos de tipo MATERIAL');
    }
    if (dto.tipo === TipoProducto.ACTIVO_FIJO && !dto.subtipo_activo_fijo) {
      throw new BadRequestException('Debe especificar subtipo_activo_fijo para productos de tipo ACTIVO_FIJO');
    }

    const producto = this.producto_repositorio.create({
      ...dto,
      inventario,
    });

    const guardado = await this.producto_repositorio.save(producto);

    await this.auditoria_servicio.registrarAccion(
      inventario,
      TipoAccionAuditoria.PRODUCTO_CREADO,
      usuario_id,
      { producto: guardado, datos_nuevos: dto },
    );

    return guardado;
  }

  async obtenerProductos(usuario_id: number, inventario_id: number): Promise<Producto[]> {
    await this.obtenerInventarioPorId(usuario_id, inventario_id);

    return this.producto_repositorio.find({
      where: { inventario: { id: inventario_id }, activo: true },
      relations: ['materiales', 'activos'],
    });
  }

  async obtenerProductoPorId(usuario_id: number, inventario_id: number, producto_id: number): Promise<Producto> {
    await this.obtenerInventarioPorId(usuario_id, inventario_id);

    const producto = await this.producto_repositorio.findOne({
      where: { id: producto_id, inventario: { id: inventario_id }, activo: true },
      relations: ['inventario', 'materiales', 'activos'],
    });

    if (!producto) {
      throw new NotFoundException('Producto no encontrado');
    }

    return producto;
  }

  async actualizarProducto(
    usuario_id: number,
    inventario_id: number,
    producto_id: number,
    dto: ActualizarProductoDto,
  ): Promise<Producto> {
    const producto = await this.obtenerProductoPorId(usuario_id, inventario_id, producto_id);
    const inventario = await this.obtenerInventarioPorId(usuario_id, inventario_id);

    const datos_anteriores = { ...producto };
    Object.assign(producto, dto);

    const actualizado = await this.producto_repositorio.save(producto);

    await this.auditoria_servicio.registrarAccion(
      inventario,
      TipoAccionAuditoria.PRODUCTO_EDITADO,
      usuario_id,
      { producto: actualizado, datos_anteriores, datos_nuevos: actualizado },
    );

    return actualizado;
  }

  async eliminarProducto(usuario_id: number, inventario_id: number, producto_id: number): Promise<void> {
    const producto = await this.obtenerProductoPorId(usuario_id, inventario_id, producto_id);
    const inventario = await this.obtenerInventarioPorId(usuario_id, inventario_id);

    await this.auditoria_servicio.registrarAccion(
      inventario,
      TipoAccionAuditoria.PRODUCTO_ELIMINADO,
      usuario_id,
      { producto, datos_anteriores: producto },
    );

    await this.producto_repositorio.softDelete(producto_id);
  }

  async obtenerStockProducto(usuario_id: number, inventario_id: number, producto_id: number): Promise<any> {
    const producto = await this.obtenerProductoPorId(usuario_id, inventario_id, producto_id);

    if (producto.tipo === TipoProducto.MATERIAL) {
      const materiales = await this.material_repositorio.find({
        where: { producto: { id: producto_id }, activo: true },
        order: { fecha_vencimiento: 'ASC' },
      });

      const stock_total = materiales.reduce((sum, m) => sum + Number(m.cantidad_actual), 0);
      const stock_reservado = materiales.reduce((sum, m) => sum + Number(m.cantidad_reservada), 0);
      const stock_disponible = stock_total - stock_reservado;

      return {
        producto_id: producto.id,
        nombre: producto.nombre,
        tipo: producto.tipo,
        subtipo: producto.subtipo_material,
        unidad_medida: producto.unidad_medida,
        stock_total,
        stock_reservado,
        stock_disponible,
        stock_minimo: producto.stock_minimo,
        alerta_stock_bajo: stock_disponible < producto.stock_minimo,
        materiales: materiales.map(m => ({
          id: m.id,
          nro_lote: m.nro_lote,
          nro_serie: m.nro_serie,
          fecha_vencimiento: m.fecha_vencimiento,
          cantidad_actual: Number(m.cantidad_actual),
          cantidad_reservada: Number(m.cantidad_reservada),
          costo_unitario: Number(m.costo_unitario),
        })),
      };
    } else {
      const activos = await this.activo_repositorio.find({
        where: { producto: { id: producto_id } },
      });

      const por_estado = {
        disponible: 0,
        en_uso: 0,
        en_mantenimiento: 0,
        desechado: 0,
      };

      activos.forEach(a => {
        por_estado[a.estado]++;
      });

      return {
        producto_id: producto.id,
        nombre: producto.nombre,
        tipo: producto.tipo,
        subtipo: producto.subtipo_activo_fijo,
        total_activos: activos.length,
        activos_disponibles: por_estado.disponible,
        activos_por_estado: por_estado,
        activos: activos.map(a => ({
          id: a.id,
          codigo_interno: a.codigo_interno,
          nro_serie: a.nro_serie,
          nombre_asignado: a.nombre_asignado,
          estado: a.estado,
          ubicacion: a.ubicacion,
          costo_compra: Number(a.costo_compra),
          fecha_compra: a.fecha_compra,
        })),
      };
    }
  }

  async registrarEntradaMaterial(
    usuario_id: number,
    inventario_id: number,
    dto: RegistrarEntradaMaterialDto,
  ): Promise<Material> {
    const producto = await this.obtenerProductoPorId(usuario_id, inventario_id, dto.producto_id);
    const inventario = await this.obtenerInventarioPorId(usuario_id, inventario_id);

    if (producto.tipo !== TipoProducto.MATERIAL) {
      throw new BadRequestException('Este producto no es de tipo MATERIAL');
    }
    if (producto.subtipo_material === SubtipoMaterial.CON_LOTE_VENCIMIENTO && !dto.nro_lote) {
      throw new BadRequestException('Debe especificar número de lote para este tipo de material');
    }
    if (producto.subtipo_material === SubtipoMaterial.CON_SERIE && !dto.nro_serie) {
      throw new BadRequestException('Debe especificar número de serie para este tipo de material');
    }
    const materiales_existentes = await this.material_repositorio.find({
      where: { producto: { id: dto.producto_id }, activo: true },
    });
    const stock_anterior = materiales_existentes.reduce((sum, m) => sum + Number(m.cantidad_actual), 0);
    const material = this.material_repositorio.create({
      producto,
      nro_lote: dto.nro_lote,
      nro_serie: dto.nro_serie,
      fecha_vencimiento: dto.fecha_vencimiento ? new Date(dto.fecha_vencimiento) : undefined,
      cantidad_actual: dto.cantidad,
      costo_unitario: dto.costo_unitario,
      fecha_ingreso: dto.fecha_ingreso ? new Date(dto.fecha_ingreso) : new Date(),
    });

    const guardado = await this.material_repositorio.save(material);

    const stock_nuevo = stock_anterior + dto.cantidad;
    await this.kardex_servicio.registrarEntrada(
      inventario,
      producto,
      dto.tipo_entrada,
      dto.cantidad,
      stock_anterior,
      stock_nuevo,
      usuario_id,
      {
        material: guardado,
        monto: dto.cantidad * dto.costo_unitario,
        costo_unitario: dto.costo_unitario,
        observaciones: dto.observaciones,
      },
    );
    await this.auditoria_servicio.registrarAccion(
      inventario,
      TipoAccionAuditoria.MATERIAL_CREADO,
      usuario_id,
      { producto, material: guardado, datos_nuevos: dto },
    );
    if (dto.generar_egreso && dto.tipo_entrada === TipoMovimientoKardex.COMPRA) {
      const costo_total = dto.cantidad * dto.costo_unitario;
      await this.finanzas_servicio.registrarEgreso(usuario_id, {
        concepto: `Compra: ${producto.nombre} x${dto.cantidad}`,
        monto: costo_total,
        fecha: dto.fecha_ingreso ? new Date(dto.fecha_ingreso) : new Date(),
      });
    }

    return guardado;
  }

  async registrarEntradaActivo(
    usuario_id: number,
    inventario_id: number,
    dto: RegistrarEntradaActivoDto,
  ): Promise<Activo> {
    const producto = await this.obtenerProductoPorId(usuario_id, inventario_id, dto.producto_id);
    const inventario = await this.obtenerInventarioPorId(usuario_id, inventario_id);

    if (producto.tipo !== TipoProducto.ACTIVO_FIJO) {
      throw new BadRequestException('Este producto no es de tipo ACTIVO_FIJO');
    }

    const activos_existentes = await this.activo_repositorio.count({
      where: { producto: { id: dto.producto_id } },
    });

    const activo = this.activo_repositorio.create({
      producto,
      codigo_interno: dto.codigo_interno,
      nro_serie: dto.nro_serie,
      nombre_asignado: dto.nombre_asignado,
      ubicacion: dto.ubicacion,
      costo_compra: dto.costo_compra,
      fecha_compra: new Date(dto.fecha_compra),
      estado: EstadoActivo.DISPONIBLE,
    });

    const guardado = await this.activo_repositorio.save(activo);
    await this.kardex_servicio.registrarEntrada(
      inventario,
      producto,
      dto.tipo_entrada,
      1,
      activos_existentes,
      activos_existentes + 1,
      usuario_id,
      {
        monto: dto.costo_compra,
        observaciones: dto.observaciones,
      },
    );
    await this.auditoria_servicio.registrarAccion(
      inventario,
      TipoAccionAuditoria.ACTIVO_CREADO,
      usuario_id,
      { producto, activo: guardado, datos_nuevos: dto },
    );
    if (dto.generar_egreso && dto.tipo_entrada === TipoMovimientoKardex.COMPRA) {
      await this.finanzas_servicio.registrarEgreso(usuario_id, {
        concepto: `Compra activo: ${producto.nombre} - ${dto.nombre_asignado || dto.codigo_interno || guardado.id}`,
        monto: dto.costo_compra,
        fecha: new Date(dto.fecha_compra),
      });
    }

    return guardado;
  }
  async registrarSalidaMaterial(
    usuario_id: number,
    inventario_id: number,
    dto: RegistrarSalidaMaterialDto,
  ): Promise<any> {
    const producto = await this.obtenerProductoPorId(usuario_id, inventario_id, dto.producto_id);
    const inventario = await this.obtenerInventarioPorId(usuario_id, inventario_id);

    if (producto.tipo !== TipoProducto.MATERIAL) {
      throw new BadRequestException('Este producto no es de tipo MATERIAL');
    }
    let materiales: Material[];
    if (dto.material_id) {
      const material = await this.material_repositorio.findOne({
        where: { id: dto.material_id, activo: true },
      });
      if (!material) {
        throw new NotFoundException('Material no encontrado');
      }
      materiales = [material];
    } else {
      materiales = await this.material_repositorio.find({
        where: { producto: { id: dto.producto_id }, activo: true },
        order: { fecha_vencimiento: 'ASC', fecha_ingreso: 'ASC' },
      });
    }

    const stock_anterior = materiales.reduce((sum, m) => sum + Number(m.cantidad_actual), 0);
    const stock_disponible = materiales.reduce((sum, m) => sum + Number(m.cantidad_actual) - Number(m.cantidad_reservada), 0);

    if (stock_disponible < dto.cantidad) {
      throw new BadRequestException(`Stock insuficiente. Disponible: ${stock_disponible}, Requerido: ${dto.cantidad}`);
    }
    let cantidad_restante = dto.cantidad;
    for (const material of materiales) {
      if (cantidad_restante <= 0) break;

      const disponible = Number(material.cantidad_actual) - Number(material.cantidad_reservada);
      const a_descontar = Math.min(cantidad_restante, disponible);

      if (a_descontar > 0) {
        material.cantidad_actual = Number(material.cantidad_actual) - a_descontar;
        await this.material_repositorio.save(material);
        cantidad_restante -= a_descontar;
      }
    }
    const stock_nuevo = stock_anterior - dto.cantidad;
    await this.kardex_servicio.registrarSalida(
      inventario,
      producto,
      dto.tipo_salida,
      dto.cantidad,
      stock_anterior,
      stock_nuevo,
      usuario_id,
      {
        monto: dto.monto_venta,
        observaciones: dto.observaciones,
      },
    );
    if (dto.registrar_pago && dto.tipo_salida === TipoMovimientoKardex.VENTA && dto.monto_venta) {
      await this.finanzas_servicio.registrarPago(usuario_id, {
        concepto: `Venta: ${producto.nombre} x${dto.cantidad}`,
        monto: dto.monto_venta,
        fecha: new Date(),
      });
    }

    return {
      mensaje: 'Salida registrada exitosamente',
      producto_id: producto.id,
      cantidad_descontada: dto.cantidad,
      stock_anterior,
      stock_nuevo,
    };
  }

  async cambiarEstadoActivo(
    usuario_id: number,
    inventario_id: number,
    activo_id: number,
    dto: CambiarEstadoActivoDto,
  ): Promise<Activo> {
    const inventario = await this.obtenerInventarioPorId(usuario_id, inventario_id);

    const activo = await this.activo_repositorio.findOne({
      where: { id: activo_id },
      relations: ['producto', 'producto.inventario'],
    });

    if (!activo || activo.producto.inventario.id !== inventario_id) {
      throw new NotFoundException('Activo no encontrado en este inventario');
    }

    const estado_anterior = activo.estado;

    if (estado_anterior === dto.estado) {
      return activo;
    }
    await this.bitacora_servicio.registrarCambioEstado(
      inventario,
      activo,
      estado_anterior,
      dto.estado,
      usuario_id,
      {
        motivo: dto.motivo,
        referencia_tipo: dto.referencia ? 'manual' : undefined,
      },
    );

    activo.estado = dto.estado;
    return this.activo_repositorio.save(activo);
  }

  async actualizarActivo(
    usuario_id: number,
    inventario_id: number,
    activo_id: number,
    dto: ActualizarActivoDto,
  ): Promise<Activo> {
    const inventario = await this.obtenerInventarioPorId(usuario_id, inventario_id);

    const activo = await this.activo_repositorio.findOne({
      where: { id: activo_id },
      relations: ['producto', 'producto.inventario'],
    });

    if (!activo || activo.producto.inventario.id !== inventario_id) {
      throw new NotFoundException('Activo no encontrado en este inventario');
    }

    const datos_anteriores = { ...activo };
    Object.assign(activo, dto);

    const actualizado = await this.activo_repositorio.save(activo);

    await this.auditoria_servicio.registrarAccion(
      inventario,
      TipoAccionAuditoria.ACTIVO_EDITADO,
      usuario_id,
      { activo: actualizado, datos_anteriores, datos_nuevos: actualizado },
    );

    return actualizado;
  }

  async venderActivo(
    usuario_id: number,
    inventario_id: number,
    activo_id: number,
    dto: RegistrarSalidaActivoDto,
  ): Promise<any> {
    const inventario = await this.obtenerInventarioPorId(usuario_id, inventario_id);

    const activo = await this.activo_repositorio.findOne({
      where: { id: activo_id },
      relations: ['producto', 'producto.inventario'],
    });

    if (!activo || activo.producto.inventario.id !== inventario_id) {
      throw new NotFoundException('Activo no encontrado en este inventario');
    }

    if (activo.estado === EstadoActivo.DESECHADO || activo.estado === EstadoActivo.VENDIDO) {
      throw new BadRequestException('No se puede vender un activo desechado o ya vendido');
    }

    const estado_anterior = activo.estado;
    activo.estado = EstadoActivo.VENDIDO;
    await this.activo_repositorio.save(activo);
    await this.bitacora_servicio.registrarCambioEstado(
      inventario,
      activo,
      estado_anterior,
      EstadoActivo.VENDIDO,
      usuario_id,
      { motivo: `Vendido por ${dto.monto_venta || 0}` },
    );
    const activos_count = await this.activo_repositorio.count({
      where: { producto: { id: activo.producto.id }, estado: Not(In([EstadoActivo.DESECHADO, EstadoActivo.VENDIDO])) },
    });

    await this.kardex_servicio.registrarSalida(
      inventario,
      activo.producto,
      dto.tipo_salida,
      1,
      activos_count + 1,
      activos_count,
      usuario_id,
      {
        monto: dto.monto_venta,
        observaciones: dto.observaciones,
      },
    );
    await this.auditoria_servicio.registrarAccion(
      inventario,
      TipoAccionAuditoria.ACTIVO_VENDIDO,
      usuario_id,
      { activo, datos_nuevos: dto },
    );
    if (dto.registrar_pago && dto.monto_venta) {
      await this.finanzas_servicio.registrarPago(usuario_id, {
        concepto: `Venta activo: ${activo.producto.nombre} - ${activo.nombre_asignado || activo.codigo_interno || activo.id}`,
        monto: dto.monto_venta,
        fecha: new Date(),
      });
    }

    return {
      mensaje: 'Activo vendido exitosamente',
      activo_id: activo.id,
      monto_venta: dto.monto_venta,
    };
  }

  async ajustarStock(
    usuario_id: number,
    inventario_id: number,
    dto: AjustarStockDto,
  ): Promise<any> {
    const producto = await this.obtenerProductoPorId(usuario_id, inventario_id, dto.producto_id);
    const inventario = await this.obtenerInventarioPorId(usuario_id, inventario_id);

    if (producto.tipo !== TipoProducto.MATERIAL) {
      throw new BadRequestException('Solo se puede ajustar stock de productos tipo MATERIAL');
    }

    let material: Material;
    if (dto.material_id) {
      const found_material = await this.material_repositorio.findOne({
        where: { id: dto.material_id, activo: true },
      });
      if (!found_material) {
        throw new NotFoundException('Material no encontrado');
      }
      material = found_material;
    } else {
      const materiales = await this.material_repositorio.find({
        where: { producto: { id: dto.producto_id }, activo: true },
        order: { fecha_ingreso: 'DESC' },
      });

      if (materiales.length === 0) {
        material = this.material_repositorio.create({
          producto,
          cantidad_actual: 0,
          costo_unitario: 0,
        });
        material = await this.material_repositorio.save(material);
      } else {
        material = materiales[0];
      }
    }

    const stock_anterior = Number(material.cantidad_actual);
    let stock_nuevo: number;

    switch (dto.tipo_ajuste) {
      case TipoAjuste.INCREMENTO:
        stock_nuevo = stock_anterior + dto.cantidad;
        break;
      case TipoAjuste.DECREMENTO:
        stock_nuevo = stock_anterior - dto.cantidad;
        if (stock_nuevo < 0) stock_nuevo = 0;
        break;
      case TipoAjuste.ESTABLECER:
        stock_nuevo = dto.cantidad;
        break;
    }

    material.cantidad_actual = stock_nuevo;
    await this.material_repositorio.save(material);

    if (dto.tipo_ajuste === TipoAjuste.INCREMENTO) {
      await this.kardex_servicio.registrarEntrada(
        inventario,
        producto,
        TipoMovimientoKardex.AJUSTE,
        dto.cantidad,
        stock_anterior,
        stock_nuevo,
        usuario_id,
        { material, observaciones: dto.motivo },
      );
    } else {
      await this.kardex_servicio.registrarSalida(
        inventario,
        producto,
        TipoMovimientoKardex.AJUSTE,
        Math.abs(stock_nuevo - stock_anterior),
        stock_anterior,
        stock_nuevo,
        usuario_id,
        { material, observaciones: dto.motivo },
      );
    }

    await this.auditoria_servicio.registrarAccion(
      inventario,
      TipoAccionAuditoria.AJUSTE_STOCK,
      usuario_id,
      {
        producto,
        material,
        datos_anteriores: { cantidad: stock_anterior },
        datos_nuevos: { cantidad: stock_nuevo },
        motivo: dto.motivo,
      },
    );

    return {
      mensaje: 'Stock ajustado exitosamente',
      producto_id: producto.id,
      material_id: material.id,
      stock_anterior,
      stock_nuevo,
      diferencia: stock_nuevo - stock_anterior,
      motivo: dto.motivo,
    };
  }


  async verificarStockDisponible(producto_id: number, cantidad_requerida: number): Promise<boolean> {
    const producto = await this.producto_repositorio.findOne({
      where: { id: producto_id, activo: true },
    });

    if (!producto) {
      throw new NotFoundException('Producto no encontrado');
    }

    if (producto.tipo === TipoProducto.MATERIAL) {
      const materiales = await this.material_repositorio.find({
        where: { producto: { id: producto_id }, activo: true },
      });

      const stock_disponible = materiales.reduce((sum, m) => {
        return sum + Number(m.cantidad_actual) - Number(m.cantidad_reservada);
      }, 0);

      return stock_disponible >= cantidad_requerida;
    } else {
      const activos_disponibles = await this.activo_repositorio.count({
        where: { producto: { id: producto_id }, estado: EstadoActivo.DISPONIBLE },
      });

      return activos_disponibles >= cantidad_requerida;
    }
  }

  async obtenerReporteValorInventario(usuario_id: number, inventario_id: number): Promise<any> {
    await this.obtenerInventarioPorId(usuario_id, inventario_id);

    const productos = await this.producto_repositorio.find({
      where: { inventario: { id: inventario_id }, activo: true },
      relations: ['materiales', 'activos'],
    });

    let valor_materiales = 0;
    let valor_activos = 0;
    let cantidad_materiales = 0;
    let cantidad_activos = 0;

    for (const producto of productos) {
      if (producto.tipo === TipoProducto.MATERIAL) {
        const materiales = producto.materiales?.filter(m => m.activo) || [];
        for (const m of materiales) {
          valor_materiales += Number(m.cantidad_actual) * Number(m.costo_unitario);
          cantidad_materiales += Number(m.cantidad_actual);
        }
      } else {
        const activos = producto.activos?.filter(a => a.estado !== EstadoActivo.DESECHADO) || [];
        for (const a of activos) {
          valor_activos += Number(a.costo_compra);
        }
        cantidad_activos += activos.length;
      }
    }

    return {
      inventario_id,
      valor_materiales: Math.round(valor_materiales * 100) / 100,
      valor_activos: Math.round(valor_activos * 100) / 100,
      valor_total: Math.round((valor_materiales + valor_activos) * 100) / 100,
      cantidad_materiales,
      cantidad_activos,
      total_productos: productos.length,
    };
  }

  async asignarMaterialesTratamiento(plan_tratamiento_id: number, dto: AsignarMaterialesTratamientoDto) {
    const plan = await this.plan_tratamiento_repositorio.findOne({
      where: { id: plan_tratamiento_id },
      relations: ['materiales_tratamiento']
    });

    if (!plan) {
      throw new NotFoundException('Plan de tratamiento no encontrado');
    }

    // Eliminar materiales existentes para este plan
    await this.material_tratamiento_repositorio.delete({ plan_tratamiento: { id: plan_tratamiento_id } });

    const nuevos_materiales: MaterialTratamiento[] = [];
    for (const matDto of dto.materiales) {
      const producto = await this.producto_repositorio.findOne({ where: { id: matDto.producto_id } });
      if (!producto) continue;

      const nuevo = this.material_tratamiento_repositorio.create({
        plan_tratamiento: plan,
        producto: producto,
        tipo: matDto.tipo,
        cantidad_planeada: matDto.cantidad_planeada,
        momento_confirmacion: matDto.momento_confirmacion,
      });
      nuevos_materiales.push(nuevo);
    }

    return await this.material_tratamiento_repositorio.save(nuevos_materiales);
  }

  async confirmarMaterialesGenerales(usuario_id: number, plan_tratamiento_id: number, dto: ConfirmarMaterialesGeneralesDto) {
    const plan = await this.plan_tratamiento_repositorio.findOne({
      where: { id: plan_tratamiento_id },
      relations: ['paciente']
    });

    if (!plan) {
      throw new NotFoundException('Plan de tratamiento no encontrado');
    }

    // Procesar procesamiento de pago si existe
    if (dto.monto_pago && dto.monto_pago > 0) {
      await this.finanzas_servicio.registrarPago(usuario_id, {
        fecha: new Date(),
        monto: dto.monto_pago,
        concepto: `Pago materiales generales tratamiento #${plan.id}`,
        plan_tratamiento_id: plan.id
      });
    }

    // Procesar materiales
    for (const matDto of dto.materiales) {
      const material_tratamiento = await this.material_tratamiento_repositorio.findOne({
        where: { id: matDto.material_tratamiento_id },
        relations: ['producto', 'producto.inventario']
      });

      if (!material_tratamiento) continue;
      if (material_tratamiento.confirmado) continue;

      // Actualizar estado en tratamiento
      material_tratamiento.cantidad_usada = matDto.cantidad_usada;
      material_tratamiento.confirmado = true;
      await this.material_tratamiento_repositorio.save(material_tratamiento);

      // Descontar del inventario (FIFO)
      const cantidad_a_descontar = matDto.cantidad_usada;
      if (cantidad_a_descontar > 0) {
        // Usamos registrarSalidaMaterial que ya maneja la lógica FIFO y Kardex
        await this.registrarSalidaMaterial(usuario_id, material_tratamiento.producto.inventario.id, {
          producto_id: material_tratamiento.producto.id,
          cantidad: cantidad_a_descontar,
          tipo_salida: TipoMovimientoKardex.CONSUMO_TRATAMIENTO,
          observaciones: `Consumo general tratamiento #${plan.id}`,
          registrar_pago: false // El pago ya se manejó arriba si aplicaba
        });
      }
    }

    return { mensaje: 'Materiales confirmados correctamente' };
  }

  get kardex() { return this.kardex_servicio; }
  get bitacora() { return this.bitacora_servicio; }
  get auditoria() { return this.auditoria_servicio; }
  get reservas() { return this.reservas_servicio; }
}
