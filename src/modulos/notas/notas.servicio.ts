import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { NotaDiaria } from './entidades/nota-diaria.entidad';
import { CrearNotaDiariaDto } from './dto/crear-nota-diaria.dto';

@Injectable()
export class NotasServicio {
  constructor(
    @InjectRepository(NotaDiaria)
    private readonly nota_repositorio: Repository<NotaDiaria>,
  ) {}

  async crear(usuario_id: number, crear_nota_dto: CrearNotaDiariaDto): Promise<NotaDiaria> {
    const nueva_nota = this.nota_repositorio.create({
      ...crear_nota_dto,
      usuario: { id: usuario_id },
      fecha: new Date(),
    });
    return this.nota_repositorio.save(nueva_nota);
  }
  
  async obtenerUltimasNotas(usuario_id: number, dias: number): Promise<NotaDiaria[]> {
    const fecha_limite = new Date();
    fecha_limite.setDate(fecha_limite.getDate() - dias);

    return this.nota_repositorio.find({
        where: {
            usuario: { id: usuario_id },
            fecha: MoreThan(fecha_limite)
        },
        order: {
            fecha: 'DESC'
        }
    });
  }
}