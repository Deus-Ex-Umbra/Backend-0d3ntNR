import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Bitacora } from './entidades/bitacora.entidad';
import { Activo, EstadoActivo } from './entidades/activo.entidad';
import { Inventario } from './entidades/inventario.entidad';
import { Usuario } from '../usuarios/entidades/usuario.entidad';
import { FiltrosBitacoraDto } from './dto/filtros-historial.dto';

@Injectable()
export class BitacoraServicio {
    constructor(
        @InjectRepository(Bitacora)
        private readonly bitacora_repositorio: Repository<Bitacora>,
    ) { }

    // Registrar cambio de estado de un activo
    async registrarCambioEstado(
        inventario: Inventario,
        activo: Activo,
        estado_anterior: EstadoActivo,
        estado_nuevo: EstadoActivo,
        usuario_id: number,
        opciones: {
            referencia_tipo?: string;
            referencia_id?: number;
            motivo?: string;
        } = {},
    ): Promise<Bitacora> {
        const bitacora = this.bitacora_repositorio.create({
            inventario,
            activo,
            estado_anterior,
            estado_nuevo,
            referencia_tipo: opciones.referencia_tipo,
            referencia_id: opciones.referencia_id,
            motivo: opciones.motivo,
            usuario: { id: usuario_id } as Usuario,
        });

        return this.bitacora_repositorio.save(bitacora);
    }

    // Obtener historial de un activo
    async obtenerHistorialActivo(
        inventario_id: number,
        activo_id: number,
        filtros: FiltrosBitacoraDto = {},
    ): Promise<{ registros: Bitacora[]; total: number }> {
        const query = this.bitacora_repositorio
            .createQueryBuilder('bitacora')
            .leftJoinAndSelect('bitacora.activo', 'activo')
            .leftJoinAndSelect('activo.producto', 'producto')
            .leftJoinAndSelect('bitacora.usuario', 'usuario')
            .where('bitacora.inventario = :inventario_id', { inventario_id })
            .andWhere('bitacora.activo = :activo_id', { activo_id });

        this.aplicarFiltros(query, filtros);

        query.orderBy('bitacora.fecha', 'DESC');

        const limite = filtros.limite || 50;
        const offset = filtros.offset || 0;

        const [registros, total] = await query
            .skip(offset)
            .take(limite)
            .getManyAndCount();

        return { registros, total };
    }

    // Obtener historial de todos los activos del inventario
    async obtenerHistorialInventario(
        inventario_id: number,
        filtros: FiltrosBitacoraDto = {},
    ): Promise<{ registros: Bitacora[]; total: number }> {
        const query = this.bitacora_repositorio
            .createQueryBuilder('bitacora')
            .leftJoinAndSelect('bitacora.activo', 'activo')
            .leftJoinAndSelect('activo.producto', 'producto')
            .leftJoinAndSelect('bitacora.usuario', 'usuario')
            .where('bitacora.inventario = :inventario_id', { inventario_id });

        this.aplicarFiltros(query, filtros);

        query.orderBy('bitacora.fecha', 'DESC');

        const limite = filtros.limite || 50;
        const offset = filtros.offset || 0;

        const [registros, total] = await query
            .skip(offset)
            .take(limite)
            .getManyAndCount();

        return { registros, total };
    }

    // Obtener eventos recientes (útil para dashboard)
    async obtenerEventosRecientes(
        inventario_id: number,
        limite: number = 10,
    ): Promise<Bitacora[]> {
        return this.bitacora_repositorio.find({
            where: { inventario: { id: inventario_id } },
            relations: ['activo', 'activo.producto', 'usuario'],
            order: { fecha: 'DESC' },
            take: limite,
        });
    }

    // Obtener estadísticas de cambios de estado
    async obtenerEstadisticasCambiosEstado(
        inventario_id: number,
        fecha_inicio: Date,
        fecha_fin: Date,
    ): Promise<{
        total_cambios: number;
        por_estado_nuevo: { [key: string]: number };
        por_activo: { activo_id: number; nombre: string; cambios: number }[];
    }> {
        const registros = await this.bitacora_repositorio
            .createQueryBuilder('bitacora')
            .leftJoinAndSelect('bitacora.activo', 'activo')
            .leftJoinAndSelect('activo.producto', 'producto')
            .where('bitacora.inventario = :inventario_id', { inventario_id })
            .andWhere('bitacora.fecha BETWEEN :fecha_inicio AND :fecha_fin', { fecha_inicio, fecha_fin })
            .getMany();

        const resultado = {
            total_cambios: registros.length,
            por_estado_nuevo: {} as { [key: string]: number },
            por_activo: [] as { activo_id: number; nombre: string; cambios: number }[],
        };

        const activos_map = new Map<number, { nombre: string; cambios: number }>();

        for (const registro of registros) {
            // Contar por estado nuevo
            if (!resultado.por_estado_nuevo[registro.estado_nuevo]) {
                resultado.por_estado_nuevo[registro.estado_nuevo] = 0;
            }
            resultado.por_estado_nuevo[registro.estado_nuevo]++;

            // Contar por activo
            if (!activos_map.has(registro.activo.id)) {
                activos_map.set(registro.activo.id, {
                    nombre: registro.activo.nombre_asignado || registro.activo.producto?.nombre || `Activo #${registro.activo.id}`,
                    cambios: 0,
                });
            }
            activos_map.get(registro.activo.id)!.cambios++;
        }

        resultado.por_activo = Array.from(activos_map.entries()).map(([id, data]) => ({
            activo_id: id,
            ...data,
        }));

        return resultado;
    }

    private aplicarFiltros(query: any, filtros: FiltrosBitacoraDto): void {
        if (filtros.activo_id) {
            query.andWhere('bitacora.activo = :activo_id', { activo_id: filtros.activo_id });
        }

        if (filtros.estado_anterior) {
            query.andWhere('bitacora.estado_anterior = :estado_anterior', { estado_anterior: filtros.estado_anterior });
        }

        if (filtros.estado_nuevo) {
            query.andWhere('bitacora.estado_nuevo = :estado_nuevo', { estado_nuevo: filtros.estado_nuevo });
        }

        if (filtros.fecha_inicio && filtros.fecha_fin) {
            query.andWhere('bitacora.fecha BETWEEN :fecha_inicio AND :fecha_fin', {
                fecha_inicio: new Date(filtros.fecha_inicio),
                fecha_fin: new Date(filtros.fecha_fin),
            });
        } else if (filtros.fecha_inicio) {
            query.andWhere('bitacora.fecha >= :fecha_inicio', { fecha_inicio: new Date(filtros.fecha_inicio) });
        } else if (filtros.fecha_fin) {
            query.andWhere('bitacora.fecha <= :fecha_fin', { fecha_fin: new Date(filtros.fecha_fin) });
        }

        if (filtros.usuario_id) {
            query.andWhere('bitacora.usuario = :usuario_id', { usuario_id: filtros.usuario_id });
        }
    }
}
