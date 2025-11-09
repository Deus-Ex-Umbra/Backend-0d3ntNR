import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Inventario } from './entidades/inventario.entidad';
import { PermisoInventario } from './entidades/permiso-inventario.entidad';
import { Producto, TipoGestion } from './entidades/producto.entidad';
import { Lote } from './entidades/lote.entidad';
import { Activo, EstadoActivo } from './entidades/activo.entidad';
import { CitaConsumible } from './entidades/cita-consumible.entidad';
import { ActivoHistorial } from './entidades/activo-historial.entidad';
import { MaterialCita } from './entidades/material-cita.entidad';
import { MaterialTratamiento, TipoMaterialTratamiento } from './entidades/material-tratamiento.entidad';
import { MovimientoInventario, TipoMovimiento } from './entidades/movimiento-inventario.entidad';
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
import { ConfirmarMaterialesTratamientoDto } from './dto/confirmar-materiales-tratamiento.dto';
import { Usuario } from '../usuarios/entidades/usuario.entidad';
import { Cita } from '../agenda/entidades/cita.entidad';
import { PlanTratamiento } from '../tratamientos/entidades/plan-tratamiento.entidad';
import { FinanzasServicio } from '../finanzas/finanzas.servicio';
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
  @InjectRepository(Lote)
  private readonly lote_repositorio: Repository<Lote>,
  @InjectRepository(Activo)
  private readonly activo_repositorio: Repository<Activo>,
  @InjectRepository(CitaConsumible)
  private readonly cita_consumible_repositorio: Repository<CitaConsumible>,
  @InjectRepository(ActivoHistorial)
  private readonly activo_historial_repositorio: Repository<ActivoHistorial>,
  @InjectRepository(Cita)
  private readonly cita_repositorio: Repository<Cita>,
  @InjectRepository(MaterialCita)
  private readonly material_cita_repositorio: Repository<MaterialCita>,
  @InjectRepository(MaterialTratamiento)
  private readonly material_tratamiento_repositorio: Repository<MaterialTratamiento>,
  @InjectRepository(MovimientoInventario)
  private readonly movimiento_repositorio: Repository<MovimientoInventario>,
  @InjectRepository(PlanTratamiento)
  private readonly plan_tratamiento_repositorio: Repository<PlanTratamiento>,
  private readonly finanzas_servicio: FinanzasServicio,
) {}

  async crearInventario(usuario_id: number, dto: CrearInventarioDto): Promise<Inventario> {
  const nuevo_inventario = this.inventario_repositorio.create({
    ...dto,
    activo: true,
    propietario: { id: usuario_id } as Usuario,
  });
  return this.inventario_repositorio.save(nuevo_inventario);
}

async obtenerInventarios(usuario_id: number): Promise<any[]> {
  const inventarios_propios = await this.inventario_repositorio.find({
    where: { propietario: { id: usuario_id }, activo: true },
    relations: ['propietario', 'productos', 'productos.lotes', 'productos.activos'],
  });

  const permisos = await this.permiso_repositorio.find({
    where: { usuario_invitado: { id: usuario_id } },
    relations: ['inventario', 'inventario.propietario', 'inventario.productos', 'inventario.productos.lotes', 'inventario.productos.activos'],
  });

  const inventarios_compartidos = permisos
    .filter(p => p.inventario.activo)
    .map(p => ({
      ...p.inventario,
      rol_usuario: p.rol,
      es_propietario: false,
    }));

  const inventarios_propios_marcados = inventarios_propios.map(inv => ({
    ...inv,
    rol_usuario: 'propietario',
    es_propietario: true,
  }));

  const todos_inventarios = [...inventarios_propios_marcados, ...inventarios_compartidos];

  return todos_inventarios.map(inv => ({
    ...inv,
    resumen: this.calcularResumenInventario(inv),
  }));
}

private calcularResumenInventario(inventario: any): any {
  if (!inventario.productos) {
    return {
      valor_total: 0,
      total_productos: 0,
      total_consumibles: 0,
      total_activos: 0,
    };
  }

  let valor_total = 0;
  let total_consumibles = 0;
  let total_activos = 0;

  inventario.productos.forEach(producto => {
    if (producto.tipo_gestion === TipoGestion.CONSUMIBLE) {
      if (producto.lotes) {
        producto.lotes.forEach(lote => {
          if (lote.activo) {
            const cantidad = Number(lote.cantidad_actual);
            const costo = Number(lote.costo_unitario_compra);
            total_consumibles += cantidad;
            valor_total += cantidad * costo;
          }
        });
      }
    } else {
      if (producto.activos) {
        producto.activos.forEach(activo => {
          total_activos += 1;
          valor_total += Number(activo.costo_compra);
        });
      }
    }
  });

  return {
    valor_total,
    total_productos: inventario.productos.length,
    total_consumibles,
    total_activos,
  };
}

