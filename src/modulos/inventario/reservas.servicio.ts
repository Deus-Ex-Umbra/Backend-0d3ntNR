import { Injectable, NotFoundException, BadRequestException, ConflictException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, LessThan, MoreThan, Between, And, Or, DataSource } from 'typeorm';
import { ReservaMaterial } from './entidades/reserva-material.entidad';
import { TipoReservaMaterial, EstadoReserva } from './entidades/enums';
import { ReservaActivo } from './entidades/reserva-activo.entidad';
import { Material } from './entidades/material.entidad';
import { Activo, EstadoActivo } from './entidades/activo.entidad';
import { Cita } from '../agenda/entidades/cita.entidad';
import { PlanTratamiento } from '../tratamientos/entidades/plan-tratamiento.entidad';
import { Usuario } from '../usuarios/entidades/usuario.entidad';
import { KardexServicio } from './kardex.servicio';
import { BitacoraServicio } from './bitacora.servicio';
import { TipoMovimientoKardex, TipoOperacionKardex } from './entidades/kardex.entidad';

@Injectable()
export class ReservasServicio {
    constructor(
        @InjectRepository(ReservaMaterial)
        private readonly reserva_material_repositorio: Repository<ReservaMaterial>,
        @InjectRepository(ReservaActivo)
        private readonly reserva_activo_repositorio: Repository<ReservaActivo>,
        @InjectRepository(Material)
        private readonly material_repositorio: Repository<Material>,
        @InjectRepository(Activo)
        private readonly activo_repositorio: Repository<Activo>,
        private readonly dataSource: DataSource,
        private readonly kardex_servicio: KardexServicio,
        private readonly bitacora_servicio: BitacoraServicio,
    ) { }
    async reservarMaterialCita(
        material_id: number,
        cita: Cita,
        cantidad: number,
        usuario_id: number,
    ): Promise<ReservaMaterial> {
        const material = await this.material_repositorio.findOne({
            where: { id: material_id },
        });

        if (!material) {
            throw new NotFoundException('Material no encontrado');
        }

        const disponible = Number(material.cantidad_actual) - Number(material.cantidad_reservada);
        if (disponible < cantidad) {
            throw new BadRequestException(`Stock insuficiente. Disponible: ${disponible}, Requerido: ${cantidad}`);
        }
        material.cantidad_reservada = Number(material.cantidad_reservada) + cantidad;
        await this.material_repositorio.save(material);
        const reserva = this.reserva_material_repositorio.create({
            material,
            cita,
            tipo: TipoReservaMaterial.CITA,
            cantidad_reservada: cantidad,
            estado: EstadoReserva.PENDIENTE,
            usuario: { id: usuario_id } as Usuario,
        });

        return this.reserva_material_repositorio.save(reserva);
    }
    async reservarMaterialTratamiento(
        material_id: number,
        plan_tratamiento: PlanTratamiento,
        cantidad: number,
        usuario_id: number,
        tipo: TipoReservaMaterial = TipoReservaMaterial.TRATAMIENTO_UNICA,
    ): Promise<ReservaMaterial> {
        const material = await this.material_repositorio.findOne({
            where: { id: material_id },
        });

        if (!material) {
            throw new NotFoundException('Material no encontrado');
        }

        const disponible = Number(material.cantidad_actual) - Number(material.cantidad_reservada);
        if (disponible < cantidad) {
            throw new BadRequestException(`Stock insuficiente. Disponible: ${disponible}, Requerido: ${cantidad}`);
        }
        material.cantidad_reservada = Number(material.cantidad_reservada) + cantidad;
        await this.material_repositorio.save(material);
        const reserva = this.reserva_material_repositorio.create({
            material,
            plan_tratamiento,
            tipo,
            cantidad_reservada: cantidad,
            estado: EstadoReserva.PENDIENTE,
            usuario: { id: usuario_id } as Usuario,
        });

        return this.reserva_material_repositorio.save(reserva);
    }
    async confirmarReservaMaterial(
        reserva_id: number,
        cantidad_confirmada?: number,
    ): Promise<ReservaMaterial> {
        const reserva = await this.reserva_material_repositorio.findOne({
            where: { id: reserva_id },
            relations: ['material'],
        });

        if (!reserva) {
            throw new NotFoundException('Reserva no encontrada');
        }

        if (reserva.estado === EstadoReserva.CONFIRMADA) {
            throw new BadRequestException('La reserva ya fue confirmada');
        }

        if (reserva.estado === EstadoReserva.CANCELADA) {
            throw new BadRequestException('No se puede confirmar una reserva cancelada');
        }

        const cantidad = cantidad_confirmada ?? Number(reserva.cantidad_reservada);
        const material = reserva.material;
        material.cantidad_reservada = Number(material.cantidad_reservada) - Number(reserva.cantidad_reservada);
        material.cantidad_actual = Number(material.cantidad_actual) - cantidad;
        await this.material_repositorio.save(material);
        reserva.estado = EstadoReserva.CONFIRMADA;
        reserva.cantidad_confirmada = cantidad;
        reserva.fecha_confirmacion = new Date();

        return this.reserva_material_repositorio.save(reserva);
    }

