import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Odontograma } from './entidades/odontograma.entidad';
import { CrearOdontogramaDto } from './dto/crear-odontograma.dto';
import { PacientesServicio } from '../pacientes/pacientes.servicio';

@Injectable()
export class OdontogramaServicio {
  constructor(
    @InjectRepository(Odontograma)
    private readonly odontograma_repositorio: Repository<Odontograma>,
    private readonly pacientes_servicio: PacientesServicio,
  ) {}

  async crear(paciente_id: number, crear_odontograma_dto: CrearOdontogramaDto): Promise<Odontograma> {
    const paciente = await this.pacientes_servicio.encontrarPorId(paciente_id);
    const nuevo_odontograma = this.odontograma_repositorio.create({
      ...crear_odontograma_dto,
      paciente: paciente,
      fecha_creacion: new Date(),
    });
    return this.odontograma_repositorio.save(nuevo_odontograma);
  }

  async obtenerHistorialPorPaciente(paciente_id: number): Promise<Odontograma[]> {
    return this.odontograma_repositorio.find({
      where: { paciente: { id: paciente_id } },
      order: { fecha_creacion: 'DESC' },
    });
  }

  async obtenerUltimoPorPaciente(paciente_id: number): Promise<Odontograma> {
    const odontograma = await this.odontograma_repositorio.findOne({
      where: { paciente: { id: paciente_id } },
      order: { fecha_creacion: 'DESC' },
    });

    if (!odontograma) {
      throw new NotFoundException(`No se encontraron odontogramas para el paciente con ID "${paciente_id}".`);
    }
    return odontograma;
  }
}
