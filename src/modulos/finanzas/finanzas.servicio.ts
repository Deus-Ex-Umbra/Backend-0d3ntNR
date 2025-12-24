import { Injectable, Inject, forwardRef, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, ILike, Like } from 'typeorm';
import { Egreso } from './entidades/egreso.entidad';
import { Pago } from './entidades/pago.entidad';
import { RegistrarEgresoDto } from './dto/registrar-egreso.dto';
import { RegistrarPagoDto } from './dto/registrar-pago.dto';
import { ActualizarPagoDto } from './dto/actualizar-pago.dto';
import { ActualizarEgresoDto } from './dto/actualizar-egreso.dto';
import { FiltrarAnalisisDto } from './dto/filtrar-analisis.dto';
import { PlanesTratamientoServicio } from '../tratamientos/planes-tratamiento.servicio';
import { Cita } from '../agenda/entidades/cita.entidad';
import { PlanTratamiento } from '../tratamientos/entidades/plan-tratamiento.entidad';
import { Usuario } from '../usuarios/entidades/usuario.entidad';

@Injectable()
export class FinanzasServicio {
  constructor(
    @InjectRepository(Egreso)
    private readonly egreso_repositorio: Repository<Egreso>,
    @InjectRepository(Pago)
    private readonly pago_repositorio: Repository<Pago>,
    @InjectRepository(Cita)
    private readonly cita_repositorio: Repository<Cita>,
    @Inject(forwardRef(() => PlanesTratamientoServicio))
    private readonly planes_servicio: PlanesTratamientoServicio,
  ) { }

  async registrarEgreso(usuario_id: number, registrar_egreso_dto: RegistrarEgresoDto): Promise<Egreso> {
    const nuevo_egreso = this.egreso_repositorio.create({
      concepto: registrar_egreso_dto.concepto,
      fecha: registrar_egreso_dto.fecha,
      monto: registrar_egreso_dto.monto,
      usuario: { id: usuario_id } as Usuario,
    });

    return this.egreso_repositorio.save(nuevo_egreso);
  }

  async actualizarEgreso(usuario_id: number, id: number, actualizar_egreso_dto: ActualizarEgresoDto): Promise<Egreso> {
    const egreso_existente = await this.egreso_repositorio.findOne({ where: { id, usuario: { id: usuario_id } } });

    if (!egreso_existente) {
      throw new NotFoundException('El egreso especificado no existe o no le pertenece.');
    }

    const datos_actualizacion: any = {};
    if (actualizar_egreso_dto.concepto !== undefined) {
      datos_actualizacion.concepto = actualizar_egreso_dto.concepto;
    }
    if (actualizar_egreso_dto.fecha !== undefined) {
      datos_actualizacion.fecha = actualizar_egreso_dto.fecha;
    }
    if (actualizar_egreso_dto.monto !== undefined) {
      datos_actualizacion.monto = actualizar_egreso_dto.monto;
    }

    await this.egreso_repositorio.update(id, datos_actualizacion);

    const updatedEgreso = await this.egreso_repositorio.findOne({ where: { id } });

    if (!updatedEgreso) {
      throw new Error('Unexpected error: Updated egreso not found');
    }

    return updatedEgreso;
  }

  async eliminarEgreso(usuario_id: number, id: number): Promise<void> {
    const egreso = await this.egreso_repositorio.findOne({ where: { id, usuario: { id: usuario_id } } });

    if (!egreso) {
      throw new NotFoundException('El egreso especificado no existe o no le pertenece.');
    }

    await this.egreso_repositorio.remove(egreso);
  }