    async cancelarReservaMaterial(reserva_id: number): Promise<void> {
        const reserva = await this.reserva_material_repositorio.findOne({
            where: { id: reserva_id },
            relations: ['material'],
        });

        if (!reserva) {
            throw new NotFoundException('Reserva no encontrada');
        }

        if (reserva.estado === EstadoReserva.CONFIRMADA) {
            throw new BadRequestException('No se puede cancelar una reserva ya confirmada');
        }

        if (reserva.estado === EstadoReserva.CANCELADA) {
            return;
        }
        const material = reserva.material;
        material.cantidad_reservada = Number(material.cantidad_reservada) - Number(reserva.cantidad_reservada);
        await this.material_repositorio.save(material);
        reserva.estado = EstadoReserva.CANCELADA;
        await this.reserva_material_repositorio.save(reserva);
    }
    async cancelarReservasMaterialesCita(cita_id: number): Promise<void> {
        const reservas = await this.reserva_material_repositorio.find({
            where: { cita: { id: cita_id }, estado: EstadoReserva.PENDIENTE },
            relations: ['material'],
        });

        for (const reserva of reservas) {
            await this.cancelarReservaMaterial(reserva.id);
        }
    }

    async actualizarRecursosCita(
        cita: Cita,
        consumibles: { material_id: number; cantidad: number }[] | undefined,
        activos: { activo_id: number }[] | undefined,
        usuario_id: number,
        modo_estricto: boolean = false
    ): Promise<void> {
        if (consumibles !== undefined) {
            const reservas_materiales_actuales = await this.reserva_material_repositorio.find({
                where: { cita: { id: cita.id }, estado: EstadoReserva.PENDIENTE },
                relations: ['material']
            });
            for (const reserva of reservas_materiales_actuales) {
                const sigue_existiendo = consumibles.find(c => c.material_id === reserva.material.id);
                if (!sigue_existiendo) {
                    await this.cancelarReservaMaterial(reserva.id);
                }
            }
            for (const consumible of consumibles) {
                const reserva_existente = reservas_materiales_actuales.find(r => r.material.id === consumible.material_id);

                if (reserva_existente) {
                    const diferencia = consumible.cantidad - Number(reserva_existente.cantidad_reservada);
                    if (diferencia !== 0) {
                        if (diferencia > 0) {
                            const { disponible, mensaje } = await this.validarDisponibilidadMaterial(consumible.material_id, diferencia, modo_estricto);
                            if (!disponible) {
                                throw new BadRequestException(mensaje);
                            }
                        }

                        const material = reserva_existente.material;
                        material.cantidad_reservada = Number(material.cantidad_reservada) + diferencia;
                        await this.material_repositorio.save(material);
                        reserva_existente.cantidad_reservada = consumible.cantidad;
                        await this.reserva_material_repositorio.save(reserva_existente);
                    }
                } else {
                    try {
                        await this.reservarMaterialCita(consumible.material_id, cita, consumible.cantidad, usuario_id);
                    } catch (error) {
                        if (modo_estricto) throw error;
                        console.warn(`No se pudo reservar material ${consumible.material_id}:`, error.message);
                    }
                }
            }
        }

        if (activos !== undefined) {
            const reservas_activos_actuales = await this.reserva_activo_repositorio.find({
                where: { cita: { id: cita.id }, estado: EstadoReserva.PENDIENTE },
                relations: ['activo']
            });
            for (const reserva of reservas_activos_actuales) {
                const sigue_existiendo = activos.find(a => a.activo_id === reserva.activo.id);
                if (!sigue_existiendo) {
                    await this.reserva_activo_repositorio.remove(reserva);
                }
            }
            const fecha_inicio = new Date(cita.fecha);
            const duracion_minutos = (cita.horas_aproximadas * 60) + cita.minutos_aproximados;
            const fecha_fin = new Date(fecha_inicio.getTime() + duracion_minutos * 60000);

            for (const activo of activos) {
                const reserva_existente = reservas_activos_actuales.find(r => r.activo.id === activo.activo_id);

                if (!reserva_existente) {
                    await this.reservarActivoCitaGlobal(
                        activo.activo_id,
                        cita,
                        fecha_inicio,
                        fecha_fin,
                        usuario_id
                    );
                } else {
                    if (reserva_existente.fecha_hora_inicio.getTime() !== fecha_inicio.getTime() ||
                        reserva_existente.fecha_hora_fin.getTime() !== fecha_fin.getTime()) {
                        const { disponible, conflictos } = await this.verificarDisponibilidadActivoGlobal(
                            activo.activo_id,
                            fecha_inicio,
                            fecha_fin,
                            cita.id
                        );

                        if (!disponible && conflictos.length > 0) {
                            throw new ConflictException(`El activo ya no está disponible en el nuevo horario.`);
                        }

                        reserva_existente.fecha_hora_inicio = fecha_inicio;
                        reserva_existente.fecha_hora_fin = fecha_fin;
                        await this.reserva_activo_repositorio.save(reserva_existente);
                    }
                }
            }
        }
    }
    async verificarDisponibilidadActivo(
        activo_id: number,
        fecha_hora_inicio: Date,
        fecha_hora_fin: Date,
        cita_id_excluir?: number,
    ): Promise<{ disponible: boolean; reservas_conflicto: ReservaActivo[] }> {
        const activo = await this.activo_repositorio.findOne({
            where: { id: activo_id },
        });

        if (!activo) {
            throw new NotFoundException('Activo no encontrado');
        }
        if (activo.estado === EstadoActivo.DESECHADO) {
            return { disponible: false, reservas_conflicto: [] };
        }
        const query = this.reserva_activo_repositorio
            .createQueryBuilder('reserva')
            .where('reserva.activo = :activo_id', { activo_id })
            .andWhere('reserva.estado = :estado', { estado: EstadoReserva.PENDIENTE })
            .andWhere(
                '(reserva.fecha_hora_inicio < :fecha_fin AND reserva.fecha_hora_fin > :fecha_inicio)',
                { fecha_inicio: fecha_hora_inicio, fecha_fin: fecha_hora_fin }
            );

        if (cita_id_excluir) {
            query.andWhere('reserva.cita != :cita_id_excluir', { cita_id_excluir });
        }

        const reservas_conflicto = await query.getMany();

        return {
            disponible: reservas_conflicto.length === 0 && activo.estado === EstadoActivo.DISPONIBLE,
            reservas_conflicto,
        };
    }
    async reservarActivoCita(
        activo_id: number,
        cita: Cita,
        fecha_hora_inicio: Date,
        fecha_hora_fin: Date,
        usuario_id: number,
    ): Promise<ReservaActivo> {
        const { disponible, reservas_conflicto } = await this.verificarDisponibilidadActivo(
            activo_id,
            fecha_hora_inicio,
            fecha_hora_fin,
            cita.id,
        );

        if (!disponible) {
            if (reservas_conflicto.length > 0) {
                throw new ConflictException('El activo ya está reservado en ese horario');
            } else {
                throw new BadRequestException('El activo no está disponible');
            }
        }

        const activo = await this.activo_repositorio.findOne({ where: { id: activo_id } });

        if (!activo) {
            throw new NotFoundException('Activo no encontrado');
        }

        const reserva = this.reserva_activo_repositorio.create({
            activo,
            cita,
            fecha_hora_inicio,
            fecha_hora_fin,
            estado: EstadoReserva.PENDIENTE,
            usuario: { id: usuario_id } as Usuario,
        });

        return this.reserva_activo_repositorio.save(reserva);
    }
    async confirmarReservaActivo(reserva_id: number): Promise<ReservaActivo> {
        const reserva = await this.reserva_activo_repositorio.findOne({
            where: { id: reserva_id },
            relations: ['activo'],
        });

        if (!reserva) {
            throw new NotFoundException('Reserva de activo no encontrada');
        }

        if (reserva.estado === EstadoReserva.CONFIRMADA) {
            throw new BadRequestException('La reserva ya fue confirmada');
        }
        const activo = reserva.activo;
        activo.estado = EstadoActivo.EN_USO;
        await this.activo_repositorio.save(activo);
        reserva.estado = EstadoReserva.CONFIRMADA;
        return this.reserva_activo_repositorio.save(reserva);
    }

