import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EdicionImagen } from './entidades/edicion-imagen.entidad';
import { CrearEdicionDto } from './dto/crear-edicion.dto';
import { ActualizarEdicionDto } from './dto/actualizar-edicion.dto';
import { ArchivoAdjunto } from '../archivos-adjuntos/entidades/archivo-adjunto.entidad';
import { Usuario } from '../usuarios/entidades/usuario.entidad';

@Injectable()
export class EdicionesImagenesServicio {
  constructor(
    @InjectRepository(EdicionImagen)
    private readonly edicion_repositorio: Repository<EdicionImagen>,
    @InjectRepository(ArchivoAdjunto)
    private readonly archivo_repositorio: Repository<ArchivoAdjunto>,
  ) {}

  async crear(usuario_id: number, dto: CrearEdicionDto): Promise<EdicionImagen> {
    const archivo = await this.archivo_repositorio.findOne({
      where: { id: dto.archivo_original_id },
      relations: ['paciente'],
    });

    if (!archivo) {
      throw new NotFoundException('Archivo no encontrado');
    }

    let edicion_padre: EdicionImagen | null = null;
    let version = 1;

    if (dto.edicion_padre_id) {
      edicion_padre = await this.edicion_repositorio.findOne({
        where: { id: dto.edicion_padre_id },
      });

      if (!edicion_padre) {
        throw new NotFoundException('Edición padre no encontrada');
      }

      version = edicion_padre.version + 1;
    } else {
      const ultima_version = await this.edicion_repositorio.findOne({
        where: { archivo_original: { id: dto.archivo_original_id } },
        order: { version: 'DESC' },
      });

      if (ultima_version) {
        version = ultima_version.version + 1;
      }
    }

    const nueva_edicion = this.edicion_repositorio.create({
      archivo_original: archivo,
      edicion_padre,
      nombre: dto.nombre,
      descripcion: dto.descripcion,
      datos_canvas: dto.datos_canvas,
      imagen_resultado_base64: dto.imagen_resultado_base64,
      version,
      usuario: { id: usuario_id } as Usuario,
    });

    return this.edicion_repositorio.save(nueva_edicion);
  }

  async obtenerPorArchivo(archivo_id: number): Promise<EdicionImagen[]> {
    return this.edicion_repositorio.find({
      where: { archivo_original: { id: archivo_id } },
      relations: ['usuario', 'edicion_padre'],
      order: { version: 'DESC' },
    });
  }

  async obtenerPorId(id: number): Promise<EdicionImagen> {
    const edicion = await this.edicion_repositorio.findOne({
      where: { id },
      relations: ['archivo_original', 'usuario', 'edicion_padre'],
    });

    if (!edicion) {
      throw new NotFoundException('Edición no encontrada');
    }

    return edicion;
  }

  async actualizar(id: number, usuario_id: number, dto: ActualizarEdicionDto): Promise<EdicionImagen> {
    const edicion = await this.edicion_repositorio.findOne({
      where: { id },
      relations: ['usuario'],
    });

    if (!edicion) {
      throw new NotFoundException('Edición no encontrada');
    }

    if (edicion.usuario.id !== usuario_id) {
      throw new ForbiddenException('No tienes permiso para editar esta versión');
    }

    Object.assign(edicion, dto);
    return this.edicion_repositorio.save(edicion);
  }

  async eliminar(id: number, usuario_id: number): Promise<void> {
    const edicion = await this.edicion_repositorio.findOne({
      where: { id },
      relations: ['usuario'],
    });

    if (!edicion) {
      throw new NotFoundException('Edición no encontrada');
    }

    if (edicion.usuario.id !== usuario_id) {
      throw new ForbiddenException('No tienes permiso para eliminar esta versión');
    }

    await this.edicion_repositorio.remove(edicion);
  }

  async duplicar(id: number, usuario_id: number): Promise<EdicionImagen> {
    const edicion_original = await this.obtenerPorId(id);

    const nueva_edicion = this.edicion_repositorio.create({
      archivo_original: edicion_original.archivo_original,
      edicion_padre: edicion_original,
      nombre: edicion_original.nombre ? `${edicion_original.nombre} (Copia)` : undefined,
      descripcion: edicion_original.descripcion,
      datos_canvas: edicion_original.datos_canvas,
      imagen_resultado_base64: edicion_original.imagen_resultado_base64,
      version: edicion_original.version + 1,
      usuario: { id: usuario_id } as Usuario,
    });

    return this.edicion_repositorio.save(nueva_edicion);
  }
}