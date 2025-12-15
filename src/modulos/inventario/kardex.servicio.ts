import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { Kardex, TipoMovimientoKardex, TipoOperacionKardex } from './entidades/kardex.entidad';
import { Producto } from './entidades/producto.entidad';
import { Material } from './entidades/material.entidad';
import { Inventario } from './entidades/inventario.entidad';
import { Usuario } from '../usuarios/entidades/usuario.entidad';
import { FiltrosKardexDto } from './dto/filtros-historial.dto';

@Injectable()
export class KardexServicio {
    constructor(
        @InjectRepository(Kardex)
        private readonly kardex_repositorio: Repository<Kardex>,
    ) { }

    async registrarEntrada(
        inventario: Inventario,
        producto: Producto,
        tipo: TipoMovimientoKardex,
        cantidad: number,
        stock_anterior: number,
        stock_nuevo: number,
        usuario_id: number,
        opciones: {
            material?: Material;
            monto?: number;
            costo_unitario?: number;
            referencia_tipo?: string;
            referencia_id?: number;
            observaciones?: string;
        } = {},
    ): Promise<Kardex> {
        const kardex = this.kardex_repositorio.create({
            inventario,
            producto,
            material: opciones.material,
            tipo,
            operacion: TipoOperacionKardex.ENTRADA,
            cantidad,
            stock_anterior,
            stock_nuevo,
            monto: opciones.monto,
            costo_unitario: opciones.costo_unitario,
            referencia_tipo: opciones.referencia_tipo,
            referencia_id: opciones.referencia_id,
            observaciones: opciones.observaciones,
            usuario: { id: usuario_id } as Usuario,
        });

        return this.kardex_repositorio.save(kardex);
    }

    async registrarSalida(
        inventario: Inventario,
        producto: Producto,
        tipo: TipoMovimientoKardex,
        cantidad: number,
        stock_anterior: number,
        stock_nuevo: number,
        usuario_id: number,
        opciones: {
            material?: Material;
            monto?: number;
            referencia_tipo?: string;
            referencia_id?: number;
            observaciones?: string;
        } = {},
    ): Promise<Kardex> {
        const kardex = this.kardex_repositorio.create({
            inventario,
            producto,
            material: opciones.material,
            tipo,
            operacion: TipoOperacionKardex.SALIDA,
            cantidad,
            stock_anterior,
            stock_nuevo,
            monto: opciones.monto,
            referencia_tipo: opciones.referencia_tipo,
            referencia_id: opciones.referencia_id,
            observaciones: opciones.observaciones,
            usuario: { id: usuario_id } as Usuario,
        });

        return this.kardex_repositorio.save(kardex);
    }

    async obtenerHistorialProducto(
        inventario_id: number,
        producto_id: number,
        filtros: FiltrosKardexDto = {},
    ): Promise<{ registros: Kardex[]; total: number }> {
        const query = this.kardex_repositorio
            .createQueryBuilder('kardex')
            .leftJoinAndSelect('kardex.producto', 'producto')
            .leftJoinAndSelect('kardex.material', 'material')
            .leftJoinAndSelect('kardex.usuario', 'usuario')
            .where('kardex.inventario = :inventario_id', { inventario_id })
            .andWhere('kardex.producto = :producto_id', { producto_id });

        this.aplicarFiltros(query, filtros);

        query.orderBy('kardex.fecha', 'DESC');

        const limite = filtros.limite || 50;
        const offset = filtros.offset || 0;

        const [registros, total] = await query
            .skip(offset)
            .take(limite)
            .getManyAndCount();

        return { registros, total };
    }
    async obtenerHistorialInventario(
        inventario_id: number,
        filtros: FiltrosKardexDto = {},
    ): Promise<{ registros: Kardex[]; total: number }> {
        const query = this.kardex_repositorio
            .createQueryBuilder('kardex')
            .leftJoinAndSelect('kardex.producto', 'producto')
            .leftJoinAndSelect('kardex.material', 'material')
            .leftJoinAndSelect('kardex.usuario', 'usuario')
            .where('kardex.inventario = :inventario_id', { inventario_id });

        this.aplicarFiltros(query, filtros);

        query.orderBy('kardex.fecha', 'DESC');

        const limite = filtros.limite || 50;
        const offset = filtros.offset || 0;

        const [registros, total] = await query
            .skip(offset)
            .take(limite)
            .getManyAndCount();

        return { registros, total };
    }

