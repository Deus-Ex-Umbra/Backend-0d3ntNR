import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EdicionImagen } from './entidades/edicion-imagen.entidad';
import { ComentarioImagen } from './entidades/comentario-imagen.entidad';
import { CrearEdicionDto } from './dto/crear-edicion.dto';
import { ActualizarEdicionDto } from './dto/actualizar-edicion.dto';
import { CrearComentarioDto } from './dto/crear-comentario.dto';
import { ActualizarComentarioDto } from './dto/actualizar-comentario.dto';
import { ArchivoAdjunto } from '../archivos-adjuntos/entidades/archivo-adjunto.entidad';
import { Usuario } from '../usuarios/entidades/usuario.entidad';
import { AlmacenamientoServicio, TipoDocumento } from '../almacenamiento/almacenamiento.servicio';

@Injectable()
export class EdicionesImagenesServicio {
  constructor(
    @InjectRepository(EdicionImagen)
    private readonly edicion_repositorio: Repository<EdicionImagen>,
    @InjectRepository(ArchivoAdjunto)
    private readonly archivo_repositorio: Repository<ArchivoAdjunto>,
    @InjectRepository(ComentarioImagen)
    private readonly comentario_repositorio: Repository<ComentarioImagen>,
    private readonly almacenamiento_servicio: AlmacenamientoServicio,
  ) { }

