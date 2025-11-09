import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike, In, LessThan } from 'typeorm';
import { Paciente } from './entidades/paciente.entidad';
import { PacienteAlergia } from './entidades/paciente-alergia.entidad';
import { PacienteEnfermedad } from './entidades/paciente-enfermedad.entidad';
import { PacienteMedicamento } from './entidades/paciente-medicamento.entidad';
import { ConsentimientoInformado } from './entidades/consentimiento-informado.entidad';
import { Alergia } from '../catalogo/entidades/alergia.entidad';
import { Enfermedad } from '../catalogo/entidades/enfermedad.entidad';
import { Medicamento } from '../catalogo/entidades/medicamento.entidad';
import { Cita } from '../agenda/entidades/cita.entidad';
import { PlanTratamiento } from '../tratamientos/entidades/plan-tratamiento.entidad';
import { PlantillaConsentimiento } from '../plantillas-consentimiento/entidades/plantilla-consentimiento.entidad';
import { CrearPacienteDto } from './dto/crear-paciente.dto';
import { ActualizarPacienteDto } from './dto/actualizar-paciente.dto';
import { RespuestaAnamnesisDto } from './dto/respuesta-anamnesis.dto';
import { Usuario } from '../usuarios/entidades/usuario.entidad';
import PDFDocument from 'pdfkit';
import * as fs from 'fs/promises';
import * as path from 'path';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

@Injectable()
export class PacientesServicio {
  constructor(
    @InjectRepository(Paciente)
    private readonly paciente_repositorio: Repository<Paciente>,
    @InjectRepository(PacienteAlergia)
    private readonly paciente_alergia_repositorio: Repository<PacienteAlergia>,
    @InjectRepository(PacienteEnfermedad)
    private readonly paciente_enfermedad_repositorio: Repository<PacienteEnfermedad>,
    @InjectRepository(PacienteMedicamento)
    private readonly paciente_medicamento_repositorio: Repository<PacienteMedicamento>,
    @InjectRepository(ConsentimientoInformado)
    private readonly consentimiento_repositorio: Repository<ConsentimientoInformado>,
    @InjectRepository(PlantillaConsentimiento)
    private readonly plantilla_repositorio: Repository<PlantillaConsentimiento>,
    @InjectRepository(Alergia)
    private readonly alergia_repositorio: Repository<Alergia>,
    @InjectRepository(Enfermedad)
    private readonly enfermedad_repositorio: Repository<Enfermedad>,
    @InjectRepository(Medicamento)
    private readonly medicamento_repositorio: Repository<Medicamento>,
    @InjectRepository(Cita)
    private readonly cita_repositorio: Repository<Cita>,
    @InjectRepository(PlanTratamiento)
    private readonly plan_tratamiento_repositorio: Repository<PlanTratamiento>,
  ) {}

  async crear(usuario_id: number, crear_paciente_dto: CrearPacienteDto): Promise<Paciente> {
    const { alergias_ids, enfermedades_ids, medicamentos_ids, ...datos_paciente } = crear_paciente_dto;

    const nuevo_paciente = this.paciente_repositorio.create({
      ...datos_paciente,
      usuario: { id: usuario_id } as Usuario,
    });
    const paciente_guardado = await this.paciente_repositorio.save(nuevo_paciente);

    if (alergias_ids && alergias_ids.length > 0) {
      await this.asignarAlergias(paciente_guardado.id, alergias_ids);
    }

    if (enfermedades_ids && enfermedades_ids.length > 0) {
      await this.asignarEnfermedades(paciente_guardado.id, enfermedades_ids);
    }

    if (medicamentos_ids && medicamentos_ids.length > 0) {
      await this.asignarMedicamentos(paciente_guardado.id, medicamentos_ids);
    }

    return this.encontrarPorId(usuario_id, paciente_guardado.id);
  }

  async encontrarTodos(usuario_id: number, termino_busqueda?: string): Promise<Paciente[]> {
    const base_where = { usuario: { id: usuario_id } };
    
    if (termino_busqueda) {
      const id_busqueda = parseInt(termino_busqueda, 10);
      const where_conditions: any[] = [
        { ...base_where, nombre: ILike(`%${termino_busqueda}%`) },
        { ...base_where, apellidos: ILike(`%${termino_busqueda}%`) },
      ];
      if (!isNaN(id_busqueda)) {
        where_conditions.push({ ...base_where, id: id_busqueda });
      }
      return this.paciente_repositorio.find({ where: where_conditions });
    }
    return this.paciente_repositorio.find({ where: base_where });
  }