  async registrarPago(usuario_id: number, registrar_pago_dto: RegistrarPagoDto): Promise<Pago> {
    let cita: Cita | null = null;
    let plan_tratamiento: PlanTratamiento | null = null;

    if (registrar_pago_dto.cita_id) {
      cita = await this.cita_repositorio.findOne({
        where: { id: registrar_pago_dto.cita_id, usuario: { id: usuario_id } },
        relations: ['paciente', 'plan_tratamiento'],
      });

      if (!cita) {
        throw new NotFoundException('La cita especificada no existe o no le pertenece.');
      }

      if (!cita.paciente) {
        throw new BadRequestException('No se puede registrar un pago para una cita sin paciente');
      }

      const pago_existente = await this.pago_repositorio.findOne({
        where: { cita: { id: registrar_pago_dto.cita_id }, usuario: { id: usuario_id } },
      });

      if (pago_existente) {
        throw new ConflictException('Esta cita ya tiene un pago asociado');
      }

      await this.cita_repositorio.update(cita.id, {
        estado_pago: 'pagado',
        monto_esperado: registrar_pago_dto.monto
      });

      plan_tratamiento = cita.plan_tratamiento;
    } else if (registrar_pago_dto.plan_tratamiento_id) {
      plan_tratamiento = await this.planes_servicio.encontrarPlanPorId(usuario_id, registrar_pago_dto.plan_tratamiento_id);
    }

    const datos_pago: any = {
      fecha: registrar_pago_dto.fecha,
      monto: registrar_pago_dto.monto,
      concepto: registrar_pago_dto.concepto,
      usuario: { id: usuario_id } as Usuario,
    };

    if (plan_tratamiento) {
      datos_pago.plan_tratamiento = plan_tratamiento;
    }

    if (cita) {
      datos_pago.cita = cita;
    }

    const nuevo_pago = this.pago_repositorio.create(datos_pago);
    const pago_guardado = (await this.pago_repositorio.save(nuevo_pago)) as unknown as Pago;

    if (plan_tratamiento) {
      await this.planes_servicio.registrarAbono(
        usuario_id,
        plan_tratamiento.id,
        registrar_pago_dto.monto
      );
    }

    return pago_guardado;
  }

  async actualizarPago(usuario_id: number, id: number, actualizar_pago_dto: ActualizarPagoDto): Promise<Pago> {
    const pago_existente = await this.pago_repositorio.findOne({
      where: { id, usuario: { id: usuario_id } },
      relations: ['plan_tratamiento', 'cita'],
    });

    if (!pago_existente) {
      throw new NotFoundException('El pago especificado no existe o no le pertenece.');
    }

    const monto_anterior = Number(pago_existente.monto);
    const monto_nuevo = actualizar_pago_dto.monto
      ? Number(actualizar_pago_dto.monto)
      : monto_anterior;

    if (pago_existente.plan_tratamiento && monto_nuevo !== monto_anterior) {
      await this.planes_servicio.descontarAbono(usuario_id, pago_existente.plan_tratamiento.id, monto_anterior);
      await this.planes_servicio.registrarAbono(usuario_id, pago_existente.plan_tratamiento.id, monto_nuevo);
    }

    if (pago_existente.cita && actualizar_pago_dto.monto !== undefined) {
      await this.cita_repositorio.update(pago_existente.cita.id, {
        monto_esperado: monto_nuevo
      });
    }

    const datos_actualizacion: any = {};
    if (actualizar_pago_dto.fecha !== undefined) {
      datos_actualizacion.fecha = actualizar_pago_dto.fecha;
    }
    if (actualizar_pago_dto.monto !== undefined) {
      datos_actualizacion.monto = actualizar_pago_dto.monto;
    }
    if (actualizar_pago_dto.concepto !== undefined) {
      datos_actualizacion.concepto = actualizar_pago_dto.concepto;
    }

    await this.pago_repositorio.update(id, datos_actualizacion);

    const updatedPago = await this.pago_repositorio.findOne({
      where: { id },
      relations: ['plan_tratamiento', 'cita'],
    });

    if (!updatedPago) {
      throw new Error('Unexpected error: Updated pago not found');
    }

    return updatedPago;
  }

  async eliminarPago(usuario_id: number, id: number): Promise<void> {
    const pago = await this.pago_repositorio.findOne({
      where: { id, usuario: { id: usuario_id } },
      relations: ['plan_tratamiento', 'cita'],
    });

    if (!pago) {
      throw new NotFoundException('El pago especificado no existe o no le pertenece.');
    }

    if (pago.plan_tratamiento) {
      await this.planes_servicio.descontarAbono(usuario_id, pago.plan_tratamiento.id, Number(pago.monto));
    }

    if (pago.cita) {
      await this.cita_repositorio.update(pago.cita.id, {
        estado_pago: 'pendiente',
        monto_esperado: 0
      });
    }

    await this.pago_repositorio.remove(pago);
  }

