import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';

// Entidades
import { Inventario, VisibilidadInventario } from './entidades/inventario.entidad';
import { PermisoInventario, RolInventario } from './entidades/permiso-inventario.entidad';
import { Producto, TipoProducto, SubtipoMaterial, SubtipoActivoFijo } from './entidades/producto.entidad';
import { Material } from './entidades/material.entidad';
import { Activo, EstadoActivo } from './entidades/activo.entidad';
import { MaterialCita } from './entidades/material-cita.entidad';
import { MaterialTratamiento, TipoMaterialTratamiento } from './entidades/material-tratamiento.entidad';
import { TipoMovimientoKardex } from './entidades/kardex.entidad';
import { TipoAccionAuditoria } from './entidades/auditoria.entidad';

// Entidades externas
import { Usuario } from '../usuarios/entidades/usuario.entidad';
import { Cita } from '../agenda/entidades/cita.entidad';
import { PlanTratamiento } from '../tratamientos/entidades/plan-tratamiento.entidad';

// Servicios especializados
import { KardexServicio } from './kardex.servicio';
import { BitacoraServicio } from './bitacora.servicio';
import { AuditoriaServicio } from './auditoria.servicio';
import { ReservasServicio } from './reservas.servicio';
import { FinanzasServicio } from '../finanzas/finanzas.servicio';