    async liberarActivo(activo_id: number): Promise<void> {
        const activo = await this.activo_repositorio.findOne({
            where: { id: activo_id },
        });

        if (!activo) {
            throw new NotFoundException('Activo no encontrado');
        }

        if (activo.estado === EstadoActivo.EN_USO) {
            activo.estado = EstadoActivo.DISPONIBLE;
            await this.activo_repositorio.save(activo);
        }
    }

    async cancelarReservaActivo(reserva_id: number): Promise<void> {
        const reserva = await this.reserva_activo_repositorio.findOne({
            where: { id: reserva_id },
            relations: ['activo'],
        });

        if (!reserva) {
            throw new NotFoundException('Reserva no encontrada');
        }

        if (reserva.estado === EstadoReserva.CONFIRMADA) {
            await this.liberarActivo(reserva.activo.id);
        }

        reserva.estado = EstadoReserva.CANCELADA;
        await this.reserva_activo_repositorio.save(reserva);
    }

    async cancelarReservasActivosCita(cita_id: number): Promise<void> {
        const reservas = await this.reserva_activo_repositorio.find({
            where: { cita: { id: cita_id } },
            relations: ['activo'],
        });

        for (const reserva of reservas) {
            await this.cancelarReservaActivo(reserva.id);
        }
    }