  async eliminarPagosPorCita(usuario_id: number, cita_id: number): Promise<{ pagos_eliminados: number; monto_total: number }> {
    const pagos = await this.pago_repositorio.find({
      where: { cita: { id: cita_id }, usuario: { id: usuario_id } },
      relations: ['plan_tratamiento'],
    });

    const monto_total = pagos.reduce((sum, pago) => sum + Number(pago.monto), 0);

    for (const pago of pagos) {
      if (pago.plan_tratamiento) {
        await this.planes_servicio.descontarAbono(usuario_id, pago.plan_tratamiento.id, Number(pago.monto));
      }
      await this.pago_repositorio.remove(pago);
    }

    return {
      pagos_eliminados: pagos.length,
      monto_total,
    };
  }

  async generarReporte(usuario_id: number, fecha_inicio_str?: string, fecha_fin_str?: string) {
    const hoy = new Date();
    const fecha_inicio = fecha_inicio_str ? this.parsearFechaLocal(fecha_inicio_str) : new Date(0);
    const fecha_fin = fecha_fin_str ? this.parsearFechaLocal(fecha_fin_str) : hoy;

    if (!fecha_inicio_str) {
      fecha_inicio.setHours(0, 0, 0, 0);
    }
    if (!fecha_fin_str) {
      fecha_fin.setHours(23, 59, 59, 999);
    }

    const pagos = await this.pago_repositorio.find({
      where: { fecha: Between(fecha_inicio, fecha_fin), usuario: { id: usuario_id } },
      relations: ['plan_tratamiento', 'plan_tratamiento.paciente', 'cita', 'cita.paciente'],
    });
    const egresos = await this.egreso_repositorio.find({
      where: { fecha: Between(fecha_inicio, fecha_fin), usuario: { id: usuario_id } },
    });

    const total_ingresos = pagos.reduce((sum, p) => sum + Number(p.monto), 0);
    const total_egresos = egresos.reduce((sum, e) => sum + Number(e.monto), 0);
    const balance = total_ingresos - total_egresos;

    const movimientos = [
      ...pagos.map((p) => ({
        id: p.id,
        tipo: 'ingreso' as const,
        fecha: p.fecha,
        monto: Number(p.monto),
        concepto: p.concepto,
        cita_id: p.cita?.id,
        plan_tratamiento_id: p.plan_tratamiento?.id,
      })),
      ...egresos.map((e) => ({
        id: e.id,
        tipo: 'egreso' as const,
        fecha: e.fecha,
        monto: Number(e.monto),
        concepto: e.concepto,
      })),
    ].sort((a, b) => b.fecha.getTime() - a.fecha.getTime());

    return {
      total_ingresos,
      total_egresos,
      balance,
      movimientos,
    };
  }

  async generarAnalisis(usuario_id: number, filtros: FiltrarAnalisisDto) {
    const fecha_inicio = this.parsearFechaLocal(filtros.fecha_inicio);
    fecha_inicio.setHours(0, 0, 0, 0);

    const fecha_fin = this.parsearFechaLocal(filtros.fecha_fin);
    fecha_fin.setHours(23, 59, 59, 999);
    let pagos = await this.pago_repositorio.find({
      where: { fecha: Between(fecha_inicio, fecha_fin), usuario: { id: usuario_id } },
      relations: ['plan_tratamiento', 'plan_tratamiento.paciente', 'cita', 'cita.paciente'],
    });

    let egresos = await this.egreso_repositorio.find({
      where: { fecha: Between(fecha_inicio, fecha_fin), usuario: { id: usuario_id } },
    });
    if (filtros.glosa && filtros.glosa.trim() !== '') {
      const termino = filtros.glosa.trim();

      if (filtros.sensible_mayusculas) {
        pagos = pagos.filter(p => p.concepto.includes(termino));
        egresos = egresos.filter(e => e.concepto.includes(termino));
      } else {
        const termino_lower = termino.toLowerCase();
        pagos = pagos.filter(p => p.concepto.toLowerCase().includes(termino_lower));
        egresos = egresos.filter(e => e.concepto.toLowerCase().includes(termino_lower));
      }
    }
    const total_ingresos = pagos.reduce((sum, p) => sum + Number(p.monto), 0);
    const total_egresos = egresos.reduce((sum, e) => sum + Number(e.monto), 0);
    const balance = total_ingresos - total_egresos;
    const movimientos = [
      ...pagos.map((p) => ({
        id: p.id,
        tipo: 'ingreso' as const,
        fecha: p.fecha,
        monto: Number(p.monto),
        concepto: p.concepto,
        cita_id: p.cita?.id,
        plan_tratamiento_id: p.plan_tratamiento?.id,
      })),
      ...egresos.map((e) => ({
        id: e.id,
        tipo: 'egreso' as const,
        fecha: e.fecha,
        monto: Number(e.monto),
        concepto: e.concepto,
      })),
    ].sort((a, b) => b.fecha.getTime() - a.fecha.getTime());
    const nivel = filtros.nivel_precision || 'equilibrio';
    const config_granularidad = this.calcularGranularidadAnalisis(fecha_inicio, fecha_fin, nivel);
    const datos_grafico = this.agruparDatosConIntervalo(pagos, egresos, config_granularidad, fecha_inicio, fecha_fin);

    return {
      total_ingresos,
      total_egresos,
      balance,
      movimientos,
      datos_grafico,
      granularidad: config_granularidad.etiqueta,
    };
  }