async obtenerInventarioPorId(usuario_id: number, inventario_id: number): Promise<any> {
  const inventario = await this.inventario_repositorio.findOne({
    where: { id: inventario_id, activo: true },
    relations: ['propietario', 'permisos', 'permisos.usuario_invitado'],
  });

  if (!inventario) {
    throw new NotFoundException('Inventario no encontrado');
  }

  const es_propietario = inventario.propietario.id === usuario_id;

  if (!es_propietario) {
    const permiso = await this.permiso_repositorio.findOne({
      where: {
        inventario: { id: inventario_id },
        usuario_invitado: { id: usuario_id },
      },
    });

    if (!permiso) {
      throw new ForbiddenException('No tienes acceso a este inventario');
    }

    return {
      ...inventario,
      rol_usuario: permiso.rol,
      es_propietario: false,
    };
  }

  return {
    ...inventario,
    rol_usuario: 'propietario',
    es_propietario: true,
  };
}

  async invitarUsuario(
    usuario_id: number,
    inventario_id: number,
    dto: InvitarUsuarioInventarioDto,
  ): Promise<PermisoInventario> {
    const inventario = await this.inventario_repositorio.findOne({
      where: { id: inventario_id },
      relations: ['propietario'],
    });

    if (!inventario) {
      throw new NotFoundException('Inventario no encontrado');
    }

    if (inventario.propietario.id !== usuario_id) {
      throw new ForbiddenException('Solo el propietario puede invitar usuarios');
    }

    if (dto.usuario_id === usuario_id) {
      throw new BadRequestException('No puedes invitarte a ti mismo');
    }

    const permiso_existente = await this.permiso_repositorio.findOne({
      where: {
        inventario: { id: inventario_id },
        usuario_invitado: { id: dto.usuario_id },
      },
    });

    if (permiso_existente) {
      throw new BadRequestException('Este usuario ya tiene acceso al inventario');
    }

    const nuevo_permiso = this.permiso_repositorio.create({
      rol: dto.rol,
      inventario: inventario,
      usuario_invitado: { id: dto.usuario_id } as Usuario,
    });

    return this.permiso_repositorio.save(nuevo_permiso);
  }

  async eliminarPermiso(usuario_id: number, inventario_id: number, permiso_id: number): Promise<void> {
    const inventario = await this.inventario_repositorio.findOne({
      where: { id: inventario_id },
      relations: ['propietario'],
    });

    if (!inventario) {
      throw new NotFoundException('Inventario no encontrado');
    }

    if (inventario.propietario.id !== usuario_id) {
      throw new ForbiddenException('Solo el propietario puede eliminar permisos');
    }

    const resultado = await this.permiso_repositorio.delete(permiso_id);

    if (resultado.affected === 0) {
      throw new NotFoundException('Permiso no encontrado');
    }
  }

  async eliminarInventario(usuario_id: number, inventario_id: number): Promise<void> {
  const inventario = await this.inventario_repositorio.findOne({
    where: { id: inventario_id, activo: true },
    relations: ['propietario'],
  });

  if (!inventario) {
    throw new NotFoundException('Inventario no encontrado');
  }

  if (inventario.propietario.id !== usuario_id) {
    throw new ForbiddenException('Solo el propietario puede eliminar el inventario');
  }

  inventario.activo = false;
  await this.inventario_repositorio.save(inventario);
}

  async crearProducto(usuario_id: number, dto: CrearProductoDto): Promise<Producto> {
    const inventario = await this.obtenerInventarioPorId(usuario_id, dto.inventario_id);

    const nuevo_producto = this.producto_repositorio.create({
      nombre: dto.nombre,
      tipo_gestion: dto.tipo_gestion,
      stock_minimo: dto.stock_minimo || 0,
      unidad_medida: dto.unidad_medida || 'unidad',
      descripcion: dto.descripcion,
      notificar_stock_bajo: dto.notificar_stock_bajo !== undefined ? dto.notificar_stock_bajo : true,
      activo: true,
      inventario: { id: dto.inventario_id } as Inventario,
    });

    const producto_guardado = await this.producto_repositorio.save(nuevo_producto);

    // Registrar auditoría de creación
    await this.registrarMovimientoAuditoria(
      dto.inventario_id,
      TipoMovimiento.PRODUCTO_CREADO,
      usuario_id,
      producto_guardado,
      null,
      {
        nombre: producto_guardado.nombre,
        tipo_gestion: producto_guardado.tipo_gestion,
        stock_minimo: producto_guardado.stock_minimo,
        unidad_medida: producto_guardado.unidad_medida,
      },
      `Producto "${producto_guardado.nombre}" creado`,
    );

    return producto_guardado;
  }

  async obtenerProductos(usuario_id: number, inventario_id: number): Promise<Producto[]> {
    await this.obtenerInventarioPorId(usuario_id, inventario_id);

    return this.producto_repositorio.find({
      where: { inventario: { id: inventario_id }, activo: true },
      relations: ['lotes', 'activos'],
      order: { nombre: 'ASC' },
    });
  }

  async actualizarProducto(
    usuario_id: number,
    inventario_id: number,
    producto_id: number,
    dto: ActualizarProductoDto,
  ): Promise<Producto> {
    await this.obtenerInventarioPorId(usuario_id, inventario_id);

    const producto = await this.producto_repositorio.findOne({
      where: { id: producto_id, inventario: { id: inventario_id } },
    });

    if (!producto) {
      throw new NotFoundException('Producto no encontrado');
    }

    // Guardar datos anteriores para auditoría
    const datos_anteriores = {
      nombre: producto.nombre,
      tipo_gestion: producto.tipo_gestion,
      stock_minimo: producto.stock_minimo,
      unidad_medida: producto.unidad_medida,
      descripcion: producto.descripcion,
      notificar_stock_bajo: producto.notificar_stock_bajo,
    };

    Object.assign(producto, dto);
    const producto_actualizado = await this.producto_repositorio.save(producto);

    // Registrar auditoría de edición
    await this.registrarMovimientoAuditoria(
      inventario_id,
      TipoMovimiento.PRODUCTO_EDITADO,
      usuario_id,
      producto_actualizado,
      datos_anteriores,
      dto,
      `Producto "${producto_actualizado.nombre}" editado`,
    );

    return producto_actualizado;
  }

  async eliminarProducto(usuario_id: number, inventario_id: number, producto_id: number): Promise<void> {
    await this.obtenerInventarioPorId(usuario_id, inventario_id);

    const producto = await this.producto_repositorio.findOne({
      where: { id: producto_id, inventario: { id: inventario_id } },
    });

    if (!producto) {
      throw new NotFoundException('Producto no encontrado');
    }

    // Guardar datos antes de eliminar
    const datos_producto = {
      nombre: producto.nombre,
      tipo_gestion: producto.tipo_gestion,
      stock_minimo: producto.stock_minimo,
      unidad_medida: producto.unidad_medida,
    };

    const resultado = await this.producto_repositorio.update(
      { id: producto_id, inventario: { id: inventario_id } },
      { activo: false },
    );

    if (resultado.affected === 0) {
      throw new NotFoundException('Producto no encontrado');
    }

    // Registrar auditoría de eliminación
    await this.registrarMovimientoAuditoria(
      inventario_id,
      TipoMovimiento.PRODUCTO_ELIMINADO,
      usuario_id,
      undefined,
      datos_producto,
      undefined,
      `Producto "${datos_producto.nombre}" eliminado`,
    );
  }

  async registrarCompra(usuario_id: number, inventario_id: number, dto: RegistrarCompraDto): Promise<any> {
  await this.obtenerInventarioPorId(usuario_id, inventario_id);

  const producto = await this.producto_repositorio.findOne({
    where: { id: dto.producto_id, inventario: { id: inventario_id }, activo: true },
  });

  if (!producto) {
    throw new NotFoundException('Producto no encontrado');
  }

  let resultado: any;

  if (producto.tipo_gestion === TipoGestion.CONSUMIBLE) {
    if (!dto.nro_lote || !dto.fecha_vencimiento) {
      throw new BadRequestException('Para productos consumibles se requiere número de lote y fecha de vencimiento');
    }

    const costo_unitario = dto.costo_total / dto.cantidad;

    const nuevo_lote = this.lote_repositorio.create({
      nro_lote: dto.nro_lote,
      fecha_vencimiento: new Date(dto.fecha_vencimiento),
      cantidad_actual: dto.cantidad,
      costo_unitario_compra: costo_unitario,
      activo: true,
      producto: producto,
    });

    resultado = await this.lote_repositorio.save(nuevo_lote);

    // Registrar auditoría de creación de lote
    await this.registrarMovimientoAuditoria(
      inventario_id,
      TipoMovimiento.LOTE_CREADO,
      usuario_id,
      producto,
      undefined,
      {
        nro_lote: resultado.nro_lote,
        cantidad: resultado.cantidad_actual,
        costo_unitario: costo_unitario,
        fecha_vencimiento: dto.fecha_vencimiento,
      },
      `Lote "${resultado.nro_lote}" creado para ${producto.nombre}`,
    );
  } else {
    const num_activos = Math.floor(dto.cantidad);
    const activos_creados: Activo[] = [];

    for (let i = 0; i < num_activos; i++) {
      const datos_activo: Partial<Activo> = {
        costo_compra: dto.costo_total / num_activos,
        fecha_compra: new Date(dto.fecha_compra),
        estado: EstadoActivo.DISPONIBLE,
        producto: producto,
      };

      if (producto.tipo_gestion === TipoGestion.ACTIVO_SERIALIZADO) {
        datos_activo.nro_serie = dto.nro_serie;
      }

      if (dto.nombre_asignado) {
        datos_activo.nombre_asignado = `${dto.nombre_asignado} ${i + 1}`;
      }
      const [activo_guardado] = await this.activo_repositorio.save([datos_activo]);
      activos_creados.push(activo_guardado);

      // Registrar auditoría de creación de activo
      await this.registrarMovimientoAuditoria(
        inventario_id,
        TipoMovimiento.ACTIVO_CREADO,
        usuario_id,
        producto,
        undefined,
        {
          nro_serie: activo_guardado.nro_serie,
          nombre_asignado: activo_guardado.nombre_asignado,
          costo_compra: activo_guardado.costo_compra,
          estado: activo_guardado.estado,
        },
        `Activo creado para ${producto.nombre}`,
      );
    }

    resultado = { 
      mensaje: `Se registraron ${num_activos} activos`,
      activos: activos_creados,
    };
  }

  if (dto.generar_egreso) {
    await this.finanzas_servicio.registrarEgreso(usuario_id, {
      concepto: `Compra: ${producto.nombre}`,
      monto: dto.costo_total,
      fecha: new Date(dto.fecha_compra),
    });
  }

  return resultado;
}

  async confirmarConsumiblesCita(
  usuario_id: number,
  cita_id: number,
  dto: ConfirmarConsumiblesCitaDto,
): Promise<any> {
  const cita = await this.cita_repositorio.findOne({
    where: { id: cita_id, usuario: { id: usuario_id } },
  });

  if (!cita) {
    throw new NotFoundException('Cita no encontrada o no le pertenece');
  }

  const resultados: Array<{
    producto_id: number;
    producto_nombre: string;
    cantidad_descontada: number;
  }> = [];

  for (const consumible of dto.consumibles) {
    const producto = await this.producto_repositorio.findOne({
      where: { id: consumible.producto_id, activo: true },
    });

    if (!producto || producto.tipo_gestion !== TipoGestion.CONSUMIBLE) {
      throw new BadRequestException(`El producto ${consumible.producto_id} no es un consumible`);
    }

    const lotes = await this.lote_repositorio.find({
      where: { producto: { id: consumible.producto_id }, activo: true },
      order: { fecha_vencimiento: 'ASC' },
    });

    let cantidad_restante = consumible.cantidad;

    for (const lote of lotes) {
      if (cantidad_restante <= 0) break;

      const cantidad_a_descontar = Math.min(cantidad_restante, Number(lote.cantidad_actual));

      if (cantidad_a_descontar > 0) {
        lote.cantidad_actual = Number(lote.cantidad_actual) - cantidad_a_descontar;
        await this.lote_repositorio.save(lote);

        const cita_consumible = this.cita_consumible_repositorio.create({
          cantidad_usada: cantidad_a_descontar,
          cita: cita,
          lote: lote,
        });

        await this.cita_consumible_repositorio.save(cita_consumible);

        cantidad_restante -= cantidad_a_descontar;
      }
    }

    if (cantidad_restante > 0) {
      throw new BadRequestException(
        `No hay suficiente stock de ${producto.nombre}. Faltan ${cantidad_restante} ${producto.unidad_medida}`,
      );
    }

    resultados.push({
      producto_id: consumible.producto_id,
      producto_nombre: producto.nombre,
      cantidad_descontada: consumible.cantidad,
    });
  }

  return {
    mensaje: 'Consumibles confirmados exitosamente',
    cita_id: cita_id,
    consumibles_procesados: resultados,
  };
}

  async cambiarEstadoActivo(
    usuario_id: number,
    inventario_id: number,
    activo_id: number,
    dto: CambiarEstadoActivoDto,
  ): Promise<Activo> {
    await this.obtenerInventarioPorId(usuario_id, inventario_id);

    const activo = await this.activo_repositorio.findOne({
      where: { id: activo_id },
      relations: ['producto', 'producto.inventario'],
    });

    if (!activo || activo.producto.inventario.id !== inventario_id) {
      throw new NotFoundException('Activo no encontrado en este inventario');
    }

    const estado_anterior = activo.estado;

    if (estado_anterior !== dto.estado) {
      const historial = this.activo_historial_repositorio.create({
        estado_anterior: estado_anterior,
        estado_nuevo: dto.estado,
        activo: activo,
        usuario: { id: usuario_id } as Usuario,
      });

      await this.activo_historial_repositorio.save(historial);

      activo.estado = dto.estado;
      await this.activo_repositorio.save(activo);

      // Registrar auditoría de cambio de estado
      await this.registrarMovimientoAuditoria(
        inventario_id,
        TipoMovimiento.ACTIVO_CAMBIO_ESTADO,
        usuario_id,
        activo.producto,
        { estado: estado_anterior },
        { estado: dto.estado },
        `Estado de activo cambiado de ${estado_anterior} a ${dto.estado}`,
      );
    }

    return activo;
  }

  async obtenerHistorialActivo(usuario_id: number, inventario_id: number, activo_id: number): Promise<any[]> {
    await this.obtenerInventarioPorId(usuario_id, inventario_id);

    const activo = await this.activo_repositorio.findOne({
      where: { id: activo_id },
      relations: ['producto', 'producto.inventario'],
    });

    if (!activo || activo.producto.inventario.id !== inventario_id) {
      throw new NotFoundException('Activo no encontrado en este inventario');
    }

    return this.activo_historial_repositorio.find({
      where: { activo: { id: activo_id } },
      relations: ['usuario'],
      order: { fecha: 'DESC' },
    });
  }

  async obtenerReporteValorInventario(usuario_id: number, inventario_id: number): Promise<any> {
  await this.obtenerInventarioPorId(usuario_id, inventario_id);

  const lotes = await this.lote_repositorio
    .createQueryBuilder('lote')
    .innerJoin('lote.producto', 'producto')
    .where('producto.inventario = :inventario_id', { inventario_id })
    .andWhere('producto.activo = :producto_activo', { producto_activo: true })
    .andWhere('lote.activo = :activo', { activo: true })
    .getMany();

  const valor_consumibles = lotes.reduce((total, lote) => {
    return total + Number(lote.cantidad_actual) * Number(lote.costo_unitario_compra);
  }, 0);

  const activos = await this.activo_repositorio
    .createQueryBuilder('activo')
    .innerJoin('activo.producto', 'producto')
    .where('producto.inventario = :inventario_id', { inventario_id })
    .andWhere('producto.activo = :producto_activo', { producto_activo: true })
    .andWhere('activo.estado != :estado', { estado: EstadoActivo.DESECHADO })
    .getMany();

  const valor_activos = activos.reduce((total, activo) => {
    return total + Number(activo.costo_compra);
  }, 0);

  const valor_total = valor_consumibles + valor_activos;

  return {
    inventario_id,
    valor_consumibles: Math.round(valor_consumibles * 100) / 100,
    valor_activos: Math.round(valor_activos * 100) / 100,
    valor_total: Math.round(valor_total * 100) / 100,
    cantidad_lotes: lotes.length,
    cantidad_activos: activos.length,
    desglose_activos_por_estado: {
      disponible: activos.filter(a => a.estado === EstadoActivo.DISPONIBLE).length,
      en_uso: activos.filter(a => a.estado === EstadoActivo.EN_USO).length,
      en_mantenimiento: activos.filter(a => a.estado === EstadoActivo.EN_MANTENIMIENTO).length,
      roto: activos.filter(a => a.estado === EstadoActivo.ROTO).length,
    },
  };
}

  private async registrarMovimiento(
  producto: Producto,
  tipo: TipoMovimiento,
  cantidad: number,
  stock_anterior: number,
  stock_nuevo: number,
  usuario_id: number,
  referencia?: string,
  observaciones?: string,
): Promise<void> {
  const movimiento = this.movimiento_repositorio.create({
    tipo: tipo,
    cantidad: cantidad,
    stock_anterior: stock_anterior,
    stock_nuevo: stock_nuevo,
    referencia: referencia,
    observaciones: observaciones,
  });

  movimiento.producto = producto;
  movimiento.inventario = producto.inventario;
  movimiento.usuario = { id: usuario_id } as Usuario;

  await this.movimiento_repositorio.save(movimiento);
}

  // Nuevos métodos de auditoría
  private async registrarMovimientoAuditoria(
    inventario_id: number,
    tipo: TipoMovimiento,
    usuario_id: number,
    producto?: Producto,
    datos_anteriores?: any,
    datos_nuevos?: any,
    observaciones?: string,
  ): Promise<void> {
    const movimiento = new MovimientoInventario();
    movimiento.tipo = tipo;
    movimiento.inventario = { id: inventario_id } as Inventario;
    movimiento.usuario = { id: usuario_id } as Usuario;
    
    if (datos_anteriores) {
      movimiento.datos_anteriores = JSON.stringify(datos_anteriores);
    }
    
    if (datos_nuevos) {
      movimiento.datos_nuevos = JSON.stringify(datos_nuevos);
    }
    
    if (observaciones) {
      movimiento.observaciones = observaciones;
    }
    
    if (producto) {
      movimiento.producto = producto;
    }

    await this.movimiento_repositorio.save(movimiento);
  }