    async generarReporteKardex(
        inventario_id: number,
        fecha_inicio: Date,
        fecha_fin: Date,
    ): Promise<{
        entradas: { cantidad: number; monto: number };
        salidas: { cantidad: number; monto: number };
        por_tipo: { [key: string]: { cantidad: number; monto: number } };
        por_producto: { producto_id: number; nombre: string; entradas: number; salidas: number }[];
    }> {
        const registros = await this.kardex_repositorio.find({
            where: {
                inventario: { id: inventario_id },
                fecha: Between(fecha_inicio, fecha_fin),
            },
            relations: ['producto'],
        });

        const resultado = {
            entradas: { cantidad: 0, monto: 0 },
            salidas: { cantidad: 0, monto: 0 },
            por_tipo: {} as { [key: string]: { cantidad: number; monto: number } },
            por_producto: [] as { producto_id: number; nombre: string; entradas: number; salidas: number }[],
        };

        const productos_map = new Map<number, { nombre: string; entradas: number; salidas: number }>();

        for (const registro of registros) {
            const cantidad = Number(registro.cantidad);
            const monto = Number(registro.monto) || 0;
            if (registro.operacion === TipoOperacionKardex.ENTRADA) {
                resultado.entradas.cantidad += cantidad;
                resultado.entradas.monto += monto;
            } else {
                resultado.salidas.cantidad += cantidad;
                resultado.salidas.monto += monto;
            }
            if (!resultado.por_tipo[registro.tipo]) {
                resultado.por_tipo[registro.tipo] = { cantidad: 0, monto: 0 };
            }
            resultado.por_tipo[registro.tipo].cantidad += cantidad;
            resultado.por_tipo[registro.tipo].monto += monto;
            if (!productos_map.has(registro.producto.id)) {
                productos_map.set(registro.producto.id, {
                    nombre: registro.producto.nombre,
                    entradas: 0,
                    salidas: 0,
                });
            }
            const prod = productos_map.get(registro.producto.id)!;
            if (registro.operacion === TipoOperacionKardex.ENTRADA) {
                prod.entradas += cantidad;
            } else {
                prod.salidas += cantidad;
            }
        }

        resultado.por_producto = Array.from(productos_map.entries()).map(([id, data]) => ({
            producto_id: id,
            ...data,
        }));

        return resultado;
    }

    private aplicarFiltros(query: any, filtros: FiltrosKardexDto): void {
        if (filtros.producto_id) {
            query.andWhere('kardex.producto = :producto_id', { producto_id: filtros.producto_id });
        }

        if (filtros.material_id) {
            query.andWhere('kardex.material = :material_id', { material_id: filtros.material_id });
        }

        if (filtros.tipo) {
            query.andWhere('kardex.tipo = :tipo', { tipo: filtros.tipo });
        }

        if (filtros.operacion) {
            query.andWhere('kardex.operacion = :operacion', { operacion: filtros.operacion });
        }

        if (filtros.fecha_inicio && filtros.fecha_fin) {
            query.andWhere('kardex.fecha BETWEEN :fecha_inicio AND :fecha_fin', {
                fecha_inicio: new Date(filtros.fecha_inicio),
                fecha_fin: new Date(filtros.fecha_fin),
            });
        } else if (filtros.fecha_inicio) {
            query.andWhere('kardex.fecha >= :fecha_inicio', { fecha_inicio: new Date(filtros.fecha_inicio) });
        } else if (filtros.fecha_fin) {
            query.andWhere('kardex.fecha <= :fecha_fin', { fecha_fin: new Date(filtros.fecha_fin) });
        }

        if (filtros.usuario_id) {
            query.andWhere('kardex.usuario = :usuario_id', { usuario_id: filtros.usuario_id });
        }
    }
}