  private calcularGranularidadAnalisis(
    fecha_inicio: Date,
    fecha_fin: Date,
    nivel: 'alta' | 'equilibrio' | 'global'
  ): { minutos: number; etiqueta: string } {
    const diferencia_ms = fecha_fin.getTime() - fecha_inicio.getTime();
    const dias = Math.ceil(diferencia_ms / (1000 * 60 * 60 * 24));
    if (dias <= 1) {
      if (nivel === 'alta') return { minutos: 30, etiqueta: 'Cada 30 min' };
      if (nivel === 'equilibrio') return { minutos: 60, etiqueta: 'Cada 1 hora' };
      return { minutos: 240, etiqueta: 'Cada 4 horas' };
    }
    if (dias <= 3) {
      if (nivel === 'alta') return { minutos: 60, etiqueta: 'Cada 1 hora' };
      if (nivel === 'equilibrio') return { minutos: 120, etiqueta: 'Cada 2 horas' };
      return { minutos: 360, etiqueta: 'Cada 6 horas' };
    }
    if (dias <= 7) {
      if (nivel === 'alta') return { minutos: 240, etiqueta: 'Cada 4 horas' };
      if (nivel === 'equilibrio') return { minutos: 480, etiqueta: 'Cada 8 horas' };
      return { minutos: 720, etiqueta: 'Cada 12 horas' };
    }
    if (dias <= 21) {
      if (nivel === 'alta') return { minutos: 720, etiqueta: 'AM/PM' };
      if (nivel === 'equilibrio') return { minutos: 1440, etiqueta: 'Diario' };
      return { minutos: 2880, etiqueta: 'Cada 2 días' };
    }
    if (dias <= 90) {
      if (nivel === 'alta') return { minutos: 1440, etiqueta: 'Diario' };
      if (nivel === 'equilibrio') return { minutos: 4320, etiqueta: 'Cada 3 días' };
      return { minutos: 10080, etiqueta: 'Semanal' };
    }
    if (dias <= 365) {
      if (nivel === 'alta') return { minutos: 10080, etiqueta: 'Semanal' };
      if (nivel === 'equilibrio') return { minutos: 20160, etiqueta: 'Quincenal' };
      return { minutos: 43200, etiqueta: 'Mensual' };
    }
    if (dias <= 1825) {
      if (nivel === 'alta') return { minutos: 43200, etiqueta: 'Mensual' };
      if (nivel === 'equilibrio') return { minutos: 129600, etiqueta: 'Trimestral' };
      return { minutos: 259200, etiqueta: 'Semestral' };
    }
    if (nivel === 'alta') return { minutos: 259200, etiqueta: 'Semestral' };
    return { minutos: 525600, etiqueta: 'Anual' };
  }