  async encontrarPorId(usuario_id: number, id: number): Promise<any> {
    const paciente = await this.paciente_repositorio.findOne({
      where: { id, usuario: { id: usuario_id } },
      relations: [
        'planes_tratamiento',
        'planes_tratamiento.citas',
        'planes_tratamiento.pagos',
        'paciente_alergias',
        'paciente_alergias.alergia',
        'paciente_enfermedades',
        'paciente_enfermedades.enfermedad',
        'paciente_medicamentos',
        'paciente_medicamentos.medicamento',
      ],
    });
    
    if (!paciente) {
      throw new NotFoundException(`Paciente con ID "${id}" no encontrado o no le pertenece.`);
    }
    
    return {
      ...paciente,
      alergias: paciente.paciente_alergias?.map(pa => pa.alergia.id) || [],
      enfermedades: paciente.paciente_enfermedades?.map(pe => pe.enfermedad.id) || [],
      medicamentos: paciente.paciente_medicamentos?.map(pm => pm.medicamento.id) || [],
    };
  }

  async actualizar(usuario_id: number, id: number, actualizar_paciente_dto: ActualizarPacienteDto): Promise<Paciente> {
    const { alergias_ids, enfermedades_ids, medicamentos_ids, ...datos_paciente } = actualizar_paciente_dto;

    const paciente = await this.paciente_repositorio.preload({
      id: id,
      ...datos_paciente,
    });

    if (!paciente) {
      throw new NotFoundException(`Paciente con ID "${id}" no encontrado.`);
    }

    const paciente_existente = await this.encontrarPorId(usuario_id, id);
    if (!paciente_existente) {
      throw new NotFoundException(`Paciente con ID "${id}" no encontrado o no le pertenece.`);
    }

    await this.paciente_repositorio.save(paciente);

    if (alergias_ids !== undefined) {
      await this.paciente_alergia_repositorio.delete({ paciente: { id } });
      if (alergias_ids.length > 0) {
        await this.asignarAlergias(id, alergias_ids);
      }
    }

    if (enfermedades_ids !== undefined) {
      await this.paciente_enfermedad_repositorio.delete({ paciente: { id } });
      if (enfermedades_ids.length > 0) {
        await this.asignarEnfermedades(id, enfermedades_ids);
      }
    }

    if (medicamentos_ids !== undefined) {
      await this.paciente_medicamento_repositorio.delete({ paciente: { id } });
      if (medicamentos_ids.length > 0) {
        await this.asignarMedicamentos(id, medicamentos_ids);
      }
    }

    return this.encontrarPorId(usuario_id, id);
  }

  async eliminar(usuario_id: number, id: number): Promise<void> {
    const resultado = await this.paciente_repositorio.delete({ id, usuario: { id: usuario_id } });
    if (resultado.affected === 0) {
      throw new NotFoundException(`Paciente con ID "${id}" no encontrado o no le pertenece.`);
    }
  }

  async obtenerAnamnesisPorPaciente(usuario_id: number, id: number): Promise<RespuestaAnamnesisDto> {
    const paciente = await this.paciente_repositorio.findOne({
      where: { id, usuario: { id: usuario_id } },
      relations: [
        'paciente_alergias',
        'paciente_alergias.alergia',
        'paciente_enfermedades',
        'paciente_enfermedades.enfermedad',
        'paciente_medicamentos',
        'paciente_medicamentos.medicamento',
      ],
    });

    if (!paciente) {
      throw new NotFoundException(`Paciente con ID "${id}" no encontrado o no le pertenece.`);
    }

    const alergias = paciente.paciente_alergias.map(pa => pa.alergia).filter(Boolean);
    const enfermedades = paciente.paciente_enfermedades.map(pe => pe.enfermedad).filter(Boolean);
    const medicamentos = paciente.paciente_medicamentos.map(pm => pm.medicamento).filter(Boolean);

    return {
      alergias,
      enfermedades,
      medicamentos,
    };
  }

  private async asignarAlergias(paciente_id: number, alergias_ids: number[]): Promise<void> {
    const alergias = await this.alergia_repositorio.findBy({ id: In(alergias_ids) });
    const relaciones = alergias.map(alergia =>
      this.paciente_alergia_repositorio.create({
        paciente: { id: paciente_id } as Paciente,
        alergia,
      })
    );
    await this.paciente_alergia_repositorio.save(relaciones);
  }

  private async asignarEnfermedades(paciente_id: number, enfermedades_ids: number[]): Promise<void> {
    const enfermedades = await this.enfermedad_repositorio.findBy({ id: In(enfermedades_ids) });
    const relaciones = enfermedades.map(enfermedad =>
      this.paciente_enfermedad_repositorio.create({
        paciente: { id: paciente_id } as Paciente,
        enfermedad,
      })
    );
    await this.paciente_enfermedad_repositorio.save(relaciones);
  }

