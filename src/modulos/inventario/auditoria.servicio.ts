import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Auditoria, TipoAccionAuditoria, CategoriaAuditoria } from './entidades/auditoria.entidad';
import { Inventario } from './entidades/inventario.entidad';
import { Producto } from './entidades/producto.entidad';
import { Material } from './entidades/material.entidad';
import { Activo } from './entidades/activo.entidad';
import { Usuario } from '../usuarios/entidades/usuario.entidad';
import { FiltrosAuditoriaDto } from './dto/filtros-historial.dto';

@Injectable()
export class AuditoriaServicio {
    constructor(
        @InjectRepository(Auditoria)
        private readonly auditoria_repositorio: Repository<Auditoria>,
    ) { }
    async registrarAccion(
        inventario: Inventario,
        accion: TipoAccionAuditoria,
        usuario_id: number,
        opciones: {
            producto?: Producto;
            material?: Material;
            activo?: Activo;
            datos_anteriores?: any;
            datos_nuevos?: any;
            motivo?: string;
            ip_address?: string;
            user_agent?: string;
        } = {},
    ): Promise<Auditoria> {
        let categoria: CategoriaAuditoria;
        if ([TipoAccionAuditoria.PRODUCTO_CREADO, TipoAccionAuditoria.PRODUCTO_EDITADO, TipoAccionAuditoria.PRODUCTO_ELIMINADO].includes(accion)) {
            categoria = CategoriaAuditoria.PRODUCTO;
        } else if ([TipoAccionAuditoria.MATERIAL_CREADO, TipoAccionAuditoria.MATERIAL_EDITADO, TipoAccionAuditoria.MATERIAL_ELIMINADO].includes(accion)) {
            categoria = CategoriaAuditoria.MATERIAL;
        } else if ([TipoAccionAuditoria.ACTIVO_CREADO, TipoAccionAuditoria.ACTIVO_EDITADO, TipoAccionAuditoria.ACTIVO_ELIMINADO, TipoAccionAuditoria.ACTIVO_VENDIDO].includes(accion)) {
            categoria = CategoriaAuditoria.ACTIVO;
        } else if (accion === TipoAccionAuditoria.AJUSTE_STOCK) {
            categoria = CategoriaAuditoria.AJUSTE;
        } else {
            categoria = CategoriaAuditoria.INVENTARIO;
        }

        const auditoria = this.auditoria_repositorio.create({
            inventario,
            accion,
            categoria,
            producto: opciones.producto,
            material: opciones.material,
            activo: opciones.activo,
            datos_anteriores: opciones.datos_anteriores ? JSON.stringify(opciones.datos_anteriores) : undefined,
            datos_nuevos: opciones.datos_nuevos ? JSON.stringify(opciones.datos_nuevos) : undefined,
            motivo: opciones.motivo,
            ip_address: opciones.ip_address,
            user_agent: opciones.user_agent,
            usuario: { id: usuario_id } as Usuario,
        });

        return this.auditoria_repositorio.save(auditoria);
    }
    async buscarAuditoria(
        inventario_id: number,
        filtros: FiltrosAuditoriaDto = {},
    ): Promise<{ registros: Auditoria[]; total: number }> {
        const query = this.auditoria_repositorio
            .createQueryBuilder('auditoria')
            .leftJoinAndSelect('auditoria.producto', 'producto')
            .leftJoinAndSelect('auditoria.material', 'material')
            .leftJoinAndSelect('auditoria.activo', 'activo')
            .leftJoinAndSelect('auditoria.usuario', 'usuario')
            .where('auditoria.inventario = :inventario_id', { inventario_id });
        this.aplicarFiltros(query, filtros);
        const ordenar_por = filtros.ordenar_por || 'fecha';
        const orden = filtros.orden || 'DESC';
        query.orderBy(`auditoria.${ordenar_por}`, orden);

        const limite = filtros.limite || 50;
        const offset = filtros.offset || 0;

        const [registros, total] = await query
            .skip(offset)
            .take(limite)
            .getManyAndCount();

        return { registros, total };
    }