private async verificarStockDisponible(producto_id: number, cantidad_requerida: number): Promise<boolean> {
  const producto = await this.producto_repositorio.findOne({
    where: { id: producto_id, activo: true },
    relations: ['lotes'],
  });

  if (!producto) {
    throw new NotFoundException('Producto no encontrado');
  }

  if (producto.tipo_gestion !== TipoGestion.CONSUMIBLE) {
    const activos_disponibles = await this.activo_repositorio.count({
      where: {
        producto: { id: producto_id },
        estado: EstadoActivo.DISPONIBLE,
      },
    });

    return activos_disponibles >= cantidad_requerida;
  }

  const lotes_activos = producto.lotes.filter(l => l.activo);
  const stock_total = lotes_activos.reduce((total, lote) => {
    return total + Number(lote.cantidad_actual);
  }, 0);

  return stock_total >= cantidad_requerida;
}

async obtenerStockProducto(usuario_id: number, inventario_id: number, producto_id: number): Promise<any> {
  await this.obtenerInventarioPorId(usuario_id, inventario_id);

  const producto = await this.producto_repositorio.findOne({
    where: { id: producto_id, inventario: { id: inventario_id }, activo: true },
    relations: ['lotes', 'activos'],
  });

  if (!producto) {
    throw new NotFoundException('Producto no encontrado');
  }

  if (producto.tipo_gestion === TipoGestion.CONSUMIBLE) {
    const lotes_activos = producto.lotes.filter(l => l.activo);
    const stock_total = lotes_activos.reduce((total, lote) => {
      return total + Number(lote.cantidad_actual);
    }, 0);

    return {
      producto_id: producto.id,
      nombre: producto.nombre,
      tipo_gestion: producto.tipo_gestion,
      unidad_medida: producto.unidad_medida,
      stock_actual: stock_total,
      stock_minimo: producto.stock_minimo,
      alerta_stock_bajo: stock_total < producto.stock_minimo,
      lotes: lotes_activos.map(l => ({
        id: l.id,
        nro_lote: l.nro_lote,
        cantidad: Number(l.cantidad_actual),
        fecha_vencimiento: l.fecha_vencimiento,
      })),
    };
  } else {
    const activos_por_estado = {
      disponible: 0,
      en_uso: 0,
      en_mantenimiento: 0,
      roto: 0,
      desechado: 0,
    };

    producto.activos.forEach(activo => {
      activos_por_estado[activo.estado]++;
    });

    return {
      producto_id: producto.id,
      nombre: producto.nombre,
      tipo_gestion: producto.tipo_gestion,
      activos_por_estado: activos_por_estado,
      total_activos: producto.activos.length,
      activos_disponibles: activos_por_estado.disponible,
    };
  }
}

