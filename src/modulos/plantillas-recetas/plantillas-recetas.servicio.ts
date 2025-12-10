import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlantillaReceta } from './entidades/plantilla-receta.entidad';
import { CrearPlantillaRecetaDto } from './dto/crear-plantilla-receta.dto';
import { ActualizarPlantillaRecetaDto } from './dto/actualizar-plantilla-receta.dto';
import { Usuario } from '../usuarios/entidades/usuario.entidad';

@Injectable()
export class PlantillasRecetasServicio {
  constructor(
    @InjectRepository(PlantillaReceta)
    private readonly plantilla_repositorio: Repository<PlantillaReceta>,
  ) {}

  async crear(usuario_id: number, dto: CrearPlantillaRecetaDto): Promise<PlantillaReceta> {
    const nueva_plantilla = this.plantilla_repositorio.create({
      ...dto,
      usuario: { id: usuario_id } as Usuario,
    });
    return this.plantilla_repositorio.save(nueva_plantilla);
  }

  async obtenerTodas(usuario_id: number): Promise<PlantillaReceta[]> {
    return this.plantilla_repositorio.find({
      where: { usuario: { id: usuario_id } },
      order: { nombre: 'ASC' },
    });
  }

  async obtenerPorId(usuario_id: number, id: number): Promise<PlantillaReceta> {
    const plantilla = await this.plantilla_repositorio.findOne({
      where: { id, usuario: { id: usuario_id } },
    });

    if (!plantilla) {
      throw new NotFoundException(`Plantilla con ID "${id}" no encontrada o no le pertenece.`);
    }

    return plantilla;
  }

  async actualizar(usuario_id: number, id: number, dto: ActualizarPlantillaRecetaDto): Promise<PlantillaReceta> {
    const plantilla = await this.obtenerPorId(usuario_id, id);
    Object.assign(plantilla, dto);
    return this.plantilla_repositorio.save(plantilla);
  }

  async eliminar(usuario_id: number, id: number): Promise<void> {
    const resultado = await this.plantilla_repositorio.delete({
      id,
      usuario: { id: usuario_id },
    });

    if (resultado.affected === 0) {
      throw new NotFoundException(`Plantilla con ID "${id}" no encontrada o no le pertenece.`);
    }
  }
}