  private async asignarMedicamentos(paciente_id: number, medicamentos_ids: number[]): Promise<void> {
    const medicamentos = await this.medicamento_repositorio.findBy({ id: In(medicamentos_ids) });
    const relaciones = medicamentos.map(medicamento =>
      this.paciente_medicamento_repositorio.create({
        paciente: { id: paciente_id } as Paciente,
        medicamento,
      })
    );
    await this.paciente_medicamento_repositorio.save(relaciones);
  }

  async obtenerUltimaCita(usuario_id: number, paciente_id: number): Promise<any> {
    const paciente = await this.paciente_repositorio.findOne({
      where: { id: paciente_id, usuario: { id: usuario_id } },
    });

    if (!paciente) {
      throw new NotFoundException(`Paciente con ID "${paciente_id}" no encontrado o no le pertenece.`);
    }

    const ahora = new Date();
    const ultima_cita = await this.cita_repositorio.findOne({
      where: {
        paciente: { id: paciente_id },
        fecha: LessThan(ahora),
      },
      order: {
        fecha: 'DESC',
      },
      relations: ['paciente'],
    });

    if (!ultima_cita) {
      return null;
    }

    return {
      id: ultima_cita.id,
      fecha: ultima_cita.fecha,
      descripcion: ultima_cita.descripcion,
      estado_pago: ultima_cita.estado_pago,
      monto_esperado: ultima_cita.monto_esperado,
      horas_aproximadas: ultima_cita.horas_aproximadas,
      minutos_aproximados: ultima_cita.minutos_aproximados,
    };
  }

  async obtenerUltimoTratamiento(usuario_id: number, paciente_id: number): Promise<any> {
    const paciente = await this.paciente_repositorio.findOne({
      where: { id: paciente_id, usuario: { id: usuario_id } },
    });

    if (!paciente) {
      throw new NotFoundException(`Paciente con ID "${paciente_id}" no encontrado o no le pertenece.`);
    }

    const ultimo_tratamiento = await this.plan_tratamiento_repositorio.findOne({
      where: {
        paciente: { id: paciente_id },
      },
      order: {
        id: 'DESC',
      },
      relations: ['tratamiento', 'citas', 'pagos'],
    });

    if (!ultimo_tratamiento) {
      return null;
    }

    // Determinar estado basado en si está finalizado y las citas
    let estado = 'pendiente';
    if (ultimo_tratamiento.finalizado) {
      estado = 'completado';
    } else if (ultimo_tratamiento.citas && ultimo_tratamiento.citas.length > 0) {
      estado = 'en_progreso';
    }

    // Obtener fecha de inicio de la primera cita
    let fecha_inicio = new Date();
    if (ultimo_tratamiento.citas && ultimo_tratamiento.citas.length > 0) {
      const citas_ordenadas = [...ultimo_tratamiento.citas].sort(
        (a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime()
      );
      fecha_inicio = citas_ordenadas[0].fecha;
    }

    return {
      id: ultimo_tratamiento.id,
      tratamiento: {
        id: ultimo_tratamiento.tratamiento.id,
        nombre: ultimo_tratamiento.tratamiento.nombre,
      },
      fecha_inicio: fecha_inicio,
      estado: estado,
      costo_total: ultimo_tratamiento.costo_total,
      total_abonado: ultimo_tratamiento.total_abonado,
      citas: ultimo_tratamiento.citas?.map(cita => ({
        id: cita.id,
        fecha: cita.fecha,
        estado_pago: cita.estado_pago,
      })),
    };
  }

  // ==================== CONSENTIMIENTOS INFORMADOS ====================

  async crearConsentimientoInformado(
    paciente_id: number,
    plantilla_id: number,
    nombre: string,
    usuario_id: number,
  ): Promise<ConsentimientoInformado> {
    // Verificar que el paciente existe
    const paciente = await this.paciente_repositorio.findOne({
      where: { id: paciente_id },
    });

    if (!paciente) {
      throw new NotFoundException(`Paciente con ID ${paciente_id} no encontrado`);
    }

    // Obtener la plantilla
    const plantilla = await this.plantilla_repositorio.findOne({
      where: { id: plantilla_id },
    });

    if (!plantilla) {
      throw new NotFoundException(`Plantilla con ID ${plantilla_id} no encontrada`);
    }

    // Reemplazar variables en el contenido HTML
    const contenido_procesado = this.reemplazarVariablesPaciente(plantilla.contenido, paciente);

    // Generar el PDF
    const directorio = path.join(process.cwd(), 'consentimientos-generados');
    await fs.mkdir(directorio, { recursive: true });

    const nombre_archivo = `consentimiento_${Date.now()}_${paciente_id}.pdf`;
    const ruta_archivo = path.join(directorio, nombre_archivo);

    await this.generarPDFConsentimiento(contenido_procesado, ruta_archivo, nombre);

    // Guardar en la base de datos
    const consentimiento = new ConsentimientoInformado();
    consentimiento.paciente = paciente;
    consentimiento.usuario = { id: usuario_id } as Usuario;
    consentimiento.nombre = nombre;
    consentimiento.contenido_html = contenido_procesado;
    consentimiento.ruta_archivo = nombre_archivo;

    return await this.consentimiento_repositorio.save(consentimiento);
  }

  async obtenerConsentimientosPaciente(paciente_id: number): Promise<ConsentimientoInformado[]> {
    return await this.consentimiento_repositorio.find({
      where: { paciente: { id: paciente_id } },
      order: { fecha_creacion: 'DESC' },
    });
  }

  async obtenerArchivoConsentimiento(id: number): Promise<string> {
    const consentimiento = await this.consentimiento_repositorio.findOne({
      where: { id },
    });

    if (!consentimiento) {
      throw new NotFoundException(`Consentimiento con ID ${id} no encontrado`);
    }

    const ruta_completa = path.join(process.cwd(), 'consentimientos-generados', consentimiento.ruta_archivo);

    try {
      await fs.access(ruta_completa);
    } catch {
      throw new NotFoundException('Archivo de consentimiento no encontrado');
    }

    return ruta_completa;
  }

  async eliminarConsentimiento(id: number): Promise<void> {
    const consentimiento = await this.consentimiento_repositorio.findOne({
      where: { id },
    });

    if (!consentimiento) {
      throw new NotFoundException(`Consentimiento con ID ${id} no encontrado`);
    }

    // Eliminar el archivo físico
    const ruta_completa = path.join(process.cwd(), 'consentimientos-generados', consentimiento.ruta_archivo);
    try {
      await fs.unlink(ruta_completa);
    } catch (error) {
      console.error('Error al eliminar archivo de consentimiento:', error);
    }

    // Eliminar el registro de la base de datos
    await this.consentimiento_repositorio.remove(consentimiento);
  }

  private reemplazarVariablesPaciente(contenido: string, paciente: Paciente): string {
    const fecha_actual = new Date();
    const fecha_formateada = format(fecha_actual, 'dd/MM/yyyy', { locale: es });

    return contenido
      .replace(/{{nombre}}/g, paciente.nombre || '')
      .replace(/{{apellidos}}/g, paciente.apellidos || '')
      .replace(/{{nombre_completo}}/g, `${paciente.nombre} ${paciente.apellidos}`)
      .replace(/{{telefono}}/g, paciente.telefono || 'No registrado')
      .replace(/{{correo}}/g, paciente.correo || 'No registrado')
      .replace(/{{direccion}}/g, paciente.direccion || 'No registrada')
      .replace(/{{fecha}}/g, fecha_formateada);
  }

  private async generarPDFConsentimiento(
    contenido_html: string,
    ruta_archivo: string,
    titulo: string,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'LETTER',
        margins: { top: 50, bottom: 50, left: 50, right: 50 },
      });