async asignarMaterialesCita(
  usuario_id: number,
  cita_id: number,
  dto: AsignarMaterialesCitaDto,
): Promise<any> {
  const cita = await this.cita_repositorio.findOne({
    where: { id: cita_id, usuario: { id: usuario_id } },
  });

  if (!cita) {
    throw new NotFoundException('Cita no encontrada');
  }

  await this.material_cita_repositorio.delete({ cita: { id: cita_id } });

  const materiales_asignados: MaterialCita[] = [];

  for (const material_dto of dto.materiales) {
    const puede_asignar = await this.verificarStockDisponible(
      material_dto.producto_id,
      material_dto.cantidad_planeada,
    );

    if (!puede_asignar) {
      const producto = await this.producto_repositorio.findOne({
        where: { id: material_dto.producto_id },
      });
      
      throw new BadRequestException(
        `Stock insuficiente para ${producto?.nombre || 'el producto'}. Cantidad requerida: ${material_dto.cantidad_planeada}`,
      );
    }

    const material = this.material_cita_repositorio.create({
      cita: cita,
      producto: { id: material_dto.producto_id } as Producto,
      cantidad_planeada: material_dto.cantidad_planeada,
    });

    const material_guardado = await this.material_cita_repositorio.save(material);
    materiales_asignados.push(material_guardado);
  }

  return {
    mensaje: 'Materiales asignados a la cita',
    cita_id: cita_id,
    materiales: materiales_asignados,
  };
}

