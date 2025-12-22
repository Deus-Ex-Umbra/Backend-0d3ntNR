import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tratamiento } from './entidades/tratamiento.entidad';
import { MaterialPlantilla, TipoMaterialPlantilla } from './entidades/material-plantilla.entidad';
import { Producto } from '../inventario/entidades/producto.entidad';
import { CrearTratamientoDto } from './dto/crear-tratamiento.dto';
import { ActualizarTratamientoDto } from './dto/actualizar-tratamiento.dto';

@Injectable()
export class TratamientosServicio {
  constructor(
    @InjectRepository(Tratamiento)
    private readonly tratamiento_repositorio: Repository<Tratamiento>,
    @InjectRepository(MaterialPlantilla)
    private readonly material_plantilla_repositorio: Repository<MaterialPlantilla>,
  ) { }

  async crear(usuario_id: number, crear_tratamiento_dto: CrearTratamientoDto): Promise<Tratamiento> {
    const { materiales, consumibles_generales, recursos_por_cita, ...datos_tratamiento } = crear_tratamiento_dto;
    const nuevo_tratamiento = this.tratamiento_repositorio.create({ ...datos_tratamiento, usuario_id });
    const tratamiento_guardado = await this.tratamiento_repositorio.save(nuevo_tratamiento);
    if (materiales && materiales.length > 0) {
      for (const material_dto of materiales) {
        const material = this.material_plantilla_repositorio.create({
          tratamiento: tratamiento_guardado,
          producto: { id: material_dto.producto_id } as Producto,
          tipo: material_dto.tipo,
          cantidad: material_dto.cantidad,
        });
        await this.material_plantilla_repositorio.save(material);
      }
    }
    if (consumibles_generales && consumibles_generales.length > 0) {
      for (const consumible_dto of consumibles_generales) {
        const material = this.material_plantilla_repositorio.create({
          tratamiento: tratamiento_guardado,
          producto: { id: consumible_dto.producto_id } as Producto,
          tipo: TipoMaterialPlantilla.GENERAL,
          cantidad: consumible_dto.cantidad,
          momento_confirmacion: consumible_dto.momento_confirmacion,
        });
        await this.material_plantilla_repositorio.save(material);
      }
    }
    if (recursos_por_cita && recursos_por_cita.length > 0) {
      for (const recurso_dto of recursos_por_cita) {
        const material = this.material_plantilla_repositorio.create({
          tratamiento: tratamiento_guardado,
          producto: { id: recurso_dto.producto_id } as Producto,
          tipo: TipoMaterialPlantilla.POR_CITA,
          cantidad: recurso_dto.cantidad,
        });
        await this.material_plantilla_repositorio.save(material);
      }
    }

    return tratamiento_guardado;
  }

  async encontrarTodos(usuario_id: number): Promise<Tratamiento[]> {
    return this.tratamiento_repositorio.find({ where: { activo: true, usuario_id } });
  }

  async encontrarPorId(usuario_id: number, id: number): Promise<Tratamiento> {
    const tratamiento = await this.tratamiento_repositorio.findOne({
      where: { id, activo: true, usuario_id }
    });
    if (!tratamiento) {
      throw new NotFoundException(`Tratamiento con ID "${id}" no encontrado.`);
    }
    return tratamiento;
  }

  async obtenerMaterialesPlantilla(usuario_id: number, id: number): Promise<any[]> {
    // Verify the tratamiento belongs to the user first
    await this.encontrarPorId(usuario_id, id);

    const materiales = await this.material_plantilla_repositorio.find({
      where: { tratamiento: { id } },
      relations: ['producto', 'producto.inventario', 'producto.materiales', 'producto.activos'],
    });

    return materiales.map(material => {
      let stock_disponible = 0;
      if (material.producto.materiales && material.producto.materiales.length > 0) {
        stock_disponible = material.producto.materiales
          .filter((m: any) => m.activo)
          .reduce((sum: number, m: any) => sum + Number(m.cantidad_actual), 0);
      }
      const permite_decimales = material.producto.permite_decimales ?? true;

      return {
        id: material.id,
        producto_id: material.producto.id,
        inventario_id: material.producto.inventario.id,
        inventario_nombre: material.producto.inventario.nombre,
        producto_nombre: material.producto.nombre,
        tipo_producto: material.producto.tipo,
        unidad_medida: material.producto.unidad_medida,
        permite_decimales,
        stock_disponible,
        tipo_material: material.tipo,
        cantidad: material.cantidad,
        momento_confirmacion: material.momento_confirmacion,
      };
    });
  }