      const stream = require('fs').createWriteStream(ruta_archivo);
      doc.pipe(stream);

      // Configurar fuente Times New Roman
      doc.font('Times-Roman');

      // Título del documento
      doc.font('Times-Bold').fontSize(16).text(titulo, { align: 'center' });
      doc.moveDown();

      // Procesar el contenido HTML de forma básica
      // Esto es una implementación simple, para HTML más complejo usar librerías como html-to-pdfmake
      const lineas = contenido_html
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n\n')
        .replace(/<p>/gi, '')
        .replace(/<strong>|<b>/gi, '**')
        .replace(/<\/strong>|<\/b>/gi, '**')
        .replace(/<em>|<i>/gi, '_')
        .replace(/<\/em>|<\/i>/gi, '_')
        .replace(/<h1>(.*?)<\/h1>/gi, '\n$1\n')
        .replace(/<h2>(.*?)<\/h2>/gi, '\n$1\n')
        .replace(/<h3>(.*?)<\/h3>/gi, '\n$1\n')
        .replace(/<[^>]+>/g, ''); // Eliminar el resto de tags HTML

      // Dividir en párrafos y procesar negritas/cursivas simples
      const parrafos = lineas.split('\n\n');
      
      for (const parrafo of parrafos) {
        if (parrafo.trim()) {
          // Implementación básica de negrita
          const partes = parrafo.split('**');
          for (let i = 0; i < partes.length; i++) {
            if (i % 2 === 0) {
              doc.font('Times-Roman').fontSize(11).text(partes[i], { continued: i < partes.length - 1 });
            } else {
              doc.font('Times-Bold').fontSize(11).text(partes[i], { continued: i < partes.length - 1 });
            }
          }
          doc.moveDown();
        }
      }

      doc.end();

      stream.on('finish', () => resolve());
      stream.on('error', reject);
    });
  }
}