async confirmarMaterialesCita(
  usuario_id: number,
  cita_id: number,
  dto: ConfirmarMaterialesCitaDto,
): Promise<any> {
  const cita = await this.cita_repositorio.findOne({
    where: { id: cita_id, usuario: { id: usuario_id } },
  });

  if (!cita) {
    throw new NotFoundException('Cita no encontrada');
  }

  if (cita.materiales_confirmados) {
    throw new BadRequestException('Los materiales de esta cita ya fueron confirmados');
  }

  const materiales_confirmados: MaterialCita[] = [];

  for (const material_dto of dto.materiales) {
    const material = await this.material_cita_repositorio.findOne({
      where: { id: material_dto.material_cita_id },
      relations: ['producto', 'producto.lotes'],
    });

    if (!material) {
      throw new NotFoundException(`Material con ID ${material_dto.material_cita_id} no encontrado`);
    }

    const puede_usar = await this.verificarStockDisponible(
      material.producto.id,
      material_dto.cantidad_usada,
    );

    if (!puede_usar) {
      throw new BadRequestException(
        `Stock insuficiente para ${material.producto.nombre}. Cantidad requerida: ${material_dto.cantidad_usada}`,
      );
    }

    if (material.producto.tipo_gestion === TipoGestion.CONSUMIBLE) {
      const lotes = await this.lote_repositorio.find({
        where: { producto: { id: material.producto.id }, activo: true },
        order: { fecha_vencimiento: 'ASC' },
      });

      let cantidad_restante = material_dto.cantidad_usada;
      const stock_anterior = lotes.reduce((total, lote) => total + Number(lote.cantidad_actual), 0);

      for (const lote of lotes) {
        if (cantidad_restante <= 0) break;

        const cantidad_a_descontar = Math.min(cantidad_restante, Number(lote.cantidad_actual));

        if (cantidad_a_descontar > 0) {
          lote.cantidad_actual = Number(lote.cantidad_actual) - cantidad_a_descontar;
          await this.lote_repositorio.save(lote);
          cantidad_restante -= cantidad_a_descontar;
        }
      }

      const stock_nuevo = lotes.reduce((total, lote) => total + Number(lote.cantidad_actual), 0);

      await this.registrarMovimiento(
        material.producto,
        TipoMovimiento.USO_CITA,
        material_dto.cantidad_usada,
        stock_anterior,
        stock_nuevo,
        usuario_id,
        `Cita ID: ${cita_id}`,
        `Uso confirmado en cita`,
      );
    }

    material.cantidad_usada = material_dto.cantidad_usada;
    material.confirmado = true;
    await this.material_cita_repositorio.save(material);

    materiales_confirmados.push(material);
  }

  cita.materiales_confirmados = true;
  await this.cita_repositorio.save(cita);

  return {
    mensaje: 'Materiales confirmados exitosamente',
    cita_id: cita_id,
    materiales_confirmados: materiales_confirmados.length,
  };
}

async obtenerMaterialesCita(usuario_id: number, cita_id: number): Promise<any> {
  const cita = await this.cita_repositorio.findOne({
    where: { id: cita_id, usuario: { id: usuario_id } },
  });

  if (!cita) {
    throw new NotFoundException('Cita no encontrada');
  }

  const materiales = await this.material_cita_repositorio.find({
    where: { cita: { id: cita_id } },
    relations: ['producto', 'producto.inventario', 'producto.lotes', 'producto.activos'],
  });

  const materiales_formateados = materiales.map(material => ({
    id: material.id,
    producto_id: material.producto.id,
    inventario_id: material.producto.inventario.id,
    inventario_nombre: material.producto.inventario.nombre,
    producto_nombre: material.producto.nombre,
    tipo_gestion: material.producto.tipo_gestion,
    unidad_medida: material.producto.unidad_medida,
    cantidad_planeada: material.cantidad_planeada,
    cantidad_usada: material.cantidad_usada,
    confirmado: material.confirmado,
  }));

  return {
    materiales: materiales_formateados,
    confirmados: cita.materiales_confirmados,
  };
}