  async actualizar(usuario_id: number, id: number, actualizar_tratamiento_dto: ActualizarTratamientoDto): Promise<Tratamiento> {
    const { materiales, consumibles_generales, recursos_por_cita, ...datos_tratamiento } = actualizar_tratamiento_dto;

    // Verify the tratamiento belongs to the user
    const tratamiento_existente = await this.tratamiento_repositorio.findOne({ where: { id, usuario_id } });
    if (!tratamiento_existente) {
      throw new NotFoundException(`Tratamiento con ID "${id}" no encontrado.`);
    }

    Object.assign(tratamiento_existente, datos_tratamiento);
    const tratamiento_actualizado = await this.tratamiento_repositorio.save(tratamiento_existente);

    if (consumibles_generales !== undefined) {
      await this.material_plantilla_repositorio.delete({
        tratamiento: { id },
        tipo: TipoMaterialPlantilla.GENERAL
      });

      if (consumibles_generales.length > 0) {
        for (const consumible_dto of consumibles_generales) {
          const material = this.material_plantilla_repositorio.create({
            tratamiento: tratamiento_actualizado,
            producto: { id: consumible_dto.producto_id } as Producto,
            tipo: TipoMaterialPlantilla.GENERAL,
            cantidad: consumible_dto.cantidad,
            momento_confirmacion: consumible_dto.momento_confirmacion,
          });
          await this.material_plantilla_repositorio.save(material);
        }
      }
    }
    if (recursos_por_cita !== undefined) {
      await this.material_plantilla_repositorio.delete({
        tratamiento: { id },
        tipo: TipoMaterialPlantilla.POR_CITA
      });

      if (recursos_por_cita.length > 0) {
        for (const recurso_dto of recursos_por_cita) {
          const material = this.material_plantilla_repositorio.create({
            tratamiento: tratamiento_actualizado,
            producto: { id: recurso_dto.producto_id } as Producto,
            tipo: TipoMaterialPlantilla.POR_CITA,
            cantidad: recurso_dto.cantidad,
          });
          await this.material_plantilla_repositorio.save(material);
        }
      }
    }
    if (materiales !== undefined) {
      if (consumibles_generales === undefined && recursos_por_cita === undefined) {
        await this.material_plantilla_repositorio.delete({ tratamiento: { id } });
        if (materiales.length > 0) {
          for (const material_dto of materiales) {
            const material = this.material_plantilla_repositorio.create({
              tratamiento: tratamiento_actualizado,
              producto: { id: material_dto.producto_id } as Producto,
              tipo: material_dto.tipo,
              cantidad: material_dto.cantidad,
            });
            await this.material_plantilla_repositorio.save(material);
          }
        }
      }
    }

    return tratamiento_actualizado;
  }

  async eliminar(usuario_id: number, id: number): Promise<void> {
    const tratamiento = await this.tratamiento_repositorio.findOne({
      where: { id, activo: true, usuario_id }
    });

    if (!tratamiento) {
      throw new NotFoundException(`Tratamiento con ID "${id}" no encontrado.`);
    }
    tratamiento.activo = false;
    await this.tratamiento_repositorio.save(tratamiento);
  }

  async obtenerConsumiblesGenerales(usuario_id: number, id: number): Promise<any[]> {
    // Verify the tratamiento belongs to the user first
    await this.encontrarPorId(usuario_id, id);

    const materiales = await this.material_plantilla_repositorio.find({
      where: {
        tratamiento: { id },
        tipo: TipoMaterialPlantilla.GENERAL
      },
      relations: ['producto', 'producto.inventario'],
    });

    return materiales.map(material => ({
      id: material.id,
      producto_id: material.producto.id,
      inventario_id: material.producto.inventario.id,
      inventario_nombre: material.producto.inventario.nombre,
      producto_nombre: material.producto.nombre,
      tipo_producto: material.producto.tipo,
      unidad_medida: material.producto.unidad_medida,
      cantidad: material.cantidad,
      momento_confirmacion: material.momento_confirmacion,
    }));
  }

  async obtenerRecursosPorCita(usuario_id: number, id: number): Promise<any[]> {
    // Verify the tratamiento belongs to the user first
    await this.encontrarPorId(usuario_id, id);

    const materiales = await this.material_plantilla_repositorio.find({
      where: {
        tratamiento: { id },
        tipo: TipoMaterialPlantilla.POR_CITA
      },
      relations: ['producto', 'producto.inventario'],
    });

    return materiales.map(material => ({
      id: material.id,
      producto_id: material.producto.id,
      inventario_id: material.producto.inventario.id,
      inventario_nombre: material.producto.inventario.nombre,
      producto_nombre: material.producto.nombre,
      tipo_producto: material.producto.tipo,
      unidad_medida: material.producto.unidad_medida,
      cantidad: material.cantidad,
    }));
  }
}