    async obtenerHistorialProducto(
        inventario_id: number,
        producto_id: number,
        filtros: FiltrosAuditoriaDto = {},
    ): Promise<{ registros: Auditoria[]; total: number }> {
        filtros.producto_id = producto_id;
        return this.buscarAuditoria(inventario_id, filtros);
    }

    async obtenerHistorialMaterial(
        inventario_id: number,
        material_id: number,
        filtros: FiltrosAuditoriaDto = {},
    ): Promise<{ registros: Auditoria[]; total: number }> {
        filtros.material_id = material_id;
        return this.buscarAuditoria(inventario_id, filtros);
    }

    async obtenerHistorialActivo(
        inventario_id: number,
        activo_id: number,
        filtros: FiltrosAuditoriaDto = {},
    ): Promise<{ registros: Auditoria[]; total: number }> {
        filtros.activo_id = activo_id;
        return this.buscarAuditoria(inventario_id, filtros);
    }

    async obtenerAccionesUsuario(
        inventario_id: number,
        usuario_id: number,
        filtros: FiltrosAuditoriaDto = {},
    ): Promise<{ registros: Auditoria[]; total: number }> {
        filtros.usuario_id = usuario_id;
        return this.buscarAuditoria(inventario_id, filtros);
    }

    async generarReporteAntiSabotaje(
        inventario_id: number,
        fecha_inicio: Date,
        fecha_fin: Date,
    ): Promise<{
        total_acciones: number;
        por_tipo: { [key: string]: number };
        por_categoria: { [key: string]: number };
        por_usuario: { usuario_id: number; nombre: string; acciones: number }[];
        por_ip: { ip: string; acciones: number }[];
        alertas: { tipo: string; mensaje: string; fecha: Date }[];
    }> {
        const registros = await this.auditoria_repositorio
            .createQueryBuilder('auditoria')
            .leftJoinAndSelect('auditoria.usuario', 'usuario')
            .where('auditoria.inventario = :inventario_id', { inventario_id })
            .andWhere('auditoria.fecha BETWEEN :fecha_inicio AND :fecha_fin', { fecha_inicio, fecha_fin })
            .getMany();

        const resultado = {
            total_acciones: registros.length,
            por_tipo: {} as { [key: string]: number },
            por_categoria: {} as { [key: string]: number },
            por_usuario: [] as { usuario_id: number; nombre: string; acciones: number }[],
            por_ip: [] as { ip: string; acciones: number }[],
            alertas: [] as { tipo: string; mensaje: string; fecha: Date }[],
        };

        const usuarios_map = new Map<number, { nombre: string; acciones: number }>();
        const ip_map = new Map<string, number>();

        for (const registro of registros) {
            if (!resultado.por_tipo[registro.accion]) {
                resultado.por_tipo[registro.accion] = 0;
            }
            resultado.por_tipo[registro.accion]++;
            if (!resultado.por_categoria[registro.categoria]) {
                resultado.por_categoria[registro.categoria] = 0;
            }
            resultado.por_categoria[registro.categoria]++;
            if (registro.usuario) {
                if (!usuarios_map.has(registro.usuario.id)) {
                    usuarios_map.set(registro.usuario.id, {
                        nombre: registro.usuario.nombre || `Usuario #${registro.usuario.id}`,
                        acciones: 0,
                    });
                }
                usuarios_map.get(registro.usuario.id)!.acciones++;
            }
            if (registro.ip_address) {
                ip_map.set(registro.ip_address, (ip_map.get(registro.ip_address) || 0) + 1);
            }
            if ([TipoAccionAuditoria.PRODUCTO_ELIMINADO, TipoAccionAuditoria.MATERIAL_ELIMINADO, TipoAccionAuditoria.ACTIVO_ELIMINADO].includes(registro.accion)) {
                resultado.alertas.push({
                    tipo: 'eliminacion',
                    mensaje: `Eliminación registrada: ${registro.accion}`,
                    fecha: registro.fecha,
                });
            }

            if (registro.accion === TipoAccionAuditoria.AJUSTE_STOCK) {
                resultado.alertas.push({
                    tipo: 'ajuste',
                    mensaje: `Ajuste de stock: ${registro.motivo || 'Sin motivo especificado'}`,
                    fecha: registro.fecha,
                });
            }
        }

        resultado.por_usuario = Array.from(usuarios_map.entries()).map(([id, data]) => ({
            usuario_id: id,
            ...data,
        })).sort((a, b) => b.acciones - a.acciones);

        resultado.por_ip = Array.from(ip_map.entries()).map(([ip, acciones]) => ({
            ip,
            acciones,
        })).sort((a, b) => b.acciones - a.acciones);

        return resultado;
    }
    async buscarEnDatos(
        inventario_id: number,
        texto_busqueda: string,
        limite: number = 50,
    ): Promise<Auditoria[]> {
        return this.auditoria_repositorio
            .createQueryBuilder('auditoria')
            .leftJoinAndSelect('auditoria.producto', 'producto')
            .leftJoinAndSelect('auditoria.material', 'material')
            .leftJoinAndSelect('auditoria.activo', 'activo')
            .leftJoinAndSelect('auditoria.usuario', 'usuario')
            .where('auditoria.inventario = :inventario_id', { inventario_id })
            .andWhere('(auditoria.datos_anteriores LIKE :texto OR auditoria.datos_nuevos LIKE :texto OR auditoria.motivo LIKE :texto)', {
                texto: `%${texto_busqueda}%`,
            })
            .orderBy('auditoria.fecha', 'DESC')
            .take(limite)
            .getMany();
    }