async asignarMaterialesTratamiento(
  usuario_id: number,
  plan_tratamiento_id: number,
  dto: AsignarMaterialesTratamientoDto,
): Promise<any> {
  const plan = await this.plan_tratamiento_repositorio.findOne({
    where: { id: plan_tratamiento_id, usuario: { id: usuario_id } },
  });

  if (!plan) {
    throw new NotFoundException('Plan de tratamiento no encontrado');
  }

  const materiales_asignados: MaterialTratamiento[] = [];

  for (const material_dto of dto.materiales) {
    const puede_asignar = await this.verificarStockDisponible(
      material_dto.producto_id,
      material_dto.cantidad_planeada,
    );

    if (!puede_asignar) {
      const producto = await this.producto_repositorio.findOne({
        where: { id: material_dto.producto_id },
      });
      
      throw new BadRequestException(
        `Stock insuficiente para ${producto?.nombre || 'el producto'}. Cantidad requerida: ${material_dto.cantidad_planeada}`,
      );
    }

    const material = this.material_tratamiento_repositorio.create({
      plan_tratamiento: plan,
      producto: { id: material_dto.producto_id } as Producto,
      tipo: material_dto.tipo,
      cantidad_planeada: material_dto.cantidad_planeada,
    });

    const material_guardado = await this.material_tratamiento_repositorio.save(material);
    materiales_asignados.push(material_guardado);
  }

  return {
    mensaje: 'Materiales asignados al tratamiento',
    plan_tratamiento_id: plan_tratamiento_id,
    materiales: materiales_asignados,
  };
}

async obtenerMaterialesTratamiento(usuario_id: number, plan_tratamiento_id: number): Promise<any> {
  const plan = await this.plan_tratamiento_repositorio.findOne({
    where: { id: plan_tratamiento_id, usuario: { id: usuario_id } },
  });

  if (!plan) {
    throw new NotFoundException('Plan de tratamiento no encontrado');
  }

  const materiales = await this.material_tratamiento_repositorio.find({
    where: { plan_tratamiento: { id: plan_tratamiento_id } },
    relations: ['producto', 'producto.inventario', 'producto.lotes', 'producto.activos'],
  });

  const materiales_formateados = materiales.map(material => ({
    id: material.id,
    producto_id: material.producto.id,
    inventario_id: material.producto.inventario.id,
    inventario_nombre: material.producto.inventario.nombre,
    producto_nombre: material.producto.nombre,
    tipo_gestion: material.producto.tipo_gestion,
    unidad_medida: material.producto.unidad_medida,
    tipo: material.tipo,
    cantidad_planeada: material.cantidad_planeada,
    cantidad_usada: material.cantidad_usada,
    confirmado: material.confirmado,
  }));

  return {
    materiales: materiales_formateados,
  };
}

async confirmarMaterialesGenerales(
  usuario_id: number,
  plan_tratamiento_id: number,
  dto: ConfirmarMaterialesTratamientoDto,
): Promise<any> {
  // Obtener el plan de tratamiento
  const plan = await this.plan_tratamiento_repositorio.findOne({
    where: { id: plan_tratamiento_id, usuario: { id: usuario_id } },
    relations: ['paciente', 'tratamiento'],
  });

  if (!plan) {
    throw new NotFoundException('Plan de tratamiento no encontrado');
  }

  // Verificar que los materiales no hayan sido confirmados previamente
  if (plan.materiales_inicio_confirmados) {
    throw new BadRequestException('Los materiales generales ya fueron confirmados');
  }

  const materiales_confirmados: MaterialTratamiento[] = [];

  // Procesar cada material del DTO
  for (const material_dto of dto.materiales) {
    const material = await this.material_tratamiento_repositorio.findOne({
      where: { id: material_dto.material_tratamiento_id },
      relations: ['producto', 'producto.lotes'],
    });

    if (!material) {
      throw new NotFoundException(`Material con ID ${material_dto.material_tratamiento_id} no encontrado`);
    }

    // Verificar que sea material de tipo 'inicio'
    if (material.tipo !== TipoMaterialTratamiento.INICIO) {
      throw new BadRequestException(
        `El material ${material.producto.nombre} no es de tipo general (inicio)`,
      );
    }

    // Verificar stock disponible
    const puede_usar = await this.verificarStockDisponible(
      material.producto.id,
      material_dto.cantidad_usada,
    );

    if (!puede_usar) {
      throw new BadRequestException(
        `Stock insuficiente para ${material.producto.nombre}. ` +
        `Cantidad requerida: ${material_dto.cantidad_usada}`,
      );
    }

    // Si es consumible, reducir stock del inventario
    if (material.producto.tipo_gestion === TipoGestion.CONSUMIBLE) {
      const lotes = await this.lote_repositorio.find({
        where: { producto: { id: material.producto.id }, activo: true },
        order: { fecha_vencimiento: 'ASC' },
      });

      let cantidad_restante = material_dto.cantidad_usada;
      const stock_anterior = lotes.reduce((total, lote) => total + Number(lote.cantidad_actual), 0);

      for (const lote of lotes) {
        if (cantidad_restante <= 0) break;

        const cantidad_a_descontar = Math.min(cantidad_restante, Number(lote.cantidad_actual));

        if (cantidad_a_descontar > 0) {
          lote.cantidad_actual = Number(lote.cantidad_actual) - cantidad_a_descontar;
          await this.lote_repositorio.save(lote);
          cantidad_restante -= cantidad_a_descontar;
        }
      }

      const stock_nuevo = lotes.reduce((total, lote) => total + Number(lote.cantidad_actual), 0);

      // Registrar movimiento de inventario
      await this.registrarMovimiento(
        material.producto,
        TipoMovimiento.USO_TRATAMIENTO,
        material_dto.cantidad_usada,
        stock_anterior,
        stock_nuevo,
        usuario_id,
        `Plan Tratamiento ID: ${plan_tratamiento_id}`,
        `Materiales generales confirmados manualmente`,
      );
    }

    // Marcar material como confirmado
    material.cantidad_usada = material_dto.cantidad_usada;
    material.confirmado = true;
    await this.material_tratamiento_repositorio.save(material);

    materiales_confirmados.push(material);
  }

  // Marcar materiales como confirmados en el plan
  plan.materiales_inicio_confirmados = true;

  // Si se incluye información de pago, actualizar el plan
  if (dto.estado_pago) {
    // Si hay un monto de pago, registrar en finanzas
    if (dto.monto_pago && dto.monto_pago > 0) {
      const monto_anterior = plan.total_abonado || 0;
      plan.total_abonado = monto_anterior + dto.monto_pago;

      const nombre_tratamiento = plan.tratamiento?.nombre || 'Tratamiento';
      
      // Registrar pago en finanzas usando el método existente
      await this.finanzas_servicio.registrarPago(usuario_id, {
        fecha: new Date(),
        monto: dto.monto_pago,
        concepto: `Pago de tratamiento: ${nombre_tratamiento} - Confirmación de materiales generales (${dto.estado_pago})`,
      });
    }
  }

  await this.plan_tratamiento_repositorio.save(plan);

  return {
    mensaje: 'Materiales generales confirmados exitosamente',
    plan_tratamiento_id: plan_tratamiento_id,
    materiales_confirmados: materiales_confirmados.length,
    estado_pago: dto.estado_pago,
    monto_pago: dto.monto_pago,
    total_abonado: plan.total_abonado,
    detalles: materiales_confirmados.map(m => ({
      producto: m.producto.nombre,
      cantidad_planeada: m.cantidad_planeada,
      cantidad_usada: m.cantidad_usada,
    })),
  };
}