    async obtenerReservasCita(cita_id: number): Promise<{
        materiales: ReservaMaterial[];
        activos: ReservaActivo[];
    }> {
        const materiales = await this.reserva_material_repositorio.find({
            where: { cita: { id: cita_id } },
            relations: ['material', 'material.producto', 'material.producto.inventario'],
        });

        const activos = await this.reserva_activo_repositorio.find({
            where: { cita: { id: cita_id } },
            relations: ['activo', 'activo.producto', 'activo.producto.inventario'],
        });

        return { materiales, activos };
    }

    async confirmarMaterialesCita(
        cita_id: number,
        materiales: { material_cita_id: number; cantidad_usada: number }[],
        usuario_id: number,
    ): Promise<void> {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            for (const item of materiales) {
                const reserva = await queryRunner.manager.findOne(ReservaMaterial, {
                    where: { id: item.material_cita_id },
                    relations: ['material', 'material.producto', 'material.producto.inventario']
                });
                if (!reserva) continue;
                if (reserva.estado === EstadoReserva.CONFIRMADA) continue;
                const material = reserva.material;
                const producto = material.producto;
                const inventario = producto.inventario;
                const stock_anterior = Number(material.cantidad_actual);
                material.cantidad_reservada = Number(material.cantidad_reservada) - Number(reserva.cantidad_reservada);
                if (material.cantidad_reservada < 0) material.cantidad_reservada = 0;
                material.cantidad_actual = Number(material.cantidad_actual) - Number(item.cantidad_usada);
                if (material.cantidad_actual < 0) material.cantidad_actual = 0;
                const stock_nuevo = Number(material.cantidad_actual);
                reserva.cantidad_confirmada = item.cantidad_usada;
                reserva.estado = EstadoReserva.CONFIRMADA;
                reserva.fecha_confirmacion = new Date();
                await queryRunner.manager.save(Material, material);
                await queryRunner.manager.save(ReservaMaterial, reserva);
                await this.kardex_servicio.registrarSalida(
                    inventario,
                    producto,
                    TipoMovimientoKardex.CONSUMO_CITA,
                    item.cantidad_usada,
                    stock_anterior,
                    stock_nuevo,
                    usuario_id,
                    {
                        material,
                        referencia_tipo: 'cita',
                        referencia_id: cita_id,
                        observaciones: 'Consumo confirmado en cita'
                    }
                );
            }
            const reservas_activos = await queryRunner.manager.find(ReservaActivo, {
                where: { cita: { id: cita_id }, estado: EstadoReserva.PENDIENTE },
                relations: ['activo', 'activo.producto', 'activo.producto.inventario']
            });
            for (const reserva_activo of reservas_activos) {
                const activo = reserva_activo.activo;
                const inventario = activo.producto.inventario;
                const estado_anterior = activo.estado;
                if (activo.estado !== EstadoActivo.EN_USO) {
                    activo.estado = EstadoActivo.EN_USO;
                    await queryRunner.manager.save(Activo, activo);
                    await this.bitacora_servicio.registrarCambioEstado(
                        inventario,
                        activo,
                        estado_anterior,
                        EstadoActivo.EN_USO,
                        usuario_id,
                        {
                            referencia_tipo: 'cita',
                            referencia_id: cita_id,
                            motivo: 'Uso confirmado en cita'
                        }
                    );
                }
                reserva_activo.estado = EstadoReserva.CONFIRMADA;
                await queryRunner.manager.save(ReservaActivo, reserva_activo);
            }
            const cita = await queryRunner.manager.findOne(Cita, { where: { id: cita_id } });
            if (cita) {
                cita.materiales_confirmados = true;
                await queryRunner.manager.save(Cita, cita);
            }
            await queryRunner.commitTransaction();
        } catch (err) {
            await queryRunner.rollbackTransaction();
            throw err;
        } finally {
            await queryRunner.release();
        }
    }

    async obtenerReservasTratamiento(plan_tratamiento_id: number): Promise<{
        materiales: ReservaMaterial[];
        activos: ReservaActivo[];
    }> {
        const materiales = await this.reserva_material_repositorio.find({
            where: { plan_tratamiento: { id: plan_tratamiento_id } },
            relations: ['material', 'material.producto'],
        });

        const activos = await this.reserva_activo_repositorio.find({
            where: { plan_tratamiento: { id: plan_tratamiento_id } },
            relations: ['activo', 'activo.producto'],
        });

        return { materiales, activos };
    }

    async obtenerActivosDisponibles(
        producto_id: number,
        fecha_hora_inicio: Date,
        fecha_hora_fin: Date,
        cita_id_excluir?: number,
    ): Promise<Activo[]> {
        const activos = await this.activo_repositorio.find({
            where: {
                producto: { id: producto_id },
                estado: EstadoActivo.DISPONIBLE,
            },
        });

        const activos_disponibles: Activo[] = [];

        for (const activo of activos) {
            const { disponible } = await this.verificarDisponibilidadActivo(
                activo.id,
                fecha_hora_inicio,
                fecha_hora_fin,
                cita_id_excluir,
            );

            if (disponible) {
                activos_disponibles.push(activo);
            }
        }

        return activos_disponibles;
    }
    async verificarDisponibilidadActivoGlobal(
        activo_id: number,
        fecha_hora_inicio: Date,
        fecha_hora_fin: Date,
        cita_id_excluir?: number,
    ): Promise<{ disponible: boolean; conflictos: Array<{ cita_id: number; usuario_nombre: string; hora_inicio: Date; hora_fin: Date }> }> {
        const activo = await this.activo_repositorio.findOne({
            where: { id: activo_id },
        });

        if (!activo) {
            throw new NotFoundException('Activo no encontrado');
        }
        if (activo.estado === EstadoActivo.DESECHADO || activo.estado === EstadoActivo.VENDIDO) {
            return { disponible: false, conflictos: [] };
        }
        const query = this.reserva_activo_repositorio
            .createQueryBuilder('reserva')
            .leftJoinAndSelect('reserva.cita', 'cita')
            .leftJoinAndSelect('cita.usuario', 'usuario')
            .where('reserva.activo = :activo_id', { activo_id })
            .andWhere('reserva.estado IN (:...estados)', { estados: [EstadoReserva.PENDIENTE, EstadoReserva.CONFIRMADA] })
            .andWhere(
                '(reserva.fecha_hora_inicio < :fecha_fin AND reserva.fecha_hora_fin > :fecha_inicio)',
                { fecha_inicio: fecha_hora_inicio, fecha_fin: fecha_hora_fin }
            )
            .andWhere('(cita.id IS NULL OR cita.eliminado_en IS NULL)');

        if (cita_id_excluir) {
            query.andWhere('(reserva.cita IS NULL OR reserva.cita != :cita_id_excluir)', { cita_id_excluir });
        }

        const reservas_conflicto = await query.getMany();

        const conflictos = reservas_conflicto.map(r => ({
            cita_id: r.cita?.id,
            usuario_nombre: r.cita?.usuario?.nombre || 'Usuario desconocido',
            hora_inicio: r.fecha_hora_inicio,
            hora_fin: r.fecha_hora_fin,
        }));

        return {
            disponible: reservas_conflicto.length === 0,
            conflictos,
        };
    }
    async reservarActivoCitaGlobal(
        activo_id: number,
        cita: Cita,
        fecha_hora_inicio: Date,
        fecha_hora_fin: Date,
        usuario_id: number,
    ): Promise<ReservaActivo> {
        const { disponible, conflictos } = await this.verificarDisponibilidadActivoGlobal(
            activo_id,
            fecha_hora_inicio,
            fecha_hora_fin,
            cita.id,
        );

        if (!disponible) {
            if (conflictos.length > 0) {
                const conflicto = conflictos[0];
                const hora_inicio = new Date(conflicto.hora_inicio).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' });
                const hora_fin = new Date(conflicto.hora_fin).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' });
                throw new ConflictException(
                    `El activo ya está reservado de ${hora_inicio} a ${hora_fin} por ${conflicto.usuario_nombre}`
                );
            } else {
                throw new BadRequestException('El activo no está disponible (desechado o vendido)');
            }
        }

        const activo = await this.activo_repositorio.findOne({ where: { id: activo_id } });

        if (!activo) {
            throw new NotFoundException('Activo no encontrado');
        }

        const reserva = this.reserva_activo_repositorio.create({
            activo,
            cita,
            fecha_hora_inicio,
            fecha_hora_fin,
            estado: EstadoReserva.PENDIENTE,
            usuario: { id: usuario_id } as Usuario,
        });

        return this.reserva_activo_repositorio.save(reserva);
    }
    async procesarIniciosCitas(): Promise<{ procesados: number }> {
        const ahora = new Date();
        const margen = 60000;
        const inicio_rango = new Date(ahora.getTime() - margen);
        const fin_rango = new Date(ahora.getTime() + margen);
        const reservas = await this.reserva_activo_repositorio
            .createQueryBuilder('reserva')
            .leftJoinAndSelect('reserva.activo', 'activo')
            .leftJoinAndSelect('reserva.cita', 'cita')
            .where('reserva.estado = :estado', { estado: EstadoReserva.PENDIENTE })
            .andWhere('reserva.fecha_hora_inicio >= :inicio', { inicio: inicio_rango })
            .andWhere('reserva.fecha_hora_inicio <= :fin', { fin: fin_rango })
            .andWhere('(cita.id IS NULL OR cita.eliminado_en IS NULL)')
            .getMany();

        let procesados = 0;

        for (const reserva of reservas) {
            const activo = reserva.activo;
            if (activo.estado !== EstadoActivo.DESECHADO && activo.estado !== EstadoActivo.VENDIDO) {
                activo.estado = EstadoActivo.EN_USO;
                await this.activo_repositorio.save(activo);
                reserva.estado = EstadoReserva.CONFIRMADA;
                await this.reserva_activo_repositorio.save(reserva);

                procesados++;
            }
        }

        return { procesados };
    }

    async procesarFinesCitas(): Promise<{ procesados: number }> {
        const ahora = new Date();
        const margen = 60000;
        const inicio_rango = new Date(ahora.getTime() - margen);
        const fin_rango = new Date(ahora.getTime() + margen);
        const reservas = await this.reserva_activo_repositorio
            .createQueryBuilder('reserva')
            .leftJoinAndSelect('reserva.activo', 'activo')
            .where('reserva.estado = :estado', { estado: EstadoReserva.CONFIRMADA })
            .andWhere('reserva.fecha_hora_fin >= :inicio', { inicio: inicio_rango })
            .andWhere('reserva.fecha_hora_fin <= :fin', { fin: fin_rango })
            .getMany();

        let procesados = 0;

        for (const reserva of reservas) {
            const activo = reserva.activo;
            const otra_reserva_activa = await this.reserva_activo_repositorio
                .createQueryBuilder('r')
                .where('r.activo = :activo_id', { activo_id: activo.id })
                .andWhere('r.id != :reserva_id', { reserva_id: reserva.id })
                .andWhere('r.estado = :estado', { estado: EstadoReserva.CONFIRMADA })
                .andWhere('r.fecha_hora_fin > :ahora', { ahora })
                .getOne();
            if (!otra_reserva_activa && activo.estado === EstadoActivo.EN_USO) {
                activo.estado = EstadoActivo.DISPONIBLE;
                await this.activo_repositorio.save(activo);
                procesados++;
            }
        }

        return { procesados };
    }
    async validarDisponibilidadMaterial(
        material_id: number,
        cantidad_requerida: number,
        modo_estricto: boolean = false,
    ): Promise<{ disponible: boolean; stock_disponible: number; mensaje?: string }> {
        const material = await this.material_repositorio.findOne({
            where: { id: material_id },
        });

        if (!material) {
            throw new NotFoundException('Material no encontrado');
        }

        const stock_disponible = Number(material.cantidad_actual) - Number(material.cantidad_reservada);
        const disponible = stock_disponible >= cantidad_requerida;

        if (!disponible && modo_estricto) {
            return {
                disponible: false,
                stock_disponible,
                mensaje: `Stock insuficiente. Disponible: ${stock_disponible}, Requerido: ${cantidad_requerida}`,
            };
        }

        return { disponible, stock_disponible };
    }
}
