import { 
  EntitySubscriberInterface, 
  EventSubscriber, 
  InsertEvent, 
  UpdateEvent, 
  RemoveEvent,
  DataSource
} from 'typeorm';
import { Producto, TipoGestion } from './entidades/producto.entidad';
import { Lote } from './entidades/lote.entidad';
import { Activo } from './entidades/activo.entidad';
import { MovimientoInventario, TipoMovimiento, CategoriaMovimiento } from './entidades/movimiento-inventario.entidad';

/**
 * Subscriber para registrar automáticamente los movimientos de inventario
 * cuando se crean o eliminan productos, lotes o activos
 */
@EventSubscriber()
export class InventarioSubscriber implements EntitySubscriberInterface {
  constructor(dataSource: DataSource) {
    dataSource.subscribers.push(this);
  }

  /**
   * Registra automáticamente la creación de un producto
   */
  async afterInsert(event: InsertEvent<any>): Promise<void> {
    if (event.entity instanceof Producto) {
      await this.registrarCreacionProducto(event);
    } else if (event.entity instanceof Lote) {
      await this.registrarCreacionLote(event);
    } else if (event.entity instanceof Activo) {
      await this.registrarCreacionActivo(event);
    }
  }

  /**
   * Registra automáticamente la eliminación de un producto
   */
  async beforeRemove(event: RemoveEvent<any>): Promise<void> {
    if (event.entity instanceof Producto) {
      await this.registrarEliminacionProducto(event);
    } else if (event.entity instanceof Lote) {
      await this.registrarEliminacionLote(event);
    } else if (event.entity instanceof Activo) {
      await this.registrarEliminacionActivo(event);
    }
  }

  /**
   * Registra la creación de un producto
   */
  private async registrarCreacionProducto(event: InsertEvent<Producto>): Promise<void> {
    const producto = event.entity;
    
    // Solo registrar si el producto tiene un inventario asociado
    if (!producto.inventario) return;

    try {
      const movimiento = new MovimientoInventario();
      movimiento.tipo = TipoMovimiento.PRODUCTO_CREADO;
      movimiento.categoria = CategoriaMovimiento.AUDITORIA_PRODUCTO;
      movimiento.inventario = producto.inventario;
      movimiento.producto = producto;
      movimiento.datos_nuevos = JSON.stringify({
        nombre: producto.nombre,
        tipo_gestion: producto.tipo_gestion,
        stock_minimo: producto.stock_minimo,
        unidad_medida: producto.unidad_medida,
        descripcion: producto.descripcion,
      });
      movimiento.observaciones = `Producto "${producto.nombre}" creado automáticamente`;

      await event.manager.save(MovimientoInventario, movimiento);
    } catch (error) {
      console.error('Error al registrar creación de producto:', error);
    }
  }

  /**
   * Registra la creación de un lote
   */
  private async registrarCreacionLote(event: InsertEvent<Lote>): Promise<void> {
    const lote = event.entity;
    
    if (!lote.producto) return;

    try {
      // Cargar el producto con su inventario si no está cargado
      const producto = await event.manager.findOne(Producto, {
        where: { id: lote.producto.id },
        relations: ['inventario'],
      });

      if (!producto || !producto.inventario) return;

      const movimiento = new MovimientoInventario();
      movimiento.tipo = TipoMovimiento.LOTE_CREADO;
      movimiento.categoria = CategoriaMovimiento.AUDITORIA_LOTE;
      movimiento.inventario = producto.inventario;
      movimiento.producto = producto;
      movimiento.lote = lote;
      movimiento.cantidad = lote.cantidad_actual;
      movimiento.datos_nuevos = JSON.stringify({
        nro_lote: lote.nro_lote,
        cantidad_actual: lote.cantidad_actual,
        fecha_vencimiento: lote.fecha_vencimiento,
        costo_unitario_compra: lote.costo_unitario_compra,
      });
      movimiento.observaciones = `Lote "${lote.nro_lote}" creado automáticamente para ${producto.nombre}`;

      await event.manager.save(MovimientoInventario, movimiento);
    } catch (error) {
      console.error('Error al registrar creación de lote:', error);
    }
  }

  /**
   * Registra la creación de un activo (serie o general)
   */
  private async registrarCreacionActivo(event: InsertEvent<Activo>): Promise<void> {
    const activo = event.entity;
    
    if (!activo.producto) return;

    try {
      // Cargar el producto con su inventario si no está cargado
      const producto = await event.manager.findOne(Producto, {
        where: { id: activo.producto.id },
        relations: ['inventario'],
      });

      if (!producto || !producto.inventario) return;

      const movimiento = new MovimientoInventario();
      
      // Determinar el tipo según el tipo de gestión del producto
      if (producto.tipo_gestion === TipoGestion.ACTIVO_SERIALIZADO) {
        movimiento.tipo = TipoMovimiento.SERIE_CREADA;
        movimiento.categoria = CategoriaMovimiento.AUDITORIA_SERIE;
      } else if (producto.tipo_gestion === TipoGestion.ACTIVO_GENERAL) {
        movimiento.tipo = TipoMovimiento.GENERAL_CREADO;
        movimiento.categoria = CategoriaMovimiento.AUDITORIA_GENERAL;
      } else {
        return; // No es un activo válido
      }

      movimiento.inventario = producto.inventario;
      movimiento.producto = producto;
      movimiento.activo = activo;
      movimiento.cantidad = 1;
      movimiento.datos_nuevos = JSON.stringify({
        nro_serie: activo.nro_serie,
        nombre_asignado: activo.nombre_asignado,
        estado: activo.estado,
        costo_compra: activo.costo_compra,
        fecha_compra: activo.fecha_compra,
      });
      movimiento.observaciones = `${producto.tipo_gestion === TipoGestion.ACTIVO_SERIALIZADO ? 'Serie' : 'Activo general'} creado automáticamente para ${producto.nombre}`;

      await event.manager.save(MovimientoInventario, movimiento);
    } catch (error) {
      console.error('Error al registrar creación de activo:', error);
    }
  }