  async crear(usuario_id: number, dto: CrearEdicionDto): Promise<EdicionImagen> {
    const archivo = await this.archivo_repositorio.findOne({
      where: { id: dto.archivo_original_id, usuario: { id: usuario_id } },
      relations: ['paciente'],
    });

    if (!archivo) {
      throw new NotFoundException('Archivo no encontrado o no le pertenece.');
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

    const nombre_archivo_resultado = await this.almacenamiento_servicio.guardarArchivo(
      dto.imagen_resultado_base64,
      'png',
      TipoDocumento.EDICION_IMAGEN,
    );

    const nueva_edicion = this.edicion_repositorio.create({
      archivo_original: archivo,
      edicion_padre,
      nombre: dto.nombre,
      descripcion: dto.descripcion,
      datos_canvas: dto.datos_canvas,
      ruta_imagen_resultado: nombre_archivo_resultado,
      version,
      usuario: { id: usuario_id } as Usuario,
    });

    const guardada = await this.edicion_repositorio.save(nueva_edicion);
    return Object.assign({}, guardada, { imagen_resultado_base64: dto.imagen_resultado_base64 }) as any;
  }

  async obtenerPorArchivo(usuario_id: number, archivo_id: number): Promise<any[]> {
    const archivo = await this.archivo_repositorio.findOne({ where: { id: archivo_id, usuario: { id: usuario_id } } });
    if (!archivo) {
      throw new NotFoundException('Archivo no encontrado o no le pertenece.');
    }

    const ediciones = await this.edicion_repositorio.find({
      where: { archivo_original: { id: archivo_id } },
      relations: ['usuario', 'edicion_padre'],
      order: { version: 'DESC' },
    });
    const conImagen = await Promise.all(ediciones.map(async (e) => {
      const imagen_base64 = await this.almacenamiento_servicio.leerArchivo(e.ruta_imagen_resultado, TipoDocumento.EDICION_IMAGEN);
      return Object.assign({}, e, { imagen_resultado_base64: imagen_base64 });
    }));
    return conImagen;
  }

  async obtenerPorId(usuario_id: number, id: number): Promise<any> {
    const edicion = await this.edicion_repositorio.findOne({
      where: { id },
      relations: ['archivo_original', 'usuario', 'edicion_padre', 'archivo_original.usuario'],
    });

    if (!edicion) {
      throw new NotFoundException('Edición no encontrada');
    }

    if (edicion.archivo_original.usuario.id !== usuario_id) {
      throw new ForbiddenException('No tienes permiso para ver esta edición.');
    }

    const imagen_base64 = await this.almacenamiento_servicio.leerArchivo(edicion.ruta_imagen_resultado, TipoDocumento.EDICION_IMAGEN);
    return Object.assign({}, edicion, { imagen_resultado_base64: imagen_base64 });
  }

  async actualizar(id: number, usuario_id: number, dto: ActualizarEdicionDto): Promise<any> {
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

    if (dto.nombre !== undefined) edicion.nombre = dto.nombre;
    if (dto.descripcion !== undefined) edicion.descripcion = dto.descripcion;
    if (dto.datos_canvas !== undefined) edicion.datos_canvas = dto.datos_canvas as any;
    if ((dto as any).imagen_resultado_base64) {
      const nombre_archivo_resultado = await this.almacenamiento_servicio.guardarArchivo(
        (dto as any).imagen_resultado_base64,
        'png',
        TipoDocumento.EDICION_IMAGEN,
      );
      edicion.ruta_imagen_resultado = nombre_archivo_resultado;
    }
    const guardada = await this.edicion_repositorio.save(edicion);
    const imagen_base64 = (dto as any).imagen_resultado_base64
      ? (dto as any).imagen_resultado_base64
      : await this.almacenamiento_servicio.leerArchivo(guardada.ruta_imagen_resultado, TipoDocumento.EDICION_IMAGEN);
    return Object.assign({}, guardada, { imagen_resultado_base64: imagen_base64 });
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
    await this.edicion_repositorio.softRemove(edicion);
  }

  async duplicar(id: number, usuario_id: number): Promise<any> {
    const edicion_original = await this.obtenerPorId(usuario_id, id);
    let nueva_ruta = edicion_original.ruta_imagen_resultado;
    try {
      const buffer = await this.almacenamiento_servicio.leerArchivoComoBuffer(
        edicion_original.ruta_imagen_resultado,
        TipoDocumento.EDICION_IMAGEN,
      );
      nueva_ruta = await this.almacenamiento_servicio.guardarArchivoDesdeBuffer(
        buffer,
        'png',
        TipoDocumento.EDICION_IMAGEN,
      );
    } catch (_) {
    }

    const nueva_edicion = this.edicion_repositorio.create({
      archivo_original: edicion_original.archivo_original,
      edicion_padre: edicion_original,
      nombre: edicion_original.nombre ? `${edicion_original.nombre} (Copia)` : undefined,
      descripcion: edicion_original.descripcion,
      datos_canvas: edicion_original.datos_canvas,
      ruta_imagen_resultado: nueva_ruta,
      version: edicion_original.version + 1,
      usuario: { id: usuario_id } as Usuario,
    });

    const guardada = await this.edicion_repositorio.save(nueva_edicion);
    const imagen_base64 = await this.almacenamiento_servicio.leerArchivo(guardada.ruta_imagen_resultado, TipoDocumento.EDICION_IMAGEN);
    return Object.assign({}, guardada, { imagen_resultado_base64: imagen_base64 });
  }

  async crearComentario(usuario_id: number, edicion_id: number, dto: CrearComentarioDto): Promise<ComentarioImagen> {
    const edicion = await this.edicion_repositorio.findOne({
      where: { id: edicion_id },
      relations: ['archivo_original', 'archivo_original.usuario'],
    });

    if (!edicion) {
      throw new NotFoundException('Edición no encontrada');
    }

    if (edicion.archivo_original.usuario.id !== usuario_id) {
      throw new ForbiddenException('No tienes permiso para agregar comentarios a esta edición');
    }

    const comentario = this.comentario_repositorio.create({
      edicion: { id: edicion_id } as EdicionImagen,
      usuario: { id: usuario_id } as Usuario,
      x: dto.x,
      y: dto.y,
      titulo: dto.titulo,
      contenido: dto.contenido,
      color: dto.color || '#FF0000',
    });

    return await this.comentario_repositorio.save(comentario);
  }

  async obtenerComentariosPorEdicion(usuario_id: number, edicion_id: number): Promise<ComentarioImagen[]> {
    const edicion = await this.edicion_repositorio.findOne({
      where: { id: edicion_id },
      relations: ['archivo_original', 'archivo_original.usuario'],
    });

    if (!edicion) {
      throw new NotFoundException('Edición no encontrada');
    }

    if (edicion.archivo_original.usuario.id !== usuario_id) {
      throw new ForbiddenException('No tienes permiso para ver comentarios de esta edición');
    }

    return await this.comentario_repositorio.find({
      where: { edicion: { id: edicion_id } },
      relations: ['usuario'],
      order: { fecha_creacion: 'ASC' },
    });
  }

  async obtenerComentarioPorId(usuario_id: number, comentario_id: number): Promise<ComentarioImagen> {
    const comentario = await this.comentario_repositorio.findOne({
      where: { id: comentario_id },
      relations: ['edicion', 'edicion.archivo_original', 'edicion.archivo_original.usuario', 'usuario'],
    });

    if (!comentario) {
      throw new NotFoundException('Comentario no encontrado');
    }

    if (comentario.edicion.archivo_original.usuario.id !== usuario_id) {
      throw new ForbiddenException('No tienes permiso para ver este comentario');
    }

    return comentario;
  }

  async actualizarComentario(usuario_id: number, comentario_id: number, dto: ActualizarComentarioDto): Promise<ComentarioImagen> {
    const comentario = await this.comentario_repositorio.findOne({
      where: { id: comentario_id },
      relations: ['usuario', 'edicion', 'edicion.archivo_original', 'edicion.archivo_original.usuario'],
    });

    if (!comentario) {
      throw new NotFoundException('Comentario no encontrado');
    }
    if (comentario.usuario.id !== usuario_id && comentario.edicion.archivo_original.usuario.id !== usuario_id) {
      throw new ForbiddenException('No tienes permiso para editar este comentario');
    }

    if (dto.x !== undefined) comentario.x = dto.x;
    if (dto.y !== undefined) comentario.y = dto.y;
    if (dto.titulo !== undefined) comentario.titulo = dto.titulo;
    if (dto.contenido !== undefined) comentario.contenido = dto.contenido;
    if (dto.color !== undefined) comentario.color = dto.color;

    return await this.comentario_repositorio.save(comentario);
  }

  async eliminarComentario(usuario_id: number, comentario_id: number): Promise<void> {
    const comentario = await this.comentario_repositorio.findOne({
      where: { id: comentario_id },
      relations: ['usuario', 'edicion', 'edicion.archivo_original', 'edicion.archivo_original.usuario'],
    });

    if (!comentario) {
      throw new NotFoundException('Comentario no encontrado');
    }
    if (comentario.usuario.id !== usuario_id && comentario.edicion.archivo_original.usuario.id !== usuario_id) {
      throw new ForbiddenException('No tienes permiso para eliminar este comentario');
    }

    await this.comentario_repositorio.remove(comentario);
  }
}