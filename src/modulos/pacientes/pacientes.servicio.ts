import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike, In, LessThan } from 'typeorm';
import { Paciente } from './entidades/paciente.entidad';
import { PacienteAlergia } from './entidades/paciente-alergia.entidad';
import { PacienteEnfermedad } from './entidades/paciente-enfermedad.entidad';
import { PacienteMedicamento } from './entidades/paciente-medicamento.entidad';
import { Alergia } from '../catalogo/entidades/alergia.entidad';
import { Enfermedad } from '../catalogo/entidades/enfermedad.entidad';
import { Medicamento } from '../catalogo/entidades/medicamento.entidad';
import { Cita } from '../agenda/entidades/cita.entidad';
import { PlanTratamiento } from '../tratamientos/entidades/plan-tratamiento.entidad';
import { CrearPacienteDto } from './dto/crear-paciente.dto';
import { ActualizarPacienteDto } from './dto/actualizar-paciente.dto';
import { RespuestaAnamnesisDto } from './dto/respuesta-anamnesis.dto';
import { Usuario } from '../usuarios/entidades/usuario.entidad';

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
}