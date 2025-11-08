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
  ) {}

  async crear(crear_tratamiento_dto: CrearTratamientoDto): Promise<Tratamiento> {
    const { materiales, ...datos_tratamiento } = crear_tratamiento_dto;
    const nuevo_tratamiento = this.tratamiento_repositorio.create(datos_tratamiento);
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

    return tratamiento_guardado;
  }

  async encontrarTodos(): Promise<Tratamiento[]> {
    return this.tratamiento_repositorio.find({ where: { activo: true } });
  }

  async encontrarPorId(id: number): Promise<Tratamiento> {
    const tratamiento = await this.tratamiento_repositorio.findOne({ 
      where: { id, activo: true } 
    });
    if (!tratamiento) {
      throw new NotFoundException(`Tratamiento con ID "${id}" no encontrado.`);
    }
    return tratamiento;
  }

  async obtenerMaterialesPlantilla(id: number): Promise<any[]> {
    const materiales = await this.material_plantilla_repositorio.find({
      where: { tratamiento: { id } },
      relations: ['producto', 'producto.inventario', 'producto.lotes', 'producto.activos'],
    });

    return materiales.map(material => ({
      id: material.id,
      producto_id: material.producto.id,
      inventario_id: material.producto.inventario.id,
      inventario_nombre: material.producto.inventario.nombre,
      producto_nombre: material.producto.nombre,
      tipo_gestion: material.producto.tipo_gestion,
      unidad_medida: material.producto.unidad_medida,
      tipo: material.tipo,
      cantidad: material.cantidad,
    }));
  }

  async actualizar(id: number, actualizar_tratamiento_dto: ActualizarTratamientoDto): Promise<Tratamiento> {
    const { materiales, ...datos_tratamiento } = actualizar_tratamiento_dto;
    
    const tratamiento = await this.tratamiento_repositorio.preload({
      id: id,
      ...datos_tratamiento,
    });
    
    if (!tratamiento) {
      throw new NotFoundException(`Tratamiento con ID "${id}" no encontrado.`);
    }
    
    const tratamiento_actualizado = await this.tratamiento_repositorio.save(tratamiento);

    if (materiales !== undefined) {
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

    return tratamiento_actualizado;
  }

  async eliminar(id: number): Promise<void> {
    const tratamiento = await this.tratamiento_repositorio.findOne({ 
      where: { id, activo: true } 
    });
    
    if (!tratamiento) {
      throw new NotFoundException(`Tratamiento con ID "${id}" no encontrado.`);
    }

    // Eliminación lógica
    tratamiento.activo = false;
    await this.tratamiento_repositorio.save(tratamiento);
  }
}