  private agruparDatosConIntervalo(
    pagos: Pago[],
    egresos: Egreso[],
    config: { minutos: number; etiqueta: string },
    fecha_inicio: Date,
    fecha_fin: Date
  ) {
    const datos: any[] = [];
    const minutos = config.minutos;
    const meses_cortos = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    if (minutos >= 43200) {
      return this.agruparPorPeriodosGrandes(pagos, egresos, config, fecha_inicio, fecha_fin);
    }

    const intervalo_ms = minutos * 60 * 1000;
    const fecha_actual = new Date(fecha_inicio);

    while (fecha_actual <= fecha_fin) {
      const periodo_inicio = new Date(fecha_actual);
      const periodo_fin = new Date(fecha_actual.getTime() + intervalo_ms - 1);

      const ingresos = pagos
        .filter(p => {
          const fecha_pago = new Date(p.fecha);
          return fecha_pago >= periodo_inicio && fecha_pago <= periodo_fin;
        })
        .reduce((sum, p) => sum + Number(p.monto), 0);

      const egresos_monto = egresos
        .filter(e => {
          const fecha_egreso = new Date(e.fecha);
          return fecha_egreso >= periodo_inicio && fecha_egreso <= periodo_fin;
        })
        .reduce((sum, e) => sum + Number(e.monto), 0);
      let etiqueta = '';
      if (minutos < 60) {
        etiqueta = `${periodo_inicio.getDate().toString().padStart(2, '0')} ${periodo_inicio.getHours().toString().padStart(2, '0')}:${periodo_inicio.getMinutes().toString().padStart(2, '0')}`;
      } else if (minutos < 1440) {
        etiqueta = `${periodo_inicio.getDate().toString().padStart(2, '0')} ${periodo_inicio.getHours().toString().padStart(2, '0')}:00`;
      } else if (minutos === 1440) {
        etiqueta = `${periodo_inicio.getDate()}/${(periodo_inicio.getMonth() + 1).toString().padStart(2, '0')}`;
      } else if (minutos < 10080) {
        const dia_fin = Math.min(periodo_fin.getDate(), new Date(periodo_fin.getFullYear(), periodo_fin.getMonth() + 1, 0).getDate());
        etiqueta = `${periodo_inicio.getDate()}-${dia_fin} ${meses_cortos[periodo_inicio.getMonth()]}`;
      } else {
        const num_semana = Math.ceil((periodo_inicio.getDate()) / 7);
        etiqueta = `S${num_semana} ${meses_cortos[periodo_inicio.getMonth()]}`;
      }
      datos.push({ periodo: etiqueta, ingresos, egresos: egresos_monto });
      fecha_actual.setTime(fecha_actual.getTime() + intervalo_ms);
    }

    return datos;
  }

  private agruparPorPeriodosGrandes(
    pagos: Pago[],
    egresos: Egreso[],
    config: { minutos: number; etiqueta: string },
    fecha_inicio: Date,
    fecha_fin: Date
  ) {
    const datos: any[] = [];
    const meses_cortos = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const minutos = config.minutos;

    if (minutos === 43200) {
      const fecha_actual = new Date(fecha_inicio.getFullYear(), fecha_inicio.getMonth(), 1);
      while (fecha_actual <= fecha_fin) {
        const mes_fin = new Date(fecha_actual.getFullYear(), fecha_actual.getMonth() + 1, 0, 23, 59, 59, 999);
        const ingresos = pagos.filter(p => new Date(p.fecha) >= fecha_actual && new Date(p.fecha) <= mes_fin).reduce((s, p) => s + Number(p.monto), 0);
        const egresos_monto = egresos.filter(e => new Date(e.fecha) >= fecha_actual && new Date(e.fecha) <= mes_fin).reduce((s, e) => s + Number(e.monto), 0);
        datos.push({ periodo: `${meses_cortos[fecha_actual.getMonth()]} ${fecha_actual.getFullYear().toString().slice(-2)}`, ingresos, egresos: egresos_monto });
        fecha_actual.setMonth(fecha_actual.getMonth() + 1);
      }
    } else if (minutos === 20160) {
      const fecha_actual = new Date(fecha_inicio);
      let quincena = 1;
      while (fecha_actual <= fecha_fin) {
        const fin_quincena = new Date(fecha_actual);
        fin_quincena.setDate(fin_quincena.getDate() + 14);
        const ingresos = pagos.filter(p => new Date(p.fecha) >= fecha_actual && new Date(p.fecha) < fin_quincena).reduce((s, p) => s + Number(p.monto), 0);
        const egresos_monto = egresos.filter(e => new Date(e.fecha) >= fecha_actual && new Date(e.fecha) < fin_quincena).reduce((s, e) => s + Number(e.monto), 0);
        datos.push({ periodo: `Q${quincena} ${meses_cortos[fecha_actual.getMonth()]}`, ingresos, egresos: egresos_monto });
        fecha_actual.setDate(fecha_actual.getDate() + 15);
        quincena++;
      }
    } else if (minutos === 129600) {
      const fecha_actual = new Date(fecha_inicio.getFullYear(), Math.floor(fecha_inicio.getMonth() / 3) * 3, 1);
      while (fecha_actual <= fecha_fin) {
        const fin_trimestre = new Date(fecha_actual.getFullYear(), fecha_actual.getMonth() + 3, 0, 23, 59, 59, 999);
        const ingresos = pagos.filter(p => new Date(p.fecha) >= fecha_actual && new Date(p.fecha) <= fin_trimestre).reduce((s, p) => s + Number(p.monto), 0);
        const egresos_monto = egresos.filter(e => new Date(e.fecha) >= fecha_actual && new Date(e.fecha) <= fin_trimestre).reduce((s, e) => s + Number(e.monto), 0);
        const trimestre = Math.floor(fecha_actual.getMonth() / 3) + 1;
        datos.push({ periodo: `T${trimestre} ${fecha_actual.getFullYear()}`, ingresos, egresos: egresos_monto });
        fecha_actual.setMonth(fecha_actual.getMonth() + 3);
      }
    } else if (minutos === 259200) {
      const fecha_actual = new Date(fecha_inicio.getFullYear(), fecha_inicio.getMonth() < 6 ? 0 : 6, 1);
      while (fecha_actual <= fecha_fin) {
        const fin_semestre = new Date(fecha_actual.getFullYear(), fecha_actual.getMonth() + 6, 0, 23, 59, 59, 999);
        const ingresos = pagos.filter(p => new Date(p.fecha) >= fecha_actual && new Date(p.fecha) <= fin_semestre).reduce((s, p) => s + Number(p.monto), 0);
        const egresos_monto = egresos.filter(e => new Date(e.fecha) >= fecha_actual && new Date(e.fecha) <= fin_semestre).reduce((s, e) => s + Number(e.monto), 0);
        const semestre = fecha_actual.getMonth() < 6 ? 1 : 2;
        datos.push({ periodo: `S${semestre} ${fecha_actual.getFullYear()}`, ingresos, egresos: egresos_monto });
        fecha_actual.setMonth(fecha_actual.getMonth() + 6);
      }
    } else {
      for (let anio = fecha_inicio.getFullYear(); anio <= fecha_fin.getFullYear(); anio++) {
        const ingresos = pagos.filter(p => new Date(p.fecha).getFullYear() === anio).reduce((s, p) => s + Number(p.monto), 0);
        const egresos_monto = egresos.filter(e => new Date(e.fecha).getFullYear() === anio).reduce((s, e) => s + Number(e.monto), 0);
        datos.push({ periodo: anio.toString(), ingresos, egresos: egresos_monto });
      }
    }

    return datos;
  }

