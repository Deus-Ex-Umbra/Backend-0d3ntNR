import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ArchivoAdjunto } from './entidades/archivo-adjunto.entidad';
import { SubirArchivoDto } from './dto/subir-archivo.dto';
import { ActualizarArchivoDto } from './dto/actualizar-archivo.dto';
import { Paciente } from '../pacientes/entidades/paciente.entidad';
import { PlanTratamiento } from '../tratamientos/entidades/plan-tratamiento.entidad';
import { Usuario } from '../usuarios/entidades/usuario.entidad';
import { AlmacenamientoServicio, TipoDocumento } from '../almacenamiento/almacenamiento.servicio';

@Injectable()
export class ArchivosAdjuntosServicio {
  constructor(
    @InjectRepository(ArchivoAdjunto)
    private readonly archivo_repositorio: Repository<ArchivoAdjunto>,
    private readonly almacenamiento_servicio: AlmacenamientoServicio,
  ) {}

  async subir(usuario_id: number, dto: SubirArchivoDto): Promise<ArchivoAdjunto> {
    const extension = dto.nombre_archivo.split('.').pop() || 'bin';
    const ruta_archivo = await this.almacenamiento_servicio.guardarArchivo(
      dto.contenido_base64, 
      extension,
      TipoDocumento.ARCHIVO_ADJUNTO
    );

    const nuevo_archivo = this.archivo_repositorio.create({
      nombre_archivo: dto.nombre_archivo,
      tipo_mime: dto.tipo_mime,
      descripcion: dto.descripcion,
      ruta_archivo: ruta_archivo,
      usuario: { id: usuario_id } as Usuario,
      paciente: { id: dto.paciente_id } as Paciente,
      plan_tratamiento: dto.plan_tratamiento_id ? { id: dto.plan_tratamiento_id } as PlanTratamiento : null,
    });
    
    return this.archivo_repositorio.save(nuevo_archivo);
  }

  async obtenerPorPaciente(usuario_id: number, paciente_id: number): Promise<ArchivoAdjunto[]> {
    return this.archivo_repositorio.find({
      where: { paciente: { id: paciente_id }, usuario: { id: usuario_id } },
      order: { fecha_subida: 'DESC' },
    });
  }

  async obtenerPorPlan(usuario_id: number, plan_id: number): Promise<ArchivoAdjunto[]> {
    return this.archivo_repositorio.find({
      where: { plan_tratamiento: { id: plan_id }, usuario: { id: usuario_id } },
      order: { fecha_subida: 'DESC' },
    });
  }

  async obtenerContenido(usuario_id: number, id: number): Promise<string> {
    const archivo = await this.archivo_repositorio.findOne({ where: { id, usuario: { id: usuario_id } } });
    
    if (!archivo) {
      throw new NotFoundException(`Archivo con ID "${id}" no encontrado o no le pertenece.`);
    }

    return this.almacenamiento_servicio.leerArchivo(archivo.ruta_archivo, TipoDocumento.ARCHIVO_ADJUNTO);
  }

  async actualizar(usuario_id: number, id: number, dto: ActualizarArchivoDto): Promise<ArchivoAdjunto> {
    const archivo = await this.archivo_repositorio.findOne({ where: { id, usuario: { id: usuario_id } } });
    
    if (!archivo) {
      throw new NotFoundException(`Archivo con ID "${id}" no encontrado o no le pertenece.`);
    }

    Object.assign(archivo, dto);
    return this.archivo_repositorio.save(archivo);
  }

  async eliminar(usuario_id: number, id: number): Promise<void> {
    const archivo = await this.archivo_repositorio.findOne({ where: { id, usuario: { id: usuario_id } } });
    
    if (!archivo) {
      throw new NotFoundException(`Archivo con ID "${id}" no encontrado o no le pertenece.`);
    }
    await this.archivo_repositorio.softRemove(archivo);
  }
}