import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike, In, LessThan } from 'typeorm';
import { Readable } from 'stream';
import { Paciente } from './entidades/paciente.entidad';
import { PacienteAlergia } from './entidades/paciente-alergia.entidad';
import { PacienteEnfermedad } from './entidades/paciente-enfermedad.entidad';
import { PacienteMedicamento } from './entidades/paciente-medicamento.entidad';
import { ConsentimientoInformado } from './entidades/consentimiento-informado.entidad';
import { HistoriaClinicaVersion } from './entidades/historia-clinica-version.entidad';
import { Alergia } from '../catalogo/entidades/alergia.entidad';
import { Enfermedad } from '../catalogo/entidades/enfermedad.entidad';
import { Medicamento } from '../catalogo/entidades/medicamento.entidad';
import { Cita } from '../agenda/entidades/cita.entidad';
import { PlanTratamiento } from '../tratamientos/entidades/plan-tratamiento.entidad';
import { PlantillaConsentimiento } from '../plantillas-consentimiento/entidades/plantilla-consentimiento.entidad';
import { CrearPacienteDto } from './dto/crear-paciente.dto';
import { ActualizarPacienteDto } from './dto/actualizar-paciente.dto';
import { CrearHistoriaClinicaDto } from './dto/crear-historia-clinica.dto';
import { ActualizarHistoriaClinicaDto } from './dto/actualizar-historia-clinica.dto';
import { RespuestaAnamnesisDto } from './dto/respuesta-anamnesis.dto';
import { Usuario } from '../usuarios/entidades/usuario.entidad';
import { AlmacenamientoServicio, TipoDocumento } from '../almacenamiento/almacenamiento.servicio';
import PDFDocument from 'pdfkit';
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
    @InjectRepository(HistoriaClinicaVersion)
    private readonly historia_clinica_repositorio: Repository<HistoriaClinicaVersion>,
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
    private readonly almacenamiento_servicio: AlmacenamientoServicio,
  ) { }

  private async obtenerPacientePropietario(usuario_id: number, paciente_id: number): Promise<Paciente> {
    const paciente = await this.paciente_repositorio.findOne({ where: { id: paciente_id, usuario: { id: usuario_id } } });
    if (!paciente) {
      throw new NotFoundException(`Paciente con ID "${paciente_id}" no encontrado o no le pertenece.`);
    }
    return paciente;
  }

  private async sincronizarNotasMedicasDesdeHistoria(paciente_id: number, historia: HistoriaClinicaVersion): Promise<void> {
    await this.paciente_repositorio.update(paciente_id, {
      notas_medicas: historia.contenido_html,
      notas_medicas_config: historia.config,
    });
  }

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
    const ultima_historia = await this.historia_clinica_repositorio.findOne({
      where: { paciente: { id }, usuario: { id: usuario_id } },
      order: { numero_version: 'DESC', id: 'DESC' },
    });

    const respuesta: any = {
      ...paciente,
      alergias: paciente.paciente_alergias?.map(pa => pa.alergia.id) || [],
      enfermedades: paciente.paciente_enfermedades?.map(pe => pe.enfermedad.id) || [],
      medicamentos: paciente.paciente_medicamentos?.map(pm => pm.medicamento.id) || [],
    };

    if (ultima_historia) {
      respuesta.notas_medicas = ultima_historia.contenido_html;
      respuesta.notas_medicas_config = ultima_historia.config;
      respuesta.historia_clinica_activa_id = ultima_historia.id;
    }
    respuesta.total_versiones_historia_clinica = await this.historia_clinica_repositorio.count({
      where: { paciente: { id }, usuario: { id: usuario_id } },
    });

    return respuesta;
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
    const paciente = await this.paciente_repositorio.findOne({ where: { id, usuario: { id: usuario_id } } });
    if (!paciente) {
      throw new NotFoundException(`Paciente con ID "${id}" no encontrado o no le pertenece.`);
    }
    await this.paciente_repositorio.softRemove(paciente);
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
    let estado = 'pendiente';
    if (ultimo_tratamiento.estado === 'completado') {
      estado = 'completado';
    } else if (ultimo_tratamiento.estado === 'cancelado') {
      estado = 'cancelado';
    } else if (ultimo_tratamiento.citas && ultimo_tratamiento.citas.length > 0) {
      estado = 'en_progreso';
    }
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

  async listarHistoriasClinicas(usuario_id: number, paciente_id: number): Promise<HistoriaClinicaVersion[]> {
    await this.obtenerPacientePropietario(usuario_id, paciente_id);
    return this.historia_clinica_repositorio.find({
      where: { paciente: { id: paciente_id }, usuario: { id: usuario_id } },
      order: { numero_version: 'DESC', id: 'DESC' },
    });
  }

  async obtenerHistoriaClinica(
    usuario_id: number,
    paciente_id: number,
    version_id: number,
  ): Promise<HistoriaClinicaVersion> {
    await this.obtenerPacientePropietario(usuario_id, paciente_id);
    const version = await this.historia_clinica_repositorio.findOne({
      where: { id: version_id, paciente: { id: paciente_id }, usuario: { id: usuario_id } },
    });
    if (!version) {
      throw new NotFoundException(`Historia clínica con ID ${version_id} no encontrada para este paciente.`);
    }
    return version;
  }

  async crearHistoriaClinica(
    usuario_id: number,
    paciente_id: number,
    crear_historia_dto: CrearHistoriaClinicaDto,
  ): Promise<HistoriaClinicaVersion> {
    const paciente = await this.obtenerPacientePropietario(usuario_id, paciente_id);

    const total_versiones = await this.historia_clinica_repositorio.count({
      where: { paciente: { id: paciente_id } },
    });

    let contenido_html = crear_historia_dto.contenido_html ?? '';
    let config = crear_historia_dto.config ?? {
      tamano_hoja_id: null,
      nombre_tamano: 'Carta',
      widthMm: 216,
      heightMm: 279,
      margenes: { top: 20, right: 20, bottom: 20, left: 20 },
    };

    if (crear_historia_dto.clonar_de_version_id) {
      const version_base = await this.obtenerHistoriaClinica(
        usuario_id,
        paciente_id,
        crear_historia_dto.clonar_de_version_id,
      );
      contenido_html = version_base.contenido_html;
      config = version_base.config;
      if (!version_base.finalizada) {
        version_base.finalizada = true;
        await this.historia_clinica_repositorio.save(version_base);
      }
    }

    const nueva_version = this.historia_clinica_repositorio.create({
      nombre:
        crear_historia_dto.nombre ||
        format(new Date(), "dd/MM/yyyy HH:mm", {
          locale: es,
        }),
      numero_version: total_versiones + 1,
      contenido_html,
      config,
      finalizada: false,
      paciente,
      usuario: { id: usuario_id } as Usuario,
    });

    const version_guardada = await this.historia_clinica_repositorio.save(nueva_version);
    await this.sincronizarNotasMedicasDesdeHistoria(paciente_id, version_guardada);
    return version_guardada;
  }

  async actualizarHistoriaClinica(
    usuario_id: number,
    paciente_id: number,
    version_id: number,
    actualizar_historia_dto: ActualizarHistoriaClinicaDto,
  ): Promise<HistoriaClinicaVersion> {
    const version = await this.obtenerHistoriaClinica(usuario_id, paciente_id, version_id);
    if (version.finalizada) {
      throw new BadRequestException('No se puede modificar una versión finalizada de la historia clínica.');
    }

    version.nombre = actualizar_historia_dto.nombre ?? version.nombre;
    version.contenido_html = actualizar_historia_dto.contenido_html ?? version.contenido_html;
    version.config = actualizar_historia_dto.config ?? version.config;

    const guardada = await this.historia_clinica_repositorio.save(version);
    await this.sincronizarNotasMedicasDesdeHistoria(paciente_id, guardada);
    return guardada;
  }

  async finalizarHistoriaClinica(
    usuario_id: number,
    paciente_id: number,
    version_id: number,
  ): Promise<HistoriaClinicaVersion> {
    const version = await this.obtenerHistoriaClinica(usuario_id, paciente_id, version_id);
    if (version.finalizada) {
      return version;
    }
    version.finalizada = true;
    const guardada = await this.historia_clinica_repositorio.save(version);
    await this.sincronizarNotasMedicasDesdeHistoria(paciente_id, guardada);
    return guardada;
  }

  async clonarHistoriaClinica(
    usuario_id: number,
    paciente_id: number,
    version_id: number,
  ): Promise<HistoriaClinicaVersion> {
    const version_original = await this.obtenerHistoriaClinica(usuario_id, paciente_id, version_id);
    if (!version_original.finalizada) {
      version_original.finalizada = true;
      await this.historia_clinica_repositorio.save(version_original);
    }

    return this.crearHistoriaClinica(usuario_id, paciente_id, {
      contenido_html: version_original.contenido_html,
      config: version_original.config,
    });
  }

  async crearConsentimientoInformado(
    paciente_id: number,
    plantilla_id: number,
    nombre: string,
    usuario_id: number,
  ): Promise<ConsentimientoInformado> {
    const paciente = await this.paciente_repositorio.findOne({
      where: { id: paciente_id },
    });

    if (!paciente) {
      throw new NotFoundException(`Paciente con ID ${paciente_id} no encontrado`);
    }
    const plantilla = await this.plantilla_repositorio.findOne({
      where: { id: plantilla_id },
    });

    if (!plantilla) {
      throw new NotFoundException(`Plantilla con ID ${plantilla_id} no encontrada`);
    }

    const contenido_procesado = this.reemplazarVariablesPaciente(plantilla.contenido, paciente);
    const timestamp = Date.now();
    const nombre_archivo_base = `consentimiento_${timestamp}_${paciente_id}`;

    const configPdf = {
      tamano: (plantilla as any).tamano_papel || 'LETTER',
      margenes: {
        top: ((plantilla as any).margen_superior || 20) * 2.83465,
        bottom: ((plantilla as any).margen_inferior || 20) * 2.83465,
        left: ((plantilla as any).margen_izquierdo || 20) * 2.83465,
        right: ((plantilla as any).margen_derecho || 20) * 2.83465,
      }
    };

    const pdf_buffer = await this.generarPDFConsentimientoEnMemoria(contenido_procesado, nombre, configPdf);

    const nombre_archivo = await this.almacenamiento_servicio.guardarArchivoDesdeBuffer(
      pdf_buffer,
      'pdf',
      TipoDocumento.PLANTILLA_CONSENTIMIENTO,
      nombre_archivo_base
    );

    const consentimiento = new ConsentimientoInformado();
    consentimiento.paciente = paciente;
    consentimiento.usuario = { id: usuario_id } as Usuario;
    consentimiento.nombre = nombre;
    consentimiento.contenido_html = contenido_procesado;
    consentimiento.ruta_archivo = nombre_archivo;

    return await this.consentimiento_repositorio.save(consentimiento);
  }

  async obtenerConsentimientosPaciente(usuario_id: number, paciente_id: number): Promise<ConsentimientoInformado[]> {
    return await this.consentimiento_repositorio.find({
      where: {
        paciente: { id: paciente_id },
        usuario: { id: usuario_id }
      },
      order: { fecha_creacion: 'DESC' },
    });
  }

  async obtenerArchivoConsentimiento(usuario_id: number, id: number): Promise<Readable> {
    const consentimiento = await this.consentimiento_repositorio.findOne({
      where: { id, usuario: { id: usuario_id } },
    });

    if (!consentimiento) {
      throw new NotFoundException(`Consentimiento con ID ${id} no encontrado o no le pertenece.`);
    }

    return this.almacenamiento_servicio.obtenerStreamArchivo(
      consentimiento.ruta_archivo,
      TipoDocumento.PLANTILLA_CONSENTIMIENTO
    );
  }

  async eliminarConsentimiento(usuario_id: number, id: number): Promise<void> {
    const consentimiento = await this.consentimiento_repositorio.findOne({
      where: { id, usuario: { id: usuario_id } },
    });

    if (!consentimiento) {
      throw new NotFoundException(`Consentimiento con ID ${id} no encontrado o no le pertenece.`);
    }
    await this.almacenamiento_servicio.eliminarArchivo(
      consentimiento.ruta_archivo,
      TipoDocumento.PLANTILLA_CONSENTIMIENTO
    );
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

  private async generarPDFConsentimientoEnMemoria(
    contenido_html: string,
    titulo: string,
    config: any = {}
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: config.tamano ? config.tamano.toUpperCase() : 'LETTER',
        margins: config.margenes || { top: 56, bottom: 56, left: 56, right: 56 },
      });

      const buffers: Buffer[] = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      doc.font('Times-Roman').fontSize(11);

      doc.font('Times-Bold').fontSize(16).text(titulo, { align: 'center' });
      doc.moveDown(1.5);

      const regex = /(<\/?(?:b|strong|i|em|u|p|br|h[1-6]|ul|li|div)(?:\s+[^>]*)?>)/gi;
      const tokens = contenido_html.split(regex).filter(t => t.length > 0);

      const estado = {
        bold: false,
        italic: false,
        underline: false,
        list: false,
        align: 'left' as 'left' | 'center' | 'right' | 'justify',
      };

      doc.fontSize(11);

      tokens.forEach((token) => {
        const lowerToken = token.toLowerCase();

        if (lowerToken.startsWith('<')) {
          if (lowerToken === '<b>' || lowerToken === '<strong>') estado.bold = true;
          else if (lowerToken === '</b>' || lowerToken === '</strong>') estado.bold = false;
          else if (lowerToken === '<i>' || lowerToken === '<em>') estado.italic = true;
          else if (lowerToken === '</i>' || lowerToken === '</em>') estado.italic = false;
          else if (lowerToken === '<u>') estado.underline = true;
          else if (lowerToken === '</u>') estado.underline = false;
          else if (lowerToken === '<br>' || lowerToken === '<br/>') {
            doc.text('', { continued: false });
          }
          else if (lowerToken === '<p>' || lowerToken.startsWith('<p ')) {
            doc.moveDown(0.5);
            if (lowerToken.includes('text-align: center')) estado.align = 'center';
            else if (lowerToken.includes('text-align: right')) estado.align = 'right';
            else estado.align = 'left';
          }
          else if (lowerToken === '</p>') {
            doc.text('', { continued: false });
            doc.moveDown(0.5);
            estado.align = 'left';
          }
          else if (lowerToken.startsWith('<h')) {
            doc.moveDown(1);
            doc.font('Times-Bold').fontSize(14);
          }
          else if (lowerToken.startsWith('</h')) {
            doc.text('', { continued: false });
            doc.font('Times-Roman').fontSize(11);
            doc.moveDown(0.5);
          }
          else if (lowerToken === '<ul>') estado.list = true;
          else if (lowerToken === '</ul>') estado.list = false;
          else if (lowerToken === '<li>') {
            doc.text('', { continued: false });
            doc.moveDown(0.2);
            doc.text('• ', { continued: true, indent: 10 });
          }
          else if (lowerToken === '</li>') {
            doc.text('', { continued: false });
          }
        } else {
          let texto = token
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>');

          let font = 'Times-Roman';
          if (estado.bold && estado.italic) font = 'Times-BoldItalic';
          else if (estado.bold) font = 'Times-Bold';
          else if (estado.italic) font = 'Times-Italic';

          doc.font(font);

          doc.text(texto, {
            continued: true,
            underline: estado.underline,
            align: estado.align,
          });
        }
      });

      doc.text('', { continued: false });

      doc.end();
    });
  }
}