async obtenerHistorialMovimientos(
  usuario_id: number,
  inventario_id: number,
  filtros: {
    producto_id?: number;
    tipos?: string[];
    fecha_inicio?: Date;
    fecha_fin?: Date;
    usuario_id?: number;
    limit?: number;
  } = {},
): Promise<any[]> {
  await this.obtenerInventarioPorId(usuario_id, inventario_id);

  const queryBuilder = this.movimiento_repositorio
    .createQueryBuilder('movimiento')
    .leftJoinAndSelect('movimiento.producto', 'producto')
    .leftJoinAndSelect('movimiento.usuario', 'usuario')
    .leftJoinAndSelect('movimiento.inventario', 'inventario')
    .where('inventario.id = :inventario_id', { inventario_id })
    .orderBy('movimiento.fecha', 'DESC')
    .take(filtros.limit || 100);

  if (filtros.producto_id) {
    queryBuilder.andWhere('producto.id = :producto_id', { producto_id: filtros.producto_id });
  }

  if (filtros.tipos && filtros.tipos.length > 0) {
    queryBuilder.andWhere('movimiento.tipo IN (:...tipos)', { tipos: filtros.tipos });
  }

  if (filtros.fecha_inicio) {
    queryBuilder.andWhere('movimiento.fecha >= :fecha_inicio', { fecha_inicio: filtros.fecha_inicio });
  }

  if (filtros.fecha_fin) {
    queryBuilder.andWhere('movimiento.fecha <= :fecha_fin', { fecha_fin: filtros.fecha_fin });
  }

  if (filtros.usuario_id) {
    queryBuilder.andWhere('usuario.id = :usuario_filtro_id', { usuario_filtro_id: filtros.usuario_id });
  }

  const movimientos = await queryBuilder.getMany();

  // Parsear datos JSON para auditoría
  return movimientos.map(mov => ({
    ...mov,
    datos_anteriores: mov.datos_anteriores ? JSON.parse(mov.datos_anteriores) : null,
    datos_nuevos: mov.datos_nuevos ? JSON.parse(mov.datos_nuevos) : null,
  }));
}

async actualizarInventario(
  usuario_id: number,
  inventario_id: number,
  dto: ActualizarInventarioDto,
): Promise<Inventario> {
  const inventario = await this.inventario_repositorio.findOne({
    where: { id: inventario_id, activo: true },
    relations: ['propietario'],
  });

  if (!inventario) {
    throw new NotFoundException('Inventario no encontrado');
  }

  if (inventario.propietario.id !== usuario_id) {
    throw new ForbiddenException('Solo el propietario puede actualizar el inventario');
  }

  Object.assign(inventario, dto);
  return this.inventario_repositorio.save(inventario);
}

async eliminarLote(usuario_id: number, inventario_id: number, lote_id: number): Promise<void> {
  await this.obtenerInventarioPorId(usuario_id, inventario_id);

  const lote = await this.lote_repositorio.findOne({
    where: { id: lote_id },
    relations: ['producto', 'producto.inventario'],
  });

  if (!lote || lote.producto.inventario.id !== inventario_id) {
    throw new NotFoundException('Lote no encontrado en este inventario');
  }

  // Guardar datos antes de eliminar
  const datos_lote = {
    nro_lote: lote.nro_lote,
    cantidad_actual: lote.cantidad_actual,
    fecha_vencimiento: lote.fecha_vencimiento,
  };

  const producto = lote.producto;
  
  await this.lote_repositorio.remove(lote);

  // Registrar auditoría de eliminación
  await this.registrarMovimientoAuditoria(
    inventario_id,
    TipoMovimiento.LOTE_ELIMINADO,
    usuario_id,
    producto,
    datos_lote,
    undefined,
    `Lote "${datos_lote.nro_lote}" eliminado de ${producto.nombre}`,
  );
}

async actualizarActivo(
  usuario_id: number,
  inventario_id: number,
  activo_id: number,
  dto: ActualizarActivoDto,
): Promise<Activo> {
  await this.obtenerInventarioPorId(usuario_id, inventario_id);

  const activo = await this.activo_repositorio.findOne({
    where: { id: activo_id },
    relations: ['producto', 'producto.inventario'],
  });

  if (!activo || activo.producto.inventario.id !== inventario_id) {
    throw new NotFoundException('Activo no encontrado en este inventario');
  }

  // Guardar datos anteriores para auditoría
  const datos_anteriores: any = {
    estado: activo.estado,
    ubicacion: activo.ubicacion,
    nombre_asignado: activo.nombre_asignado,
  };

  if (dto.estado && dto.estado !== activo.estado) {
    const historial = this.activo_historial_repositorio.create({
      estado_anterior: activo.estado,
      estado_nuevo: dto.estado,
      activo: activo,
      usuario: { id: usuario_id } as Usuario,
    });
    await this.activo_historial_repositorio.save(historial);
    activo.estado = dto.estado;
  }

  if (dto.ubicacion !== undefined) {
    activo.ubicacion = dto.ubicacion;
  }

  if (dto.nombre_asignado !== undefined) {
    activo.nombre_asignado = dto.nombre_asignado;
  }

  const activo_actualizado = await this.activo_repositorio.save(activo);

  // Registrar auditoría de edición
  await this.registrarMovimientoAuditoria(
    inventario_id,
    TipoMovimiento.ACTIVO_EDITADO,
    usuario_id,
    activo.producto,
    datos_anteriores,
    dto,
    `Activo editado`,
  );

  return activo_actualizado;
}