  private calcularGranularidad(fecha_inicio: Date, fecha_fin: Date): 'hora' | 'dia' | 'semana' | 'mes' | 'ano' {
    const diferencia_ms = fecha_fin.getTime() - fecha_inicio.getTime();
    const dias = Math.ceil(diferencia_ms / (1000 * 60 * 60 * 24));

    if (dias <= 5) return 'hora';
    if (dias <= 70) return 'dia';
    if (dias <= 546) return 'semana';
    if (dias <= 1825) return 'mes';
    return 'ano';
  }

  private agruparDatosAnalisis(
    pagos: Pago[],
    egresos: Egreso[],
    granularidad: 'hora' | 'dia' | 'semana' | 'mes' | 'ano',
    fecha_inicio: Date,
    fecha_fin: Date
  ) {
    const datos: any[] = [];

    if (granularidad === 'hora') {
      const dias_diferencia = Math.ceil((fecha_fin.getTime() - fecha_inicio.getTime()) / (1000 * 60 * 60 * 24));
      const intervalo_horas = dias_diferencia > 3 ? 2 : 1;
      const fecha_actual = new Date(fecha_inicio);
      while (fecha_actual <= fecha_fin) {
        const hora_inicio = new Date(fecha_actual);
        const hora_fin = new Date(fecha_actual);
        hora_fin.setHours(hora_fin.getHours() + intervalo_horas);

        const ingresos = pagos
          .filter(p => {
            const fecha_pago = new Date(p.fecha);
            return fecha_pago >= hora_inicio && fecha_pago < hora_fin;
          })
          .reduce((sum, p) => sum + Number(p.monto), 0);

        const egresos_monto = egresos
          .filter(e => {
            const fecha_egreso = new Date(e.fecha);
            return fecha_egreso >= hora_inicio && fecha_egreso < hora_fin;
          })
          .reduce((sum, e) => sum + Number(e.monto), 0);

        const dia_str = hora_inicio.getDate().toString().padStart(2, '0');
        const hora_str = hora_inicio.getHours().toString().padStart(2, '0');

        datos.push({
          periodo: `${dia_str} ${hora_str}:00`,
          ingresos,
          egresos: egresos_monto,
        });

        fecha_actual.setHours(fecha_actual.getHours() + intervalo_horas);
      }
    } else if (granularidad === 'dia') {
      const fecha_actual = new Date(fecha_inicio);
      while (fecha_actual <= fecha_fin) {
        const dia_inicio = new Date(fecha_actual);
        dia_inicio.setHours(0, 0, 0, 0);
        const dia_fin = new Date(fecha_actual);
        dia_fin.setHours(23, 59, 59, 999);

        const ingresos = pagos
          .filter(p => {
            const fecha_pago = new Date(p.fecha);
            return fecha_pago >= dia_inicio && fecha_pago <= dia_fin;
          })
          .reduce((sum, p) => sum + Number(p.monto), 0);

        const egresos_monto = egresos
          .filter(e => {
            const fecha_egreso = new Date(e.fecha);
            return fecha_egreso >= dia_inicio && fecha_egreso <= dia_fin;
          })
          .reduce((sum, e) => sum + Number(e.monto), 0);

        const dia_str = fecha_actual.getDate().toString();
        const mes_str = (fecha_actual.getMonth() + 1).toString().padStart(2, '0');

        datos.push({
          periodo: `${dia_str}/${mes_str}`,
          ingresos,
          egresos: egresos_monto,
        });

        fecha_actual.setDate(fecha_actual.getDate() + 1);
      }
    } else if (granularidad === 'semana') {

      const fecha_actual = new Date(fecha_inicio);
      let num_semana = 1;

      while (fecha_actual <= fecha_fin) {
        const semana_inicio = new Date(fecha_actual);
        const semana_fin = new Date(fecha_actual);
        semana_fin.setDate(semana_fin.getDate() + 6);
        semana_fin.setHours(23, 59, 59, 999);

        const ingresos = pagos
          .filter(p => {
            const fecha_pago = new Date(p.fecha);
            return fecha_pago >= semana_inicio && fecha_pago <= semana_fin;
          })
          .reduce((sum, p) => sum + Number(p.monto), 0);

        const egresos_monto = egresos
          .filter(e => {
            const fecha_egreso = new Date(e.fecha);
            return fecha_egreso >= semana_inicio && fecha_egreso <= semana_fin;
          })
          .reduce((sum, e) => sum + Number(e.monto), 0);

        const mes_corto = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

        datos.push({
          periodo: `S${num_semana} ${mes_corto[semana_inicio.getMonth()]}`,
          ingresos,
          egresos: egresos_monto,
        });

        fecha_actual.setDate(fecha_actual.getDate() + 7);
        num_semana++;
      }
    } else if (granularidad === 'mes') {
      const meses_nombres = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      const fecha_actual = new Date(fecha_inicio.getFullYear(), fecha_inicio.getMonth(), 1);

      while (fecha_actual <= fecha_fin) {
        const mes_inicio = new Date(fecha_actual);
        const mes_fin = new Date(fecha_actual.getFullYear(), fecha_actual.getMonth() + 1, 0, 23, 59, 59, 999);

        const ingresos = pagos
          .filter(p => {
            const fecha_pago = new Date(p.fecha);
            return fecha_pago >= mes_inicio && fecha_pago <= mes_fin;
          })
          .reduce((sum, p) => sum + Number(p.monto), 0);

        const egresos_monto = egresos
          .filter(e => {
            const fecha_egreso = new Date(e.fecha);
            return fecha_egreso >= mes_inicio && fecha_egreso <= mes_fin;
          })
          .reduce((sum, e) => sum + Number(e.monto), 0);

        datos.push({
          periodo: `${meses_nombres[fecha_actual.getMonth()]} ${fecha_actual.getFullYear().toString().slice(-2)}`,
          ingresos,
          egresos: egresos_monto,
        });

        fecha_actual.setMonth(fecha_actual.getMonth() + 1);
      }
    } else {
      const anio_inicio = fecha_inicio.getFullYear();
      const anio_fin = fecha_fin.getFullYear();

      for (let anio = anio_inicio; anio <= anio_fin; anio++) {
        const ingresos = pagos
          .filter(p => new Date(p.fecha).getFullYear() === anio)
          .reduce((sum, p) => sum + Number(p.monto), 0);

        const egresos_monto = egresos
          .filter(e => new Date(e.fecha).getFullYear() === anio)
          .reduce((sum, e) => sum + Number(e.monto), 0);

        datos.push({
          periodo: anio.toString(),
          ingresos,
          egresos: egresos_monto,
        });
      }
    }

    return datos;
  }

