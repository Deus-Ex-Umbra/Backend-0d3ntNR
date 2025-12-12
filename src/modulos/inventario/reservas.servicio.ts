import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, LessThan, MoreThan, Between, And, Or } from 'typeorm';
import { ReservaMaterial, TipoReservaMaterial, EstadoReserva } from './entidades/reserva-material.entidad';
import { ReservaActivo } from './entidades/reserva-activo.entidad';
import { Material } from './entidades/material.entidad';
import { Activo, EstadoActivo } from './entidades/activo.entidad';
import { Cita } from '../agenda/entidades/cita.entidad';
import { PlanTratamiento } from '../tratamientos/entidades/plan-tratamiento.entidad';
import { Usuario } from '../usuarios/entidades/usuario.entidad';

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
    ) { }

    // =====================
    // RESERVAS DE MATERIALES
    // =====================

    // Reservar material para una cita
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

        // Incrementar cantidad reservada en el material
        material.cantidad_reservada = Number(material.cantidad_reservada) + cantidad;
        await this.material_repositorio.save(material);

        // Crear reserva
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

    // Reservar material para tratamiento (reserva única)
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

        // Incrementar cantidad reservada
        material.cantidad_reservada = Number(material.cantidad_reservada) + cantidad;
        await this.material_repositorio.save(material);

        // Crear reserva
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

    // Confirmar reserva de material (descuenta stock)
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

        // Liberar cantidad reservada
        material.cantidad_reservada = Number(material.cantidad_reservada) - Number(reserva.cantidad_reservada);

        // Descontar del stock real
        material.cantidad_actual = Number(material.cantidad_actual) - cantidad;

        await this.material_repositorio.save(material);

        // Actualizar reserva
        reserva.estado = EstadoReserva.CONFIRMADA;
        reserva.cantidad_confirmada = cantidad;
        reserva.fecha_confirmacion = new Date();

        return this.reserva_material_repositorio.save(reserva);
    }

    // Cancelar reserva de material
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
            return; // Ya está cancelada
        }

        // Liberar cantidad reservada
        const material = reserva.material;
        material.cantidad_reservada = Number(material.cantidad_reservada) - Number(reserva.cantidad_reservada);
        await this.material_repositorio.save(material);

        // Actualizar estado
        reserva.estado = EstadoReserva.CANCELADA;
        await this.reserva_material_repositorio.save(reserva);
    }

    // Cancelar todas las reservas de materiales de una cita
    async cancelarReservasMaterialesCita(cita_id: number): Promise<void> {
        const reservas = await this.reserva_material_repositorio.find({
            where: { cita: { id: cita_id }, estado: EstadoReserva.PENDIENTE },
            relations: ['material'],
        });

        for (const reserva of reservas) {
            await this.cancelarReservaMaterial(reserva.id);
        }
    }

    // =====================
    // RESERVAS DE ACTIVOS
    // =====================

    // Verificar disponibilidad de activo (sin solapamiento)
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

        // Verificar estado del activo
        if (activo.estado === EstadoActivo.DESECHADO) {
            return { disponible: false, reservas_conflicto: [] };
        }

        // Buscar reservas que se solapen
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

    // Reservar activo para una cita
    async reservarActivoCita(
        activo_id: number,
        cita: Cita,
        fecha_hora_inicio: Date,
        fecha_hora_fin: Date,
        usuario_id: number,
    ): Promise<ReservaActivo> {
        // Verificar disponibilidad
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

    // Confirmar reserva de activo (cambia estado a EN_USO)
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

        // Cambiar estado del activo a EN_USO
        const activo = reserva.activo;
        activo.estado = EstadoActivo.EN_USO;
        await this.activo_repositorio.save(activo);

        // Actualizar reserva
        reserva.estado = EstadoReserva.CONFIRMADA;
        return this.reserva_activo_repositorio.save(reserva);
    }

    // Liberar activo (volver a DISPONIBLE al terminar)
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

    // Cancelar reserva de activo
    async cancelarReservaActivo(reserva_id: number): Promise<void> {
        const reserva = await this.reserva_activo_repositorio.findOne({
            where: { id: reserva_id },
            relations: ['activo'],
        });

        if (!reserva) {
            throw new NotFoundException('Reserva no encontrada');
        }

        if (reserva.estado === EstadoReserva.CONFIRMADA) {
            // Si ya está confirmada, liberar el activo
            await this.liberarActivo(reserva.activo.id);
        }

        reserva.estado = EstadoReserva.CANCELADA;
        await this.reserva_activo_repositorio.save(reserva);
    }

    // Cancelar todas las reservas de activos de una cita
    async cancelarReservasActivosCita(cita_id: number): Promise<void> {
        const reservas = await this.reserva_activo_repositorio.find({
            where: { cita: { id: cita_id } },
            relations: ['activo'],
        });

        for (const reserva of reservas) {
            await this.cancelarReservaActivo(reserva.id);
        }
    }

    // Obtener reservas de una cita
    async obtenerReservasCita(cita_id: number): Promise<{
        materiales: ReservaMaterial[];
        activos: ReservaActivo[];
    }> {
        const materiales = await this.reserva_material_repositorio.find({
            where: { cita: { id: cita_id } },
            relations: ['material', 'material.producto'],
        });

        const activos = await this.reserva_activo_repositorio.find({
            where: { cita: { id: cita_id } },
            relations: ['activo', 'activo.producto'],
        });

        return { materiales, activos };
    }

    // Obtener reservas de un tratamiento
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

    // Obtener activos disponibles para un rango de tiempo
    async obtenerActivosDisponibles(
        producto_id: number,
        fecha_hora_inicio: Date,
        fecha_hora_fin: Date,
        cita_id_excluir?: number,
    ): Promise<Activo[]> {
        // Obtener todos los activos del producto que estén disponibles
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
}