// DTOs
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

  // =====================
  // INVENTARIOS
  // =====================

  async crearInventario(usuario_id: number, dto: CrearInventarioDto): Promise<Inventario> {
    const inventario = this.inventario_repositorio.create({
      ...dto,
      propietario: { id: usuario_id } as Usuario,
    });
    const guardado = await this.inventario_repositorio.save(inventario);

    // Registrar auditoría
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
      relations: ['propietario', 'permisos', 'permisos.usuario_invitado', 'productos'],
    });

    const permisos = await this.permiso_repositorio.find({
      where: { usuario_invitado: { id: usuario_id } },
      relations: ['inventario', 'inventario.propietario', 'inventario.productos'],
    });

    const inventarios_compartidos = permisos.map(p => ({
      ...p.inventario,
      rol_usuario: p.rol,
      es_propietario: false,
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
    return {
      total_productos: productos.length,
      productos_material: productos.filter((p: Producto) => p.tipo === TipoProducto.MATERIAL).length,
      productos_activo_fijo: productos.filter((p: Producto) => p.tipo === TipoProducto.ACTIVO_FIJO).length,
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
      { datos_anteriores, datos_nuevos: dto },
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

  // =====================
  // PRODUCTOS
  // =====================

  async crearProducto(usuario_id: number, dto: CrearProductoDto): Promise<Producto> {
    const inventario = await this.obtenerInventarioPorId(usuario_id, dto.inventario_id);

    // Validar subtipos
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
      { producto: actualizado, datos_anteriores, datos_nuevos: dto },
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

  // =====================
  // STOCK DE PRODUCTOS
  // =====================

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
      // Activo Fijo
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

  // =====================
  // ENTRADAS DE MATERIAL
  // =====================

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

    // Validar campos según subtipo
    if (producto.subtipo_material === SubtipoMaterial.CON_LOTE_VENCIMIENTO && !dto.nro_lote) {
      throw new BadRequestException('Debe especificar número de lote para este tipo de material');
    }
    if (producto.subtipo_material === SubtipoMaterial.CON_SERIE && !dto.nro_serie) {
      throw new BadRequestException('Debe especificar número de serie para este tipo de material');
    }

    // Calcular stock anterior
    const materiales_existentes = await this.material_repositorio.find({
      where: { producto: { id: dto.producto_id }, activo: true },
    });
    const stock_anterior = materiales_existentes.reduce((sum, m) => sum + Number(m.cantidad_actual), 0);

    // Crear material
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

    // Registrar en Kardex
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

    // Registrar en Auditoría
    await this.auditoria_servicio.registrarAccion(
      inventario,
      TipoAccionAuditoria.MATERIAL_CREADO,
      usuario_id,
      { producto, material: guardado, datos_nuevos: dto },
    );

    // Generar egreso si es compra
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

  // =====================
  // ENTRADAS DE ACTIVO
  // =====================

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

    // Contar activos anteriores
    const activos_existentes = await this.activo_repositorio.count({
      where: { producto: { id: dto.producto_id } },
    });

    // Crear activo
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

    // Registrar en Kardex
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

    // Registrar en Auditoría
    await this.auditoria_servicio.registrarAccion(
      inventario,
      TipoAccionAuditoria.ACTIVO_CREADO,
      usuario_id,
      { producto, activo: guardado, datos_nuevos: dto },
    );

    // Generar egreso si es compra
    if (dto.generar_egreso && dto.tipo_entrada === TipoMovimientoKardex.COMPRA) {
      await this.finanzas_servicio.registrarEgreso(usuario_id, {
        concepto: `Compra activo: ${producto.nombre} - ${dto.nombre_asignado || dto.codigo_interno || guardado.id}`,
        monto: dto.costo_compra,
        fecha: new Date(dto.fecha_compra),
      });
    }

    return guardado;
  }

  // =====================
  // SALIDAS DE MATERIAL
  // =====================

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

    // Obtener materiales disponibles (FIFO por fecha de vencimiento o ingreso)
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

    // Descontar FIFO
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

    // Registrar en Kardex
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

    // Registrar pago si es venta
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

  // =====================
  // CAMBIO DE ESTADO ACTIVO
  // =====================

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
      return activo; // No hay cambio
    }

    // Registrar en Bitácora
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

  // =====================
  // ACTUALIZAR ACTIVO
  // =====================

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
      { activo: actualizado, datos_anteriores, datos_nuevos: dto },
    );

    return actualizado;
  }

  // =====================
  // VENTA DE ACTIVO
  // =====================

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

    if (activo.estado === EstadoActivo.DESECHADO) {
      throw new BadRequestException('No se puede vender un activo desechado');
    }

    const estado_anterior = activo.estado;

    // Cambiar estado a DESECHADO (vendido)
    activo.estado = EstadoActivo.DESECHADO;
    await this.activo_repositorio.save(activo);

    // Registrar en Bitácora
    await this.bitacora_servicio.registrarCambioEstado(
      inventario,
      activo,
      estado_anterior,
      EstadoActivo.DESECHADO,
      usuario_id,
      { motivo: `Vendido por ${dto.monto_venta || 0}` },
    );

    // Registrar en Kardex
    const activos_count = await this.activo_repositorio.count({
      where: { producto: { id: activo.producto.id }, estado: Not(EstadoActivo.DESECHADO) },
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

    // Registrar en Auditoría
    await this.auditoria_servicio.registrarAccion(
      inventario,
      TipoAccionAuditoria.ACTIVO_VENDIDO,
      usuario_id,
      { activo, datos_nuevos: dto },
    );

    // Registrar pago
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

  // =====================
  // AJUSTE DE STOCK
  // =====================

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
      // Si no se especifica material, crear uno nuevo o usar el más reciente
      const materiales = await this.material_repositorio.find({
        where: { producto: { id: dto.producto_id }, activo: true },
        order: { fecha_ingreso: 'DESC' },
      });

      if (materiales.length === 0) {
        // Crear material genérico
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

    // Registrar en Kardex
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

    // Registrar en Auditoría
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

  // =====================
  // VERIFICACIÓN DE STOCK
  // =====================

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

  // =====================
  // REPORTE DE VALOR
  // =====================

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

  // Exponer servicios especializados
  get kardex() { return this.kardex_servicio; }
  get bitacora() { return this.bitacora_servicio; }
  get auditoria() { return this.auditoria_servicio; }
  get reservas() { return this.reservas_servicio; }
}