  async obtenerDatosGrafico(usuario_id: number, tipo: 'dia' | 'mes' | 'ano', fecha_referencia?: string) {
    const fecha_ref = fecha_referencia ? this.parsearFechaLocal(fecha_referencia) : new Date();
    let fecha_inicio: Date;
    let fecha_fin: Date;
    let formato_agrupacion: string;

    switch (tipo) {
      case 'dia':
        fecha_inicio = new Date(fecha_ref);
        fecha_inicio.setHours(0, 0, 0, 0);
        fecha_fin = new Date(fecha_ref);
        fecha_fin.setHours(23, 59, 59, 999);
        formato_agrupacion = 'hora';
        break;
      case 'mes':
        fecha_inicio = new Date(fecha_ref.getFullYear(), fecha_ref.getMonth(), 1);
        fecha_fin = new Date(fecha_ref.getFullYear(), fecha_ref.getMonth() + 1, 0, 23, 59, 59, 999);
        formato_agrupacion = 'dia';
        break;
      case 'ano':
        fecha_inicio = new Date(fecha_ref.getFullYear(), 0, 1);
        fecha_fin = new Date(fecha_ref.getFullYear(), 11, 31, 23, 59, 59, 999);
        formato_agrupacion = 'semana';
        break;
    }

    const pagos = await this.pago_repositorio.find({
      where: { fecha: Between(fecha_inicio, fecha_fin), usuario: { id: usuario_id } },
    });

    const egresos = await this.egreso_repositorio.find({
      where: { fecha: Between(fecha_inicio, fecha_fin), usuario: { id: usuario_id } },
    });

    const datos_agrupados = this.agruparDatos(pagos, egresos, tipo, fecha_inicio, fecha_fin);

    return datos_agrupados;
  }