  /**
   * Registra la eliminación de un producto
   */
  private async registrarEliminacionProducto(event: RemoveEvent<Producto>): Promise<void> {
    const producto = event.entity;
    
    if (!producto || !producto.inventario) return;

    try {
      const movimiento = new MovimientoInventario();
      movimiento.tipo = TipoMovimiento.PRODUCTO_ELIMINADO;
      movimiento.categoria = CategoriaMovimiento.AUDITORIA_PRODUCTO;
      movimiento.inventario = producto.inventario;
      movimiento.datos_anteriores = JSON.stringify({
        id: producto.id,
        nombre: producto.nombre,
        tipo_gestion: producto.tipo_gestion,
        stock_minimo: producto.stock_minimo,
        unidad_medida: producto.unidad_medida,
        descripcion: producto.descripcion,
      });
      movimiento.observaciones = `Producto "${producto.nombre}" eliminado automáticamente`;

      await event.manager.save(MovimientoInventario, movimiento);
    } catch (error) {
      console.error('Error al registrar eliminación de producto:', error);
    }
  }

  /**
   * Registra la eliminación de un lote
   */
  private async registrarEliminacionLote(event: RemoveEvent<Lote>): Promise<void> {
    const lote = event.entity;
    
    if (!lote || !lote.producto) return;

    try {
      // Cargar el producto con su inventario si no está cargado
      const producto = await event.manager.findOne(Producto, {
        where: { id: lote.producto.id },
        relations: ['inventario'],
      });

      if (!producto || !producto.inventario) return;

      const movimiento = new MovimientoInventario();
      movimiento.tipo = TipoMovimiento.LOTE_ELIMINADO;
      movimiento.categoria = CategoriaMovimiento.AUDITORIA_LOTE;
      movimiento.inventario = producto.inventario;
      movimiento.producto = producto;
      movimiento.cantidad = lote.cantidad_actual;
      movimiento.datos_anteriores = JSON.stringify({
        id: lote.id,
        nro_lote: lote.nro_lote,
        cantidad_actual: lote.cantidad_actual,
        fecha_vencimiento: lote.fecha_vencimiento,
        costo_unitario_compra: lote.costo_unitario_compra,
      });
      movimiento.observaciones = `Lote "${lote.nro_lote}" eliminado automáticamente de ${producto.nombre}`;

      await event.manager.save(MovimientoInventario, movimiento);
    } catch (error) {
      console.error('Error al registrar eliminación de lote:', error);
    }
  }

  /**
   * Registra la eliminación de un activo (serie o general)
   */
  private async registrarEliminacionActivo(event: RemoveEvent<Activo>): Promise<void> {
    const activo = event.entity;
    
    if (!activo || !activo.producto) return;

    try {
      // Cargar el producto con su inventario si no está cargado
      const producto = await event.manager.findOne(Producto, {
        where: { id: activo.producto.id },
        relations: ['inventario'],
      });

      if (!producto || !producto.inventario) return;

      const movimiento = new MovimientoInventario();
      
      // Determinar el tipo según el tipo de gestión del producto
      if (producto.tipo_gestion === TipoGestion.ACTIVO_SERIALIZADO) {
        movimiento.tipo = TipoMovimiento.SERIE_ELIMINADA;
        movimiento.categoria = CategoriaMovimiento.AUDITORIA_SERIE;
      } else if (producto.tipo_gestion === TipoGestion.ACTIVO_GENERAL) {
        movimiento.tipo = TipoMovimiento.GENERAL_ELIMINADO;
        movimiento.categoria = CategoriaMovimiento.AUDITORIA_GENERAL;
      } else {
        return;
      }

      movimiento.inventario = producto.inventario;
      movimiento.producto = producto;
      movimiento.cantidad = 1;
      movimiento.datos_anteriores = JSON.stringify({
        id: activo.id,
        nro_serie: activo.nro_serie,
        nombre_asignado: activo.nombre_asignado,
        estado: activo.estado,
        costo_compra: activo.costo_compra,
        fecha_compra: activo.fecha_compra,
      });
      movimiento.observaciones = `${producto.tipo_gestion === TipoGestion.ACTIVO_SERIALIZADO ? 'Serie' : 'Activo general'} eliminado automáticamente de ${producto.nombre}`;

      await event.manager.save(MovimientoInventario, movimiento);
    } catch (error) {
      console.error('Error al registrar eliminación de activo:', error);
    }
  }
}
