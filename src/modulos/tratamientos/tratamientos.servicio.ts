import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tratamiento } from './entidades/tratamiento.entidad';
import { CrearTratamientoDto } from './dto/crear-tratamiento.dto';
import { ActualizarTratamientoDto } from './dto/actualizar-tratamiento.dto';

@Injectable()
export class TratamientosServicio {
  constructor(
    @InjectRepository(Tratamiento)
    private readonly tratamiento_repositorio: Repository<Tratamiento>,
  ) {}

  async crear(crear_tratamiento_dto: CrearTratamientoDto): Promise<Tratamiento> {
    const nuevo_tratamiento = this.tratamiento_repositorio.create(crear_tratamiento_dto);
    return this.tratamiento_repositorio.save(nuevo_tratamiento);
  }

  async encontrarTodos(): Promise<Tratamiento[]> {
    return this.tratamiento_repositorio.find();
  }

  async encontrarPorId(id: number): Promise<Tratamiento> {
    const tratamiento = await this.tratamiento_repositorio.findOne({ where: { id } });
    if (!tratamiento) {
      throw new NotFoundException(`Tratamiento con ID "${id}" no encontrado.`);
    }
    return tratamiento;
  }

  async actualizar(id: number, actualizar_tratamiento_dto: ActualizarTratamientoDto): Promise<Tratamiento> {
    const tratamiento = await this.tratamiento_repositorio.preload({
      id: id,
      ...actualizar_tratamiento_dto,
    });
    if (!tratamiento) {
      throw new NotFoundException(`Tratamiento con ID "${id}" no encontrado.`);
    }
    return this.tratamiento_repositorio.save(tratamiento);
  }

  async eliminar(id: number): Promise<void> {
    const resultado = await this.tratamiento_repositorio.delete(id);
    if (resultado.affected === 0) {
      throw new NotFoundException(`Tratamiento con ID "${id}" no encontrado.`);
    }
  }
}