async eliminarActivo(usuario_id: number, inventario_id: number, activo_id: number): Promise<void> {
  await this.obtenerInventarioPorId(usuario_id, inventario_id);

  const activo = await this.activo_repositorio.findOne({
    where: { id: activo_id },
    relations: ['producto', 'producto.inventario'],
  });

  if (!activo || activo.producto.inventario.id !== inventario_id) {
    throw new NotFoundException('Activo no encontrado en este inventario');
  }

  // Guardar datos antes de eliminar
  const datos_activo = {
    nro_serie: activo.nro_serie,
    nombre_asignado: activo.nombre_asignado,
    estado: activo.estado,
    costo_compra: activo.costo_compra,
  };

  const producto = activo.producto;
  
  await this.activo_repositorio.remove(activo);

  // Registrar auditoría de eliminación
  await this.registrarMovimientoAuditoria(
    inventario_id,
    TipoMovimiento.ACTIVO_ELIMINADO,
    usuario_id,
    producto,
    datos_activo,
    undefined,
    `Activo eliminado de ${producto.nombre}`,
  );
}

async venderActivo(usuario_id: number, inventario_id: number, activo_id: number, monto_venta: number, registrar_pago: boolean = true): Promise<any> {
  await this.obtenerInventarioPorId(usuario_id, inventario_id);

  const activo = await this.activo_repositorio.findOne({
    where: { id: activo_id },
    relations: ['producto', 'producto.inventario'],
  });

  if (!activo || activo.producto.inventario.id !== inventario_id) {
    throw new NotFoundException('Activo no encontrado en este inventario');
  }

  const estado_anterior = activo.estado;

  activo.estado = EstadoActivo.DESECHADO;
  await this.activo_repositorio.save(activo);

  // Registrar auditoría de venta
  await this.registrarMovimientoAuditoria(
    inventario_id,
    TipoMovimiento.ACTIVO_VENDIDO,
    usuario_id,
    activo.producto,
    { estado: estado_anterior, costo_compra: activo.costo_compra },
    { estado: EstadoActivo.DESECHADO, monto_venta },
    `Activo vendido por $${monto_venta}`,
  );

  if (registrar_pago) {
    await this.finanzas_servicio.registrarPago(usuario_id, {
      concepto: `Venta: ${activo.producto.nombre} - ${activo.nombre_asignado || activo.nro_serie || 'Activo'}`,
      monto: monto_venta,
      fecha: new Date(),
    });
  }

  return {
    mensaje: 'Activo vendido correctamente',
    activo_id: activo.id,
    monto_venta,
    pago_registrado: registrar_pago,
  };
}

async ajustarStock(usuario_id: number, inventario_id: number, dto: AjustarStockDto): Promise<any> {
  await this.obtenerInventarioPorId(usuario_id, inventario_id);

  const producto = await this.producto_repositorio.findOne({
    where: { id: dto.producto_id, inventario: { id: inventario_id }, activo: true },
    relations: ['lotes'],
  });

  if (!producto) {
    throw new NotFoundException('Producto no encontrado');
  }

  if (producto.tipo_gestion !== TipoGestion.CONSUMIBLE) {
    throw new BadRequestException('Solo se puede ajustar stock de productos consumibles');
  }

  const stock_anterior = await this.obtenerStockProducto(usuario_id, inventario_id, dto.producto_id);
  const lotes_activos = producto.lotes
    .filter(l => l.activo && l.cantidad_actual > 0)
    .sort((a, b) => a.fecha_vencimiento.getTime() - b.fecha_vencimiento.getTime());

  if (dto.tipo === TipoAjuste.ENTRADA) {
    if (lotes_activos.length === 0) {
      throw new BadRequestException('No hay lotes disponibles. Registra un nuevo lote para agregar stock.');
    }
    const lote_mas_reciente = lotes_activos[lotes_activos.length - 1];
    lote_mas_reciente.cantidad_actual = Number(lote_mas_reciente.cantidad_actual) + dto.cantidad;
    await this.lote_repositorio.save(lote_mas_reciente);
  } else {
    let cantidad_restante = dto.cantidad;
    
    for (const lote of lotes_activos) {
      if (cantidad_restante <= 0) break;
      
      const cantidad_lote = Number(lote.cantidad_actual);
      const cantidad_a_descontar = Math.min(cantidad_restante, cantidad_lote);
      
      lote.cantidad_actual = cantidad_lote - cantidad_a_descontar;
      await this.lote_repositorio.save(lote);
      
      cantidad_restante -= cantidad_a_descontar;
    }

    if (cantidad_restante > 0) {
      throw new BadRequestException(`No hay suficiente stock. Stock disponible: ${stock_anterior.stock_actual}`);
    }
  }

  const stock_nuevo_data = await this.obtenerStockProducto(usuario_id, inventario_id, dto.producto_id);
  const stock_nuevo = stock_nuevo_data.stock_actual;

  const movimiento = this.movimiento_repositorio.create({
    tipo: dto.tipo === TipoAjuste.ENTRADA ? TipoMovimiento.ENTRADA : TipoMovimiento.SALIDA,
    cantidad: dto.cantidad,
    stock_anterior: stock_anterior.stock_actual,
    stock_nuevo: stock_nuevo,
    observaciones: dto.observaciones,
    producto: producto,
    usuario: { id: usuario_id } as Usuario,
  });

  await this.movimiento_repositorio.save(movimiento);

  // Registrar movimiento financiero
  if (dto.generar_movimiento_financiero && dto.monto) {
    if (dto.tipo === TipoAjuste.ENTRADA) {
      // Entrada = Compra = Egreso en finanzas
      await this.finanzas_servicio.registrarEgreso(usuario_id, {
        concepto: `Compra: ${producto.nombre} (${dto.cantidad} ${producto.unidad_medida})`,
        monto: dto.monto,
        fecha: new Date(),
      });
    } else {
      await this.finanzas_servicio.registrarPago(usuario_id, {
        concepto: `Venta: ${producto.nombre} (${dto.cantidad} ${producto.unidad_medida})`,
        monto: dto.monto,
        fecha: new Date(),
      });
    }
  }

  return {
    mensaje: 'Ajuste de stock registrado correctamente',
    stock_anterior: stock_anterior.stock_actual,
    stock_nuevo: stock_nuevo,
    movimiento_id: movimiento.id,
    movimiento_financiero_registrado: dto.generar_movimiento_financiero && dto.monto ? true : false,
  };
}
}