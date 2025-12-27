import { Injectable, NotFoundException, BadRequestException, ConflictException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, LessThan, MoreThan, Between, And, Or, DataSource } from 'typeorm';
import { ReservaMaterial } from './entidades/reserva-material.entidad';
import { TipoReservaMaterial, EstadoReserva } from './entidades/enums';
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
    }

    async obtenerReservasCita(cita_id: number): Promise<{
        materiales: ReservaMaterial[];
    }> {
        const materiales = await this.reserva_material_repositorio.find({
            where: { cita: { id: cita_id } },
            relations: ['material', 'material.producto', 'material.producto.inventario'],
        });

        return { materiales };
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
    }> {
        const materiales = await this.reserva_material_repositorio.find({
            where: { plan_tratamiento: { id: plan_tratamiento_id } },
            relations: ['material', 'material.producto'],
        });

        return { materiales };
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
