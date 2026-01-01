import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlantillaConsentimiento } from './entidades/plantilla-consentimiento.entidad';
import { CrearPlantillaConsentimientoDto } from './dto/crear-plantilla-consentimiento.dto';
import { ActualizarPlantillaConsentimientoDto } from './dto/actualizar-plantilla-consentimiento.dto';
import { GenerarPdfConsentimientoDto } from './dto/generar-pdf-consentimiento.dto';
import { Usuario } from '../usuarios/entidades/usuario.entidad';
import { PacientesServicio } from '../pacientes/pacientes.servicio';
import { TratamientosServicio } from '../tratamientos/tratamientos.servicio';
import { ArchivosAdjuntosServicio } from '../archivos-adjuntos/archivos-adjuntos.servicio';

@Injectable()
export class PlantillasConsentimientoServicio {
  constructor(
    @InjectRepository(PlantillaConsentimiento)
    private readonly plantilla_repositorio: Repository<PlantillaConsentimiento>,
    private readonly pacientes_servicio: PacientesServicio,
    private readonly tratamientos_servicio: TratamientosServicio,
    private readonly archivos_servicio: ArchivosAdjuntosServicio,
  ) {}

  async crear(usuario_id: number, dto: CrearPlantillaConsentimientoDto): Promise<PlantillaConsentimiento> {
    const nueva_plantilla = this.plantilla_repositorio.create({
      ...dto,
      usuario: { id: usuario_id } as Usuario,
    });
    return this.plantilla_repositorio.save(nueva_plantilla);
  }

  async obtenerTodas(usuario_id: number): Promise<PlantillaConsentimiento[]> {
    return this.plantilla_repositorio.find({
      where: { usuario: { id: usuario_id } },
      order: { nombre: 'ASC' },
    });
  }

  async obtenerPorId(usuario_id: number, id: number): Promise<PlantillaConsentimiento> {
    const plantilla = await this.plantilla_repositorio.findOne({
      where: { id, usuario: { id: usuario_id } },
    });
    
    if (!plantilla) {
      throw new NotFoundException(`Plantilla con ID "${id}" no encontrada o no le pertenece.`);
    }
    
    return plantilla;
  }

  async actualizar(usuario_id: number, id: number, dto: ActualizarPlantillaConsentimientoDto): Promise<PlantillaConsentimiento> {
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

  async generarYGuardarPdf(
    usuario_id: number,
    paciente_id: number,
    dto: GenerarPdfConsentimientoDto,
  ): Promise<any> {
    const plantilla = await this.obtenerPorId(usuario_id, dto.plantilla_id);
    const paciente = await this.pacientes_servicio.encontrarPorId(usuario_id, paciente_id);
    
    let contenido_procesado = plantilla.contenido;
    contenido_procesado = contenido_procesado.replace(/\[PACIENTE_NOMBRE\]/g, paciente.nombre);
    contenido_procesado = contenido_procesado.replace(/\[PACIENTE_APELLIDOS\]/g, paciente.apellidos);
    contenido_procesado = contenido_procesado.replace(/\[PACIENTE_TELEFONO\]/g, paciente.telefono || '');
    contenido_procesado = contenido_procesado.replace(/\[PACIENTE_CORREO\]/g, paciente.correo || '');
    contenido_procesado = contenido_procesado.replace(/\[PACIENTE_DIRECCION\]/g, paciente.direccion || '');
    
    const fecha_actual_obj = new Date();
    const dia = String(fecha_actual_obj.getDate()).padStart(2, '0');
    const mes = String(fecha_actual_obj.getMonth() + 1).padStart(2, '0');
    const anio = fecha_actual_obj.getFullYear();
    const fecha_actual = `${dia}/${mes}/${anio}`;
    contenido_procesado = contenido_procesado.replace(/\[FECHA_ACTUAL\]/g, fecha_actual);
    
    const archivo_guardado = await this.archivos_servicio.subir(usuario_id, {
      nombre_archivo: `Consentimiento_${plantilla.nombre}_${paciente.nombre}_${paciente.apellidos}.pdf`,
      tipo_mime: 'application/pdf',
      descripcion: `Consentimiento informado: ${plantilla.nombre}`,
      contenido_base64: dto.pdf_firmado_base64,
      paciente_id: paciente_id,
    });
    
    return {
      mensaje: 'PDF generado y guardado exitosamente',
      archivo: archivo_guardado,
      contenido_procesado,
    };
  }
}