  private parsearFechaLocal(fecha_string: string): Date {
    const [fecha_parte, hora_parte] = fecha_string.split('T');
    const [anio, mes, dia] = fecha_parte.split('-').map(Number);
    const [hora, minuto, segundo] = (hora_parte || '00:00:00').split(':').map(Number);

    return new Date(anio, mes - 1, dia, hora || 0, minuto || 0, segundo || 0);
  }

  private agruparDatos(pagos: Pago[], egresos: Egreso[], tipo: string, fecha_inicio: Date, fecha_fin: Date) {
    const datos: any[] = [];

    if (tipo === 'dia') {
      for (let hora = 0; hora < 24; hora++) {
        const ingresos = pagos
          .filter(p => new Date(p.fecha).getHours() === hora)
          .reduce((sum, p) => sum + Number(p.monto), 0);

        const egresos_monto = egresos
          .filter(e => new Date(e.fecha).getHours() === hora)
          .reduce((sum, e) => sum + Number(e.monto), 0);

        datos.push({
          periodo: `${hora.toString().padStart(2, '0')}:00`,
          ingresos,
          egresos: egresos_monto,
        });
      }
    } else if (tipo === 'mes') {
      const dias_en_mes = new Date(fecha_fin.getFullYear(), fecha_fin.getMonth() + 1, 0).getDate();

      for (let dia = 1; dia <= dias_en_mes; dia++) {
        const ingresos = pagos
          .filter(p => new Date(p.fecha).getDate() === dia)
          .reduce((sum, p) => sum + Number(p.monto), 0);

        const egresos_monto = egresos
          .filter(e => new Date(e.fecha).getDate() === dia)
          .reduce((sum, e) => sum + Number(e.monto), 0);

        datos.push({
          periodo: dia.toString(),
          ingresos,
          egresos: egresos_monto,
        });
      }
    } else if (tipo === 'ano') {
      const meses_nombres = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

      for (let mes = 0; mes < 12; mes++) {
        const ingresos = pagos
          .filter(p => new Date(p.fecha).getMonth() === mes)
          .reduce((sum, p) => sum + Number(p.monto), 0);

        const egresos_monto = egresos
          .filter(e => new Date(e.fecha).getMonth() === mes)
          .reduce((sum, e) => sum + Number(e.monto), 0);

        datos.push({
          periodo: meses_nombres[mes],
          ingresos,
          egresos: egresos_monto,
        });
      }
    }

    return datos;
  }
}