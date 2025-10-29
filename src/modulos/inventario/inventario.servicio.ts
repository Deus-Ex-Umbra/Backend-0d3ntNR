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
import { MaterialTratamiento } from './entidades/material-tratamiento.entidad';
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
import { Usuario } from '../usuarios/entidades/usuario.entidad';
import { Cita } from '../agenda/entidades/cita.entidad';
import { PlanTratamiento } from '../tratamientos/entidades/plan-tratamiento.entidad';
import { FinanzasServicio } from '../finanzas/finanzas.servicio';


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
      propietario: { id: usuario_id } as Usuario,
    });
    return this.inventario_repositorio.save(nuevo_inventario);
  }

  async obtenerInventarios(usuario_id: number): Promise<Inventario[]> {
    const inventarios_propios = await this.inventario_repositorio.find({
      where: { propietario: { id: usuario_id } },
      relations: ['propietario'],
    });

    const permisos = await this.permiso_repositorio.find({
      where: { usuario_invitado: { id: usuario_id } },
      relations: ['inventario', 'inventario.propietario'],
    });

    const inventarios_compartidos = permisos.map(p => ({
      ...p.inventario,
      rol_usuario: p.rol,
      es_propietario: false,
    }));

    const inventarios_propios_marcados = inventarios_propios.map(inv => ({
      ...inv,
      rol_usuario: 'propietario',
      es_propietario: true,
    }));

    return [...inventarios_propios_marcados, ...inventarios_compartidos];
  }

  async obtenerInventarioPorId(usuario_id: number, inventario_id: number): Promise<any> {
    const inventario = await this.inventario_repositorio.findOne({
      where: { id: inventario_id },
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
      where: { id: inventario_id },
      relations: ['propietario'],
    });

    if (!inventario) {
      throw new NotFoundException('Inventario no encontrado');
    }

    if (inventario.propietario.id !== usuario_id) {
      throw new ForbiddenException('Solo el propietario puede eliminar el inventario');
    }

    await this.inventario_repositorio.remove(inventario);
  }

  async crearProducto(usuario_id: number, dto: CrearProductoDto): Promise<Producto> {
    const inventario = await this.obtenerInventarioPorId(usuario_id, dto.inventario_id);

    const nuevo_producto = this.producto_repositorio.create({
      nombre: dto.nombre,
      tipo_gestion: dto.tipo_gestion,
      stock_minimo: dto.stock_minimo || 0,
      unidad_medida: dto.unidad_medida || 'unidad',
      inventario: { id: dto.inventario_id } as Inventario,
    });

    return this.producto_repositorio.save(nuevo_producto);
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

    Object.assign(producto, dto);
    return this.producto_repositorio.save(producto);
  }

  async eliminarProducto(usuario_id: number, inventario_id: number, producto_id: number): Promise<void> {
    await this.obtenerInventarioPorId(usuario_id, inventario_id);

    const resultado = await this.producto_repositorio.update(
      { id: producto_id, inventario: { id: inventario_id } },
      { activo: false },
    );

    if (resultado.affected === 0) {
      throw new NotFoundException('Producto no encontrado');
    }
  }

  async registrarCompra(usuario_id: number, inventario_id: number, dto: RegistrarCompraDto): Promise<any> {
  await this.obtenerInventarioPorId(usuario_id, inventario_id);

  const producto = await this.producto_repositorio.findOne({
    where: { id: dto.producto_id, inventario: { id: inventario_id } },
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
      producto: producto,
    });

    resultado = await this.lote_repositorio.save(nuevo_lote);
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
        where: { id: consumible.producto_id },
      });

      if (!producto || producto.tipo_gestion !== TipoGestion.CONSUMIBLE) {
        throw new BadRequestException(`El producto ${consumible.producto_id} no es un consumible`);
      }

      const lotes = await this.lote_repositorio.find({
        where: { producto: { id: consumible.producto_id } },
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
      .where('producto.inventario_id = :inventario_id', { inventario_id })
      .getMany();

    const valor_consumibles = lotes.reduce((total, lote) => {
      return total + Number(lote.cantidad_actual) * Number(lote.costo_unitario_compra);
    }, 0);

    const activos = await this.activo_repositorio
      .createQueryBuilder('activo')
      .innerJoin('activo.producto', 'producto')
      .where('producto.inventario_id = :inventario_id', { inventario_id })
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
    producto: producto,
    tipo: tipo,
    cantidad: cantidad,
    stock_anterior: stock_anterior,
    stock_nuevo: stock_nuevo,
    referencia: referencia,
    observaciones: observaciones,
    usuario: { id: usuario_id } as Usuario,
  });

  await this.movimiento_repositorio.save(movimiento);
}

private async verificarStockDisponible(producto_id: number, cantidad_requerida: number): Promise<boolean> {
  const producto = await this.producto_repositorio.findOne({
    where: { id: producto_id },
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

  const stock_total = producto.lotes.reduce((total, lote) => {
    return total + Number(lote.cantidad_actual);
  }, 0);

  return stock_total >= cantidad_requerida;
}

async obtenerStockProducto(usuario_id: number, inventario_id: number, producto_id: number): Promise<any> {
  await this.obtenerInventarioPorId(usuario_id, inventario_id);

  const producto = await this.producto_repositorio.findOne({
    where: { id: producto_id, inventario: { id: inventario_id } },
    relations: ['lotes', 'activos'],
  });

  if (!producto) {
    throw new NotFoundException('Producto no encontrado');
  }

  if (producto.tipo_gestion === TipoGestion.CONSUMIBLE) {
    const stock_total = producto.lotes.reduce((total, lote) => {
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
      lotes: producto.lotes.map(l => ({
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
        where: { producto: { id: material.producto.id } },
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

async obtenerMaterialesCita(usuario_id: number, cita_id: number): Promise<any[]> {
  const cita = await this.cita_repositorio.findOne({
    where: { id: cita_id, usuario: { id: usuario_id } },
  });

  if (!cita) {
    throw new NotFoundException('Cita no encontrada');
  }

  return this.material_cita_repositorio.find({
    where: { cita: { id: cita_id } },
    relations: ['producto'],
  });
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

async obtenerHistorialMovimientos(
  usuario_id: number,
  inventario_id: number,
  producto_id?: number,
): Promise<any[]> {
  await this.obtenerInventarioPorId(usuario_id, inventario_id);

  const query: any = {
    relations: ['producto', 'usuario'],
    order: { fecha: 'DESC' },
    take: 100,
  };

  if (producto_id) {
    query.where = { producto: { id: producto_id } };
  } else {
    query.where = { producto: { inventario: { id: inventario_id } } };
  }

  return this.movimiento_repositorio.find(query);
}

async actualizarInventario(
  usuario_id: number,
  inventario_id: number,
  dto: ActualizarInventarioDto,
): Promise<Inventario> {
  const inventario = await this.inventario_repositorio.findOne({
    where: { id: inventario_id },
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
}