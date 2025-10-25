import { Injectable, NotFoundException, Inject, BadRequestException, forwardRef, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, FindOptionsWhere, LessThanOrEqual, MoreThanOrEqual, Not } from 'typeorm';
import { Cita } from './entidades/cita.entidad';
import { CrearCitaDto } from './dto/crear-cita.dto';
import { ActualizarCitaDto } from './dto/actualizar-cita.dto';
import { Paciente } from '../pacientes/entidades/paciente.entidad';
import { PlanTratamiento } from '../tratamientos/entidades/plan-tratamiento.entidad';
import { FinanzasServicio } from '../finanzas/finanzas.servicio';

@Injectable()
export class AgendaServicio {
  constructor(
    @InjectRepository(Cita)
    private readonly cita_repositorio: Repository<Cita>,
    @Inject(forwardRef(() => FinanzasServicio))
    private readonly finanzas_servicio: FinanzasServicio,
  ) {}

  private calcularDuracionEnMinutos(horas: number, minutos: number): number {
    return (horas * 60) + minutos;
  }

  private formatearHora(fecha: Date): string {
    return fecha.toLocaleTimeString('es-BO', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  }

  private formatearFecha(fecha: Date): string {
    return fecha.toLocaleDateString('es-BO', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  }

  async validarDisponibilidad(
    fecha: Date, 
    horas: number = 0, 
    minutos: number = 30, 
    cita_id_excluir?: number
  ): Promise<{ disponible: boolean; citas_conflicto: Cita[]; mensaje_detallado?: string }> {
    const ahora = new Date();
    const fecha_cita = new Date(fecha);
    
    if (fecha_cita < ahora) {
      return {
        disponible: false,
        citas_conflicto: [],
        mensaje_detallado: `No se pueden crear citas en el pasado. La fecha seleccionada (${this.formatearFecha(fecha_cita)} a las ${this.formatearHora(fecha_cita)}) ya pasó.`
      };
    }

    const duracion_total_minutos = this.calcularDuracionEnMinutos(horas, minutos);
    
    const fecha_fin_nueva_cita = new Date(fecha_cita);
    fecha_fin_nueva_cita.setMinutes(fecha_fin_nueva_cita.getMinutes() + duracion_total_minutos);

    const fecha_inicio_busqueda = new Date(fecha_cita);
    fecha_inicio_busqueda.setHours(0, 0, 0, 0);
    
    const fecha_fin_busqueda = new Date(fecha_cita);
    fecha_fin_busqueda.setHours(23, 59, 59, 999);

    const condiciones: any = {
      fecha: Between(fecha_inicio_busqueda, fecha_fin_busqueda)
    };

    if (cita_id_excluir) {
      condiciones.id = Not(cita_id_excluir);
    }

    const citas_del_dia = await this.cita_repositorio.find({
      where: condiciones,
      relations: ['paciente', 'plan_tratamiento'],
    });

    const citas_conflicto: Cita[] = [];
    const conflictos_detallados: string[] = [];

    for (const cita_existente of citas_del_dia) {
      const fecha_inicio_existente = new Date(cita_existente.fecha);
      const duracion_existente = this.calcularDuracionEnMinutos(
        cita_existente.horas_aproximadas || 0,
        cita_existente.minutos_aproximados || 30
      );
      const fecha_fin_existente = new Date(fecha_inicio_existente);
      fecha_fin_existente.setMinutes(fecha_fin_existente.getMinutes() + duracion_existente);

      const hay_solapamiento = 
        (fecha_cita >= fecha_inicio_existente && fecha_cita < fecha_fin_existente) ||
        (fecha_fin_nueva_cita > fecha_inicio_existente && fecha_fin_nueva_cita <= fecha_fin_existente) ||
        (fecha_cita <= fecha_inicio_existente && fecha_fin_nueva_cita >= fecha_fin_existente);

      if (hay_solapamiento) {
        citas_conflicto.push(cita_existente);
        
        const hora_inicio_existente = this.formatearHora(fecha_inicio_existente);
        const hora_fin_existente = this.formatearHora(fecha_fin_existente);
        const descripcion = cita_existente.paciente 
          ? `${cita_existente.paciente.nombre} ${cita_existente.paciente.apellidos} - ${cita_existente.descripcion}`
          : cita_existente.descripcion;
        
        conflictos_detallados.push(
          `• ${hora_inicio_existente} - ${hora_fin_existente}: ${descripcion}`
        );
      }
    }

    if (citas_conflicto.length > 0) {
      const hora_inicio_nueva = this.formatearHora(fecha_cita);
      const hora_fin_nueva = this.formatearHora(fecha_fin_nueva_cita);
      
      const mensaje = `La cita que intentas crear (${hora_inicio_nueva} - ${hora_fin_nueva}) se solapa con las siguientes citas:\n\n${conflictos_detallados.join('\n')}\n\nPor favor, elige un horario después de las ${this.formatearHora(fecha_fin_nueva_cita)} o antes del primer conflicto.`;
      
      return {
        disponible: false,
        citas_conflicto,
        mensaje_detallado: mensaje
      };
    }

    return {
      disponible: true,
      citas_conflicto: []
    };
  }

  async crear(crear_cita_dto: CrearCitaDto): Promise<Cita> {
    const { 
      paciente_id, 
      plan_tratamiento_id, 
      estado_pago, 
      monto_esperado, 
      horas_aproximadas, 
      minutos_aproximados, 
      ...cita_data 
    } = crear_cita_dto;
    
    if (!paciente_id && (estado_pago || monto_esperado)) {
      throw new BadRequestException('Las citas sin paciente no pueden tener estado de pago ni monto esperado');
    }

    const horas = horas_aproximadas !== undefined ? horas_aproximadas : 0;
    const minutos = minutos_aproximados !== undefined ? minutos_aproximados : 30;

    const validacion = await this.validarDisponibilidad(cita_data.fecha, horas, minutos);
    
    if (!validacion.disponible) {
      throw new ConflictException(validacion.mensaje_detallado || 'Conflicto de horario');
    }

    const nueva_cita = this.cita_repositorio.create({
      ...cita_data,
      horas_aproximadas: horas,
      minutos_aproximados: minutos,
    });

    if (paciente_id) {
      nueva_cita.paciente = { id: paciente_id } as Paciente;
      nueva_cita.estado_pago = estado_pago || 'pendiente';
      nueva_cita.monto_esperado = monto_esperado || 0;
    }

    if (plan_tratamiento_id) {
      nueva_cita.plan_tratamiento = { id: plan_tratamiento_id } as PlanTratamiento;
    }

    return this.cita_repositorio.save(nueva_cita);
  }

  async obtenerCitasPorMes(mes: number, ano: number): Promise<Cita[]> {
    const primer_dia = new Date(ano, mes - 1, 1);
    const ultimo_dia = new Date(ano, mes, 0, 23, 59, 59);

    const where_condition: FindOptionsWhere<Cita> = {
        fecha: Between(primer_dia, ultimo_dia)
    };

    return this.cita_repositorio.find({
        where: where_condition,
        relations: ['paciente', 'plan_tratamiento', 'plan_tratamiento.paciente'],
        order: { fecha: 'ASC' }
    });
  }

  async actualizar(id: number, actualizar_cita_dto: ActualizarCitaDto): Promise<Cita> {
    const cita_actual = await this.cita_repositorio.findOne({
      where: { id },
      relations: ['plan_tratamiento', 'paciente'],
    });

    if (!cita_actual) {
      throw new NotFoundException(`Cita con ID "${id}" no encontrada.`);
    }

    if (!actualizar_cita_dto.paciente_id && cita_actual.paciente === null) {
      if (actualizar_cita_dto.estado_pago || actualizar_cita_dto.monto_esperado) {
        throw new BadRequestException('Las citas sin paciente no pueden tener estado de pago ni monto esperado');
      }
    }

    if (
      actualizar_cita_dto.fecha !== undefined || 
      actualizar_cita_dto.horas_aproximadas !== undefined || 
      actualizar_cita_dto.minutos_aproximados !== undefined
    ) {
      const nueva_fecha = actualizar_cita_dto.fecha || cita_actual.fecha;
      const nuevas_horas = actualizar_cita_dto.horas_aproximadas !== undefined 
        ? actualizar_cita_dto.horas_aproximadas 
        : cita_actual.horas_aproximadas;
      const nuevos_minutos = actualizar_cita_dto.minutos_aproximados !== undefined 
        ? actualizar_cita_dto.minutos_aproximados 
        : cita_actual.minutos_aproximados;
      
      const validacion = await this.validarDisponibilidad(nueva_fecha, nuevas_horas, nuevos_minutos, id);
      
      if (!validacion.disponible) {
        throw new ConflictException(validacion.mensaje_detallado || 'Conflicto de horario');
      }
    }

    const estado_anterior = cita_actual.estado_pago;
    const datos_actualizar: any = {};

    if (actualizar_cita_dto.fecha !== undefined) {
      datos_actualizar.fecha = actualizar_cita_dto.fecha;
    }
    if (actualizar_cita_dto.descripcion !== undefined) {
      datos_actualizar.descripcion = actualizar_cita_dto.descripcion;
    }
    if (actualizar_cita_dto.horas_aproximadas !== undefined) {
      datos_actualizar.horas_aproximadas = actualizar_cita_dto.horas_aproximadas;
    }
    if (actualizar_cita_dto.minutos_aproximados !== undefined) {
      datos_actualizar.minutos_aproximados = actualizar_cita_dto.minutos_aproximados;
    }

    if (actualizar_cita_dto.paciente_id !== undefined) {
      datos_actualizar.paciente = actualizar_cita_dto.paciente_id ? { id: actualizar_cita_dto.paciente_id } as Paciente : null;
      
      if (actualizar_cita_dto.paciente_id) {
        datos_actualizar.estado_pago = actualizar_cita_dto.estado_pago || 'pendiente';
        datos_actualizar.monto_esperado = actualizar_cita_dto.monto_esperado || 0;
      } else {
        datos_actualizar.estado_pago = null;
        datos_actualizar.monto_esperado = null;
      }
    } else if (cita_actual.paciente) {
      if (actualizar_cita_dto.estado_pago !== undefined) {
        datos_actualizar.estado_pago = actualizar_cita_dto.estado_pago;
      }
      if (actualizar_cita_dto.monto_esperado !== undefined) {
        datos_actualizar.monto_esperado = actualizar_cita_dto.monto_esperado;
      }
    }

    if (actualizar_cita_dto.plan_tratamiento_id !== undefined) {
      datos_actualizar.plan_tratamiento = actualizar_cita_dto.plan_tratamiento_id ? { id: actualizar_cita_dto.plan_tratamiento_id } as PlanTratamiento : null;
    }

    const cita = await this.cita_repositorio.preload({
      id,
      ...datos_actualizar
    });

    if (!cita) {
      throw new NotFoundException(`Cita con ID "${id}" no encontrada.`);
    }

    const cita_guardada = await this.cita_repositorio.save(cita);

    const nuevo_estado = cita_guardada.estado_pago;
    const cambio_a_pagado = estado_anterior !== 'pagado' && nuevo_estado === 'pagado';
    const cambio_desde_pagado = estado_anterior === 'pagado' && nuevo_estado !== 'pagado';
    const tiene_paciente = cita_guardada.paciente !== null;
    const tiene_monto = cita_guardada.monto_esperado && cita_guardada.monto_esperado > 0;

    if (cambio_a_pagado && tiene_paciente && tiene_monto) {
      await this.finanzas_servicio.registrarPago({
        cita_id: id,
        fecha: new Date(),
        monto: Number(cita_guardada.monto_esperado),
        concepto: `Pago automático de cita: ${cita_guardada.descripcion}`,
      });
    }

    if (cambio_desde_pagado && tiene_paciente) {
      await this.finanzas_servicio.eliminarPagosPorCita(id);
    }

    const cita_actualizada = await this.cita_repositorio.findOne({
      where: { id },
      relations: ['paciente', 'plan_tratamiento', 'plan_tratamiento.paciente'],
    });

    if (!cita_actualizada) {
      throw new NotFoundException(`Cita con ID "${id}" no encontrada después de actualizar.`);
    }

    return cita_actualizada;
  }

  async eliminar(id: number): Promise<void> {
    const resultado = await this.cita_repositorio.delete(id);
    if (resultado.affected === 0) {
      throw new NotFoundException(`Cita con ID "${id}" no encontrada.`);
    }
  }

  async obtenerCitasSinPagar(): Promise<Cita[]> {
    return this.cita_repositorio.find({
      where: [
        { estado_pago: 'pendiente' },
        { estado_pago: 'cancelado' }
      ],
      relations: ['paciente', 'plan_tratamiento'],
      order: { fecha: 'DESC' }
    });
  }

  async obtenerCitasSinPago(): Promise<Cita[]> {
    return this.cita_repositorio
      .createQueryBuilder('cita')
      .leftJoinAndSelect('cita.paciente', 'paciente')
      .leftJoinAndSelect('cita.plan_tratamiento', 'plan_tratamiento')
      .where('cita.paciente IS NOT NULL')
      .andWhere('cita.estado_pago != :estado', { estado: 'pagado' })
      .orderBy('cita.fecha', 'DESC')
      .getMany();
  }
}