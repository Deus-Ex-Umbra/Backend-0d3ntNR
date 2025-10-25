import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Alergia } from './entidades/alergia.entidad';
import { Enfermedad } from './entidades/enfermedad.entidad';
import { Medicamento } from './entidades/medicamento.entidad';
import { ColorCategoria } from './entidades/color-categoria.entidad';
import { Simbologia } from './entidades/simbologia.entidad';
import { CrearAlergiaDto } from './dto/crear-alergia.dto';
import { CrearEnfermedadDto } from './dto/crear-enfermedad.dto';
import { CrearMedicamentoDto } from './dto/crear-medicamento.dto';
import { CrearColorCategoriaDto } from './dto/crear-color-categoria.dto';
import { CrearSimbologiaDto } from './dto/crear-simbologia.dto';
import { ActualizarAlergiaDto } from './dto/actualizar-alergia.dto';
import { ActualizarEnfermedadDto } from './dto/actualizar-enfermedad.dto';
import { ActualizarMedicamentoDto } from './dto/actualizar-medicamento.dto';
import { ActualizarColorCategoriaDto } from './dto/actualizar-color-categoria.dto';
import { ActualizarSimbologiaDto } from './dto/actualizar-simbologia.dto';

@Injectable()
export class CatalogoServicio {
  constructor(
    @InjectRepository(Alergia)
    private readonly alergia_repositorio: Repository<Alergia>,
    @InjectRepository(Enfermedad)
    private readonly enfermedad_repositorio: Repository<Enfermedad>,
    @InjectRepository(Medicamento)
    private readonly medicamento_repositorio: Repository<Medicamento>,
    @InjectRepository(ColorCategoria)
    private readonly color_repositorio: Repository<ColorCategoria>,
    @InjectRepository(Simbologia)
    private readonly simbologia_repositorio: Repository<Simbologia>,
  ) {}

  async crearAlergia(dto: CrearAlergiaDto): Promise<Alergia> {
    const existe = await this.alergia_repositorio.findOne({ where: { nombre: dto.nombre } });
    if (existe) {
      throw new ConflictException('Esta alergia ya existe');
    }
    const alergia = this.alergia_repositorio.create(dto);
    return this.alergia_repositorio.save(alergia);
  }

  async obtenerAlergias(): Promise<Alergia[]> {
    return this.alergia_repositorio.find({ where: { activo: true }, order: { nombre: 'ASC' } });
  }

  async actualizarAlergia(id: number, dto: ActualizarAlergiaDto): Promise<Alergia> {
    const alergia = await this.alergia_repositorio.preload({ id, ...dto });
    if (!alergia) {
      throw new NotFoundException('Alergia no encontrada');
    }
    return this.alergia_repositorio.save(alergia);
  }

  async eliminarAlergia(id: number): Promise<void> {
    const resultado = await this.alergia_repositorio.update(id, { activo: false });
    if (resultado.affected === 0) {
      throw new NotFoundException('Alergia no encontrada');
    }
  }

  async crearEnfermedad(dto: CrearEnfermedadDto): Promise<Enfermedad> {
    const existe = await this.enfermedad_repositorio.findOne({ where: { nombre: dto.nombre } });
    if (existe) {
      throw new ConflictException('Esta enfermedad ya existe');
    }
    const enfermedad = this.enfermedad_repositorio.create(dto);
    return this.enfermedad_repositorio.save(enfermedad);
  }

  async obtenerEnfermedades(): Promise<Enfermedad[]> {
    return this.enfermedad_repositorio.find({ where: { activo: true }, order: { nombre: 'ASC' } });
  }

  async actualizarEnfermedad(id: number, dto: ActualizarEnfermedadDto): Promise<Enfermedad> {
    const enfermedad = await this.enfermedad_repositorio.preload({ id, ...dto });
    if (!enfermedad) {
      throw new NotFoundException('Enfermedad no encontrada');
    }
    return this.enfermedad_repositorio.save(enfermedad);
  }

  async eliminarEnfermedad(id: number): Promise<void> {
    const resultado = await this.enfermedad_repositorio.update(id, { activo: false });
    if (resultado.affected === 0) {
      throw new NotFoundException('Enfermedad no encontrada');
    }
  }

  async crearMedicamento(dto: CrearMedicamentoDto): Promise<Medicamento> {
    const existe = await this.medicamento_repositorio.findOne({ where: { nombre: dto.nombre } });
    if (existe) {
      throw new ConflictException('Este medicamento ya existe');
    }
    const medicamento = this.medicamento_repositorio.create(dto);
    return this.medicamento_repositorio.save(medicamento);
  }

  async obtenerMedicamentos(): Promise<Medicamento[]> {
    return this.medicamento_repositorio.find({ where: { activo: true }, order: { nombre: 'ASC' } });
  }

  async actualizarMedicamento(id: number, dto: ActualizarMedicamentoDto): Promise<Medicamento> {
    const medicamento = await this.medicamento_repositorio.preload({ id, ...dto });
    if (!medicamento) {
      throw new NotFoundException('Medicamento no encontrado');
    }
    return this.medicamento_repositorio.save(medicamento);
  }

  async eliminarMedicamento(id: number): Promise<void> {
    const resultado = await this.medicamento_repositorio.update(id, { activo: false });
    if (resultado.affected === 0) {
      throw new NotFoundException('Medicamento no encontrado');
    }
  }

  async crearColor(dto: CrearColorCategoriaDto): Promise<ColorCategoria> {
    const color = this.color_repositorio.create(dto);
    return this.color_repositorio.save(color);
  }

  async obtenerColores(): Promise<ColorCategoria[]> {
    return this.color_repositorio.find({ where: { activo: true }, order: { nombre: 'ASC' } });
  }

  async actualizarColor(id: number, dto: ActualizarColorCategoriaDto): Promise<ColorCategoria> {
    const color = await this.color_repositorio.preload({ id, ...dto });
    if (!color) {
      throw new NotFoundException('Color no encontrado');
    }
    return this.color_repositorio.save(color);
  }

  async eliminarColor(id: number): Promise<void> {
    const resultado = await this.color_repositorio.update(id, { activo: false });
    if (resultado.affected === 0) {
      throw new NotFoundException('Color no encontrado');
    }
  }

  async crearSimbologia(dto: CrearSimbologiaDto): Promise<Simbologia> {
    const existe = await this.simbologia_repositorio.findOne({ where: { nombre: dto.nombre } });
    if (existe) {
      throw new ConflictException('Ya existe un símbolo con este nombre');
    }
    const simbolo = this.simbologia_repositorio.create(dto);
    return this.simbologia_repositorio.save(simbolo);
  }

  async obtenerSimbologias(): Promise<Simbologia[]> {
    return this.simbologia_repositorio.find({ where: { activo: true }, order: { nombre: 'ASC' } });
  }

  async actualizarSimbologia(id: number, dto: ActualizarSimbologiaDto): Promise<Simbologia> {
    const simbolo = await this.simbologia_repositorio.preload({ id, ...dto });
    if (!simbolo) {
      throw new NotFoundException('Símbolo no encontrado');
    }
    return this.simbologia_repositorio.save(simbolo);
  }

  async eliminarSimbologia(id: number): Promise<void> {
    const resultado = await this.simbologia_repositorio.update(id, { activo: false });
    if (resultado.affected === 0) {
      throw new NotFoundException('Símbolo no encontrado');
    }
  }
}
