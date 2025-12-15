import { Injectable, NotFoundException, Inject, BadRequestException, forwardRef, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, FindOptionsWhere, LessThanOrEqual, MoreThanOrEqual, Not } from 'typeorm';
import { Cita } from './entidades/cita.entidad';
import { CrearCitaDto } from './dto/crear-cita.dto';
import { ActualizarCitaDto } from './dto/actualizar-cita.dto';
import { Paciente } from '../pacientes/entidades/paciente.entidad';
import { PlanTratamiento } from '../tratamientos/entidades/plan-tratamiento.entidad';
import { FinanzasServicio } from '../finanzas/finanzas.servicio';
import { InventarioServicio } from '../inventario/inventario.servicio';
import { Usuario } from '../usuarios/entidades/usuario.entidad';

@Injectable()
export class AgendaServicio {
  constructor(
    @InjectRepository(Cita)
    private readonly cita_repositorio: Repository<Cita>,
    @Inject(forwardRef(() => FinanzasServicio))
    private readonly finanzas_servicio: FinanzasServicio,
    @Inject(forwardRef(() => InventarioServicio))
    private readonly inventario_servicio: InventarioServicio,
  ) { }

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
    usuario_id: number,
    fecha: Date,
    horas: number = 0,
    minutos: number = 30,
    cita_id_excluir?: number
  ): Promise<{ disponible: boolean; citas_conflicto: Cita[]; mensaje_detallado?: string }> {
    const ahora = new Date();
    const fecha_cita = new Date(fecha);
    if (!cita_id_excluir && fecha_cita < ahora) {
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
      fecha: Between(fecha_inicio_busqueda, fecha_fin_busqueda),
      usuario: { id: usuario_id }
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
        cita_existente.horas_aproximadas,
        cita_existente.minutos_aproximados
      );

      const duracion_existente_valida = Math.max(1, duracion_existente);

      const fecha_fin_existente = new Date(fecha_inicio_existente);
      fecha_fin_existente.setMinutes(fecha_fin_existente.getMinutes() + duracion_existente_valida);

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

  async crear(usuario_id: number, crear_cita_dto: CrearCitaDto): Promise<Cita> {
    const {
      paciente_id,
      plan_tratamiento_id,
      estado_pago,
      monto_esperado,
      horas_aproximadas,
      minutos_aproximados,
      consumibles,
      activos_fijos,
      modo_estricto,
      ...cita_data
    } = crear_cita_dto;

    if (!paciente_id && (estado_pago || monto_esperado)) {
      throw new BadRequestException('Las citas sin paciente no pueden tener estado de pago ni monto esperado');
    }

    if (!paciente_id && ((consumibles && consumibles.length > 0) || (activos_fijos && activos_fijos.length > 0))) {
      throw new BadRequestException('Las citas sin paciente no pueden tener reservas de recursos');
    }

    const horas = horas_aproximadas !== undefined ? horas_aproximadas : 0;
    const minutos = minutos_aproximados !== undefined ? minutos_aproximados : 30;

    const validacion = await this.validarDisponibilidad(usuario_id, cita_data.fecha, horas, minutos);

    if (!validacion.disponible) {
      throw new ConflictException(validacion.mensaje_detallado || 'Conflicto de horario');
    }

    const fecha_inicio = new Date(cita_data.fecha);
    const fecha_fin = new Date(fecha_inicio);
    fecha_fin.setHours(fecha_fin.getHours() + horas);
    fecha_fin.setMinutes(fecha_fin.getMinutes() + minutos);
    if (consumibles && consumibles.length > 0 && modo_estricto) {
      for (const consumible of consumibles) {
        const { disponible, stock_disponible, mensaje } = await this.inventario_servicio.reservas.validarDisponibilidadMaterial(
          consumible.material_id,
          consumible.cantidad,
          true
        );
        if (!disponible) {
          throw new BadRequestException(mensaje || `Stock insuficiente para material ${consumible.material_id}. Disponible: ${stock_disponible}`);
        }
      }
    }

    if (activos_fijos && activos_fijos.length > 0) {
      for (const activo of activos_fijos) {
        const { disponible, conflictos } = await this.inventario_servicio.reservas.verificarDisponibilidadActivoGlobal(
          activo.activo_id,
          fecha_inicio,
          fecha_fin
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
            throw new BadRequestException(`El activo ${activo.activo_id} no está disponible`);
          }
        }
      }
    }

    const nueva_cita = this.cita_repositorio.create({
      ...cita_data,
      horas_aproximadas: horas,
      minutos_aproximados: minutos,
      usuario: { id: usuario_id } as Usuario,
    });

    if (paciente_id) {
      nueva_cita.paciente = { id: paciente_id } as Paciente;
      nueva_cita.estado_pago = estado_pago || 'pendiente';
      nueva_cita.monto_esperado = monto_esperado || 0;
    }

    if (plan_tratamiento_id) {
      nueva_cita.plan_tratamiento = { id: plan_tratamiento_id } as PlanTratamiento;
    }

    const cita_guardada = await this.cita_repositorio.save(nueva_cita);
    if (consumibles && consumibles.length > 0) {
      for (const consumible of consumibles) {
        try {
          await this.inventario_servicio.reservas.reservarMaterialCita(
            consumible.material_id,
            cita_guardada,
            consumible.cantidad,
            usuario_id
          );
        } catch (error) {
          if (modo_estricto) {
            throw error;
          }
          console.warn(`No se pudo reservar material ${consumible.material_id}:`, error.message);
        }
      }
    }

    if (activos_fijos && activos_fijos.length > 0) {
      for (const activo of activos_fijos) {
        await this.inventario_servicio.reservas.reservarActivoCitaGlobal(
          activo.activo_id,
          cita_guardada,
          fecha_inicio,
          fecha_fin,
          usuario_id
        );
      }
    }

    return cita_guardada;
  }

  async obtenerCitasPorMes(usuario_id: number, mes: number, ano: number, ligero: boolean = false): Promise<Cita[]> {
    const primer_dia = new Date(ano, mes - 1, 1);
    const ultimo_dia = new Date(ano, mes, 0, 23, 59, 59);

    const where_condition: FindOptionsWhere<Cita> = {
      fecha: Between(primer_dia, ultimo_dia),
      usuario: { id: usuario_id }
    };

    if (ligero) {
      return this.cita_repositorio.find({
        where: where_condition,
        relations: ['paciente'],
        select: {
          id: true,
          fecha: true,
          descripcion: true,
          estado_pago: true,
          monto_esperado: true,
          horas_aproximadas: true,
          minutos_aproximados: true,
          materiales_confirmados: true,
          paciente: {
            id: true,
            nombre: true,
            apellidos: true
          }
        },
        order: { fecha: 'ASC' }
      });
    }

    return this.cita_repositorio.find({
      where: where_condition,
      relations: ['paciente', 'plan_tratamiento', 'plan_tratamiento.paciente'],
      order: { fecha: 'ASC' }
    });
  }

  async actualizar(usuario_id: number, id: number, actualizar_cita_dto: ActualizarCitaDto): Promise<Cita> {
    const cita_actual = await this.cita_repositorio.findOne({
      where: { id, usuario: { id: usuario_id } },
      relations: ['plan_tratamiento', 'paciente'],
    });

    if (!cita_actual) {
      throw new NotFoundException(`Cita con ID "${id}" no encontrada o no le pertenece.`);
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

      const validacion = await this.validarDisponibilidad(usuario_id, nueva_fecha, nuevas_horas, nuevos_minutos, id);

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
    if (actualizar_cita_dto.consumibles !== undefined || actualizar_cita_dto.activos_fijos !== undefined) {
      await this.inventario_servicio.reservas.actualizarRecursosCita(
        cita_guardada,
        actualizar_cita_dto.consumibles,
        actualizar_cita_dto.activos_fijos,
        usuario_id,
        actualizar_cita_dto.modo_estricto
      );
    }

    const nuevo_estado = cita_guardada.estado_pago;
    const cambio_a_pagado = estado_anterior !== 'pagado' && nuevo_estado === 'pagado';
    const cambio_desde_pagado = estado_anterior === 'pagado' && nuevo_estado !== 'pagado';
    const tiene_paciente = cita_guardada.paciente !== null;
    const tiene_monto = cita_guardada.monto_esperado && cita_guardada.monto_esperado > 0;

    if (cambio_a_pagado && tiene_paciente && tiene_monto) {
      await this.finanzas_servicio.registrarPago(usuario_id, {
        cita_id: id,
        fecha: new Date(),
        monto: Number(cita_guardada.monto_esperado),
        concepto: `Pago automático de cita: ${cita_guardada.descripcion}`,
      });
    }

    if (cambio_desde_pagado && tiene_paciente) {
      await this.finanzas_servicio.eliminarPagosPorCita(usuario_id, id);
    }

    const cita_actualizada = await this.cita_repositorio.findOne({
      where: { id, usuario: { id: usuario_id } },
      relations: ['paciente', 'plan_tratamiento', 'plan_tratamiento.paciente'],
    });

    if (!cita_actualizada) {
      throw new NotFoundException(`Cita con ID "${id}" no encontrada después de actualizar.`);
    }

    return cita_actualizada;
  }

  async eliminar(usuario_id: number, id: number): Promise<void> {
    const cita = await this.cita_repositorio.findOne({ where: { id, usuario: { id: usuario_id } } });
    if (!cita) {
      throw new NotFoundException(`Cita con ID "${id}" no encontrada o no le pertenece.`);
    }
    await this.inventario_servicio.reservas.cancelarReservasMaterialesCita(id);
    await this.inventario_servicio.reservas.cancelarReservasActivosCita(id);

    await this.finanzas_servicio.eliminarPagosPorCita(usuario_id, id);

    await this.cita_repositorio.softDelete({ id, usuario: { id: usuario_id } });
  }

  async obtenerCitasSinPagar(usuario_id: number): Promise<Cita[]> {
    return this.cita_repositorio.find({
      where: [
        { estado_pago: 'pendiente', usuario: { id: usuario_id } },
        { estado_pago: 'cancelado', usuario: { id: usuario_id } }
      ],
      relations: ['paciente', 'plan_tratamiento'],
      order: { fecha: 'DESC' }
    });
  }

  async obtenerCitasSinPago(usuario_id: number): Promise<Cita[]> {
    return this.cita_repositorio
      .createQueryBuilder('cita')
      .leftJoinAndSelect('cita.paciente', 'paciente')
      .leftJoinAndSelect('cita.plan_tratamiento', 'plan_tratamiento')
      .where('cita.paciente IS NOT NULL')
      .andWhere('cita.estado_pago != :estado', { estado: 'pagado' })
      .andWhere('cita.usuario.id = :usuario_id', { usuario_id })
      .orderBy('cita.fecha', 'DESC')
      .getMany();
  }

  async obtenerPorId(usuario_id: number, id: number): Promise<Cita> {
    const cita = await this.cita_repositorio.findOne({
      where: { id, usuario: { id: usuario_id } },
      relations: [
        'paciente', 
        'plan_tratamiento',
        'reservas_materiales',
        'reservas_materiales.material',
        'reservas_materiales.material.producto',
        'reservas_materiales.material.producto.inventario',
        'reservas_activos',
        'reservas_activos.activo',
        'reservas_activos.activo.producto',
        'reservas_activos.activo.producto.inventario'
      ],
    });

    if (!cita) {
      throw new NotFoundException(`Cita con ID "${id}" no encontrada o no le pertenece.`);
    }

    return cita;
  }

  async obtenerPorIdCompleto(usuario_id: number, id: number): Promise<Cita> {
    const cita = await this.cita_repositorio.findOne({
      where: { id, usuario: { id: usuario_id } },
      relations: [
        'paciente', 
        'plan_tratamiento', 
        'plan_tratamiento.paciente',
        'reservas_materiales',
        'reservas_materiales.material',
        'reservas_materiales.material.producto',
        'reservas_materiales.material.producto.inventario',
        'reservas_activos',
        'reservas_activos.activo',
        'reservas_activos.activo.producto',
        'reservas_activos.activo.producto.inventario'
      ],
    });

    if (!cita) {
      throw new NotFoundException(`Cita con ID "${id}" no encontrada o no le pertenece.`);
    }

    return cita;
  }

  async obtenerEspaciosLibres(
    usuario_id: number,
    mes: number,
    ano: number,
    fecha_inicio_filtro?: Date,
    fecha_fin_filtro?: Date
  ): Promise<any[]> {
    const ahora = new Date();
    ahora.setHours(0, 0, 0, 0);

    const primer_dia = new Date(ano, mes - 1, 1);
    const ultimo_dia = new Date(ano, mes, 0, 23, 59, 59);

    let fecha_inicio_busqueda: Date;

    if (fecha_inicio_filtro && fecha_fin_filtro) {
      fecha_inicio_busqueda = fecha_inicio_filtro < primer_dia ? primer_dia : fecha_inicio_filtro;
    } else {
      fecha_inicio_busqueda = primer_dia < ahora ? ahora : primer_dia;
    }

    const citas_mes = await this.cita_repositorio.find({
      where: {
        fecha: Between(primer_dia, ultimo_dia),
        usuario: { id: usuario_id }
      },
      order: { fecha: 'ASC' }
    });

    const espacios_libres: any[] = [];
    let fecha_actual = new Date(fecha_inicio_busqueda);
    fecha_actual.setHours(0, 0, 0, 0);

    while (fecha_actual <= ultimo_dia) {
      const inicio_dia = new Date(fecha_actual);
      inicio_dia.setHours(0, 0, 0, 0);

      const fin_dia = new Date(fecha_actual);
      fin_dia.setHours(23, 59, 59, 999);

      const citas_del_dia = citas_mes.filter(cita => {
        const fecha_cita = new Date(cita.fecha);
        return fecha_cita.toDateString() === fecha_actual.toDateString();
      });

      if (citas_del_dia.length === 0) {
        const duracion_ms = fin_dia.getTime() - inicio_dia.getTime();
        const duracion_minutos = Math.floor(duracion_ms / 60000);

        if (duracion_minutos > 0) {
          espacios_libres.push({
            fecha: new Date(inicio_dia),
            duracion_minutos: duracion_minutos,
            horas_aproximadas: Math.floor(duracion_minutos / 60),
            minutos_aproximados: duracion_minutos % 60,
            descripcion: `Espacio libre - ${Math.floor(duracion_minutos / 60)}h ${duracion_minutos % 60}m`,
          });
        }
      } else {
        const eventos: Array<{ fecha: Date; tipo: 'inicio' | 'fin'; cita_id: number }> = [];

        citas_del_dia.forEach(cita => {
          const fecha_inicio = new Date(cita.fecha);
          const duracion_cita = this.calcularDuracionEnMinutos(
            cita.horas_aproximadas,
            cita.minutos_aproximados
          );
          const fecha_fin = new Date(fecha_inicio.getTime() + duracion_cita * 60000);

          eventos.push({ fecha: fecha_inicio, tipo: 'inicio', cita_id: cita.id });
          eventos.push({ fecha: fecha_fin, tipo: 'fin', cita_id: cita.id });
        });

        eventos.sort((a, b) => a.fecha.getTime() - b.fecha.getTime());

        let hora_libre_inicio = new Date(inicio_dia);

        if (hora_libre_inicio < eventos[0].fecha) {
          const duracion_ms = eventos[0].fecha.getTime() - hora_libre_inicio.getTime();
          const duracion_minutos = Math.floor(duracion_ms / 60000);

          if (duracion_minutos > 0) {
            espacios_libres.push({
              fecha: new Date(hora_libre_inicio),
              duracion_minutos: duracion_minutos,
              horas_aproximadas: Math.floor(duracion_minutos / 60),
              minutos_aproximados: duracion_minutos % 60,
              descripcion: `Espacio libre - ${Math.floor(duracion_minutos / 60)}h ${duracion_minutos % 60}m`,
            });
          }
        }

        let citas_activas = 0;
        let ultima_hora_fin: Date | null = null;

        for (let i = 0; i < eventos.length; i++) {
          const evento = eventos[i];

          if (evento.tipo === 'inicio') {
            citas_activas++;
          } else {
            citas_activas--;
            ultima_hora_fin = evento.fecha;
          }

          if (citas_activas === 0 && ultima_hora_fin) {
            const siguiente_evento = eventos[i + 1];

            if (siguiente_evento) {
              const duracion_ms = siguiente_evento.fecha.getTime() - ultima_hora_fin.getTime();
              const duracion_minutos = Math.floor(duracion_ms / 60000);

              if (duracion_minutos > 0) {
                espacios_libres.push({
                  fecha: new Date(ultima_hora_fin),
                  duracion_minutos: duracion_minutos,
                  horas_aproximadas: Math.floor(duracion_minutos / 60),
                  minutos_aproximados: duracion_minutos % 60,
                  descripcion: `Espacio libre - ${Math.floor(duracion_minutos / 60)}h ${duracion_minutos % 60}m`,
                });
              }
            } else {
              const duracion_ms = fin_dia.getTime() - ultima_hora_fin.getTime();
              const duracion_minutos = Math.floor(duracion_ms / 60000);

              if (duracion_minutos > 0) {
                espacios_libres.push({
                  fecha: new Date(ultima_hora_fin),
                  duracion_minutos: duracion_minutos,
                  horas_aproximadas: Math.floor(duracion_minutos / 60),
                  minutos_aproximados: duracion_minutos % 60,
                  descripcion: `Espacio libre - ${Math.floor(duracion_minutos / 60)}h ${duracion_minutos % 60}m`,
                });
              }
            }
          }
        }
      }

      fecha_actual.setDate(fecha_actual.getDate() + 1);
      fecha_actual.setHours(0, 0, 0, 0);
    }

    return espacios_libres;
  }

  async filtrarCitas(usuario_id: number, fecha_inicio: Date, fecha_fin: Date): Promise<Cita[]> {
    const where_condition: FindOptionsWhere<Cita> = {
      fecha: Between(fecha_inicio, fecha_fin),
      usuario: { id: usuario_id }
    };

    return this.cita_repositorio.find({
      where: where_condition,
      relations: ['paciente', 'plan_tratamiento', 'plan_tratamiento.paciente'],
      order: { fecha: 'ASC' }
    });
  }

  async filtrarEspaciosLibres(usuario_id: number, fecha_inicio: Date, fecha_fin: Date): Promise<any[]> {
    const citas_rango = await this.cita_repositorio.find({
      where: {
        fecha: Between(fecha_inicio, fecha_fin),
        usuario: { id: usuario_id }
      },
      order: { fecha: 'ASC' }
    });

    const espacios_libres: any[] = [];
    let fecha_actual = new Date(fecha_inicio);
    fecha_actual.setHours(0, 0, 0, 0);

    const fecha_fin_normalizada = new Date(fecha_fin);
    fecha_fin_normalizada.setHours(23, 59, 59, 999);

    while (fecha_actual <= fecha_fin_normalizada) {
      const inicio_dia = new Date(fecha_actual);
      inicio_dia.setHours(0, 0, 0, 0);

      const fin_dia = new Date(fecha_actual);
      fin_dia.setHours(23, 59, 59, 999);

      const citas_del_dia = citas_rango.filter(cita => {
        const fecha_cita = new Date(cita.fecha);
        return fecha_cita.toDateString() === fecha_actual.toDateString();
      });

      if (citas_del_dia.length === 0) {
        const duracion_ms = fin_dia.getTime() - inicio_dia.getTime();
        const duracion_minutos = Math.floor(duracion_ms / 60000);

        if (duracion_minutos > 0) {
          espacios_libres.push({
            fecha: new Date(inicio_dia),
            duracion_minutos: duracion_minutos,
            horas_aproximadas: Math.floor(duracion_minutos / 60),
            minutos_aproximados: duracion_minutos % 60,
            descripcion: `Espacio libre - ${Math.floor(duracion_minutos / 60)}h ${duracion_minutos % 60}m`,
          });
        }
      } else {
        const eventos: Array<{ fecha: Date; tipo: 'inicio' | 'fin'; cita_id: number }> = [];

        citas_del_dia.forEach(cita => {
          const fecha_inicio_cita = new Date(cita.fecha);
          const duracion_cita = this.calcularDuracionEnMinutos(
            cita.horas_aproximadas,
            cita.minutos_aproximados
          );
          const fecha_fin_cita = new Date(fecha_inicio_cita.getTime() + duracion_cita * 60000);

          eventos.push({ fecha: fecha_inicio_cita, tipo: 'inicio', cita_id: cita.id });
          eventos.push({ fecha: fecha_fin_cita, tipo: 'fin', cita_id: cita.id });
        });

        eventos.sort((a, b) => a.fecha.getTime() - b.fecha.getTime());

        let hora_libre_inicio = new Date(inicio_dia);

        if (hora_libre_inicio < eventos[0].fecha) {
          const duracion_ms = eventos[0].fecha.getTime() - hora_libre_inicio.getTime();
          const duracion_minutos = Math.floor(duracion_ms / 60000);

          if (duracion_minutos > 0) {
            espacios_libres.push({
              fecha: new Date(hora_libre_inicio),
              duracion_minutos: duracion_minutos,
              horas_aproximadas: Math.floor(duracion_minutos / 60),
              minutos_aproximados: duracion_minutos % 60,
              descripcion: `Espacio libre - ${Math.floor(duracion_minutos / 60)}h ${duracion_minutos % 60}m`,
            });
          }
        }

        let citas_activas = 0;
        let ultima_hora_fin: Date | null = null;

        for (let i = 0; i < eventos.length; i++) {
          const evento = eventos[i];

          if (evento.tipo === 'inicio') {
            citas_activas++;
          } else {
            citas_activas--;
            ultima_hora_fin = evento.fecha;
          }

          if (citas_activas === 0 && ultima_hora_fin) {
            const siguiente_evento = eventos[i + 1];

            if (siguiente_evento) {
              const duracion_ms = siguiente_evento.fecha.getTime() - ultima_hora_fin.getTime();
              const duracion_minutos = Math.floor(duracion_ms / 60000);

              if (duracion_minutos > 0) {
                espacios_libres.push({
                  fecha: new Date(ultima_hora_fin),
                  duracion_minutos: duracion_minutos,
                  horas_aproximadas: Math.floor(duracion_minutos / 60),
                  minutos_aproximados: duracion_minutos % 60,
                  descripcion: `Espacio libre - ${Math.floor(duracion_minutos / 60)}h ${duracion_minutos % 60}m`,
                });
              }
            } else {
              const duracion_ms = fin_dia.getTime() - ultima_hora_fin.getTime();
              const duracion_minutos = Math.floor(duracion_ms / 60000);

              if (duracion_minutos > 0) {
                espacios_libres.push({
                  fecha: new Date(ultima_hora_fin),
                  duracion_minutos: duracion_minutos,
                  horas_aproximadas: Math.floor(duracion_minutos / 60),
                  minutos_aproximados: duracion_minutos % 60,
                  descripcion: `Espacio libre - ${Math.floor(duracion_minutos / 60)}h ${duracion_minutos % 60}m`,
                });
              }
            }
          }
        }
      }

      fecha_actual.setDate(fecha_actual.getDate() + 1);
      fecha_actual.setHours(0, 0, 0, 0);
    }

    return espacios_libres;
  }
}