    private aplicarFiltros(query: any, filtros: FiltrosAuditoriaDto): void {
        if (filtros.producto_id) {
            query.andWhere('auditoria.producto = :producto_id', { producto_id: filtros.producto_id });
        }

        if (filtros.material_id) {
            query.andWhere('auditoria.material = :material_id', { material_id: filtros.material_id });
        }

        if (filtros.activo_id) {
            query.andWhere('auditoria.activo = :activo_id', { activo_id: filtros.activo_id });
        }

        if (filtros.accion) {
            query.andWhere('auditoria.accion = :accion', { accion: filtros.accion });
        }

        if (filtros.acciones && filtros.acciones.length > 0) {
            query.andWhere('auditoria.accion IN (:...acciones)', { acciones: filtros.acciones });
        }

        if (filtros.categoria) {
            query.andWhere('auditoria.categoria = :categoria', { categoria: filtros.categoria });
        }

        if (filtros.fecha_inicio && filtros.fecha_fin) {
            query.andWhere('auditoria.fecha BETWEEN :fecha_inicio AND :fecha_fin', {
                fecha_inicio: new Date(filtros.fecha_inicio),
                fecha_fin: new Date(filtros.fecha_fin),
            });
        } else if (filtros.fecha_inicio) {
            query.andWhere('auditoria.fecha >= :fecha_inicio', { fecha_inicio: new Date(filtros.fecha_inicio) });
        } else if (filtros.fecha_fin) {
            query.andWhere('auditoria.fecha <= :fecha_fin', { fecha_fin: new Date(filtros.fecha_fin) });
        }

        if (filtros.usuario_id) {
            query.andWhere('auditoria.usuario = :usuario_id', { usuario_id: filtros.usuario_id });
        }

        if (filtros.ip_address) {
            query.andWhere('auditoria.ip_address = :ip_address', { ip_address: filtros.ip_address });
        }

        if (filtros.busqueda_datos) {
            query.andWhere('(auditoria.datos_anteriores LIKE :texto OR auditoria.datos_nuevos LIKE :texto)', {
                texto: `%${filtros.busqueda_datos}%`,
            });
        }
    }
}
