import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ArchivoAdjunto } from './entidades/archivo-adjunto.entidad';
import { SubirArchivoDto } from './dto/subir-archivo.dto';
import { ActualizarArchivoDto } from './dto/actualizar-archivo.dto';
import { Paciente } from '../pacientes/entidades/paciente.entidad';
import { PlanTratamiento } from '../tratamientos/entidades/plan-tratamiento.entidad';

@Injectable()
export class ArchivosAdjuntosServicio {
  constructor(
    @InjectRepository(ArchivoAdjunto)
    private readonly archivo_repositorio: Repository<ArchivoAdjunto>,
  ) {}

  async subir(dto: SubirArchivoDto): Promise<ArchivoAdjunto> {
    const nuevo_archivo = this.archivo_repositorio.create({
      ...dto,
      paciente: { id: dto.paciente_id } as Paciente,
      plan_tratamiento: dto.plan_tratamiento_id ? { id: dto.plan_tratamiento_id } as PlanTratamiento : null,
    });
    return this.archivo_repositorio.save(nuevo_archivo);
  }

  async obtenerPorPaciente(paciente_id: number): Promise<ArchivoAdjunto[]> {
    return this.archivo_repositorio.find({
      where: { paciente: { id: paciente_id } },
      order: { fecha_subida: 'DESC' },
    });
  }

  async obtenerPorPlan(plan_id: number): Promise<ArchivoAdjunto[]> {
    return this.archivo_repositorio.find({
      where: { plan_tratamiento: { id: plan_id } },
      order: { fecha_subida: 'DESC' },
    });
  }

  async actualizar(id: number, dto: ActualizarArchivoDto): Promise<ArchivoAdjunto> {
    const archivo = await this.archivo_repositorio.preload({ id, ...dto });
    if (!archivo) {
      throw new NotFoundException(`Archivo con ID "${id}" no encontrado.`);
    }
    return this.archivo_repositorio.save(archivo);
  }

  async eliminar(id: number): Promise<void> {
    const resultado = await this.archivo_repositorio.delete(id);
    if (resultado.affected === 0) {
      throw new NotFoundException(`Archivo con ID "${id}" no encontrado.`);
    }
  }
}

