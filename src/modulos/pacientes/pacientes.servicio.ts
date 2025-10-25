import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike, In } from 'typeorm';
import { Paciente } from './entidades/paciente.entidad';
import { PacienteAlergia } from './entidades/paciente-alergia.entidad';
import { PacienteEnfermedad } from './entidades/paciente-enfermedad.entidad';
import { PacienteMedicamento } from './entidades/paciente-medicamento.entidad';
import { Alergia } from '../catalogo/entidades/alergia.entidad';
import { Enfermedad } from '../catalogo/entidades/enfermedad.entidad';
import { Medicamento } from '../catalogo/entidades/medicamento.entidad';
import { CrearPacienteDto } from './dto/crear-paciente.dto';
import { ActualizarPacienteDto } from './dto/actualizar-paciente.dto';
import { RespuestaAnamnesisDto } from './dto/respuesta-anamnesis.dto';

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
  ) {}

  async crear(crear_paciente_dto: CrearPacienteDto): Promise<Paciente> {
    const { alergias_ids, enfermedades_ids, medicamentos_ids, ...datos_paciente } = crear_paciente_dto;

    const nuevo_paciente = this.paciente_repositorio.create(datos_paciente);
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

    return this.encontrarPorId(paciente_guardado.id);
  }

  async encontrarTodos(termino_busqueda?: string): Promise<Paciente[]> {
    if (termino_busqueda) {
      const id_busqueda = parseInt(termino_busqueda, 10);
      const where_conditions: any[] = [
        { nombre: ILike(`%${termino_busqueda}%`) },
        { apellidos: ILike(`%${termino_busqueda}%`) },
      ];
      if (!isNaN(id_busqueda)) {
        where_conditions.push({ id: id_busqueda });
      }
      return this.paciente_repositorio.find({ where: where_conditions });
    }
    return this.paciente_repositorio.find();
  }

 async encontrarPorId(id: number): Promise<any> {
  const paciente = await this.paciente_repositorio.findOne({
    where: { id },
    relations: [
      'odontogramas',
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
    throw new NotFoundException(`Paciente con ID "${id}" no encontrado.`);
  }
  
    return {
    ...paciente,
    alergias: paciente.paciente_alergias?.map(pa => pa.alergia.id) || [],
    enfermedades: paciente.paciente_enfermedades?.map(pe => pe.enfermedad.id) || [],
    medicamentos: paciente.paciente_medicamentos?.map(pm => pm.medicamento.id) || [],
  };
}
  async actualizar(id: number, actualizar_paciente_dto: ActualizarPacienteDto): Promise<Paciente> {
    const { alergias_ids, enfermedades_ids, medicamentos_ids, ...datos_paciente } = actualizar_paciente_dto;

    const paciente = await this.paciente_repositorio.preload({
      id: id,
      ...datos_paciente,
    });

    if (!paciente) {
      throw new NotFoundException(`Paciente con ID "${id}" no encontrado.`);
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

    return this.encontrarPorId(id);
  }

  async eliminar(id: number): Promise<void> {
    const resultado = await this.paciente_repositorio.delete(id);
    if (resultado.affected === 0) {
      throw new NotFoundException(`Paciente con ID "${id}" no encontrado.`);
    }
  }

  async obtenerAnamnesisPorPaciente(id: number): Promise<RespuestaAnamnesisDto> {
    const paciente = await this.paciente_repositorio.findOne({
      where: { id },
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
      throw new NotFoundException(`Paciente con ID "${id}" no encontrado.`);
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
}