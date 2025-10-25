import { Injectable, Inject, forwardRef, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Egreso } from './entidades/egreso.entidad';
import { Pago } from './entidades/pago.entidad';
import { RegistrarEgresoDto } from './dto/registrar-egreso.dto';
import { RegistrarPagoDto } from './dto/registrar-pago.dto';
import { ActualizarPagoDto } from './dto/actualizar-pago.dto';
import { ActualizarEgresoDto } from './dto/actualizar-egreso.dto';
import { PlanesTratamientoServicio } from '../tratamientos/planes-tratamiento.servicio';
import { Cita } from '../agenda/entidades/cita.entidad';
import { PlanTratamiento } from '../tratamientos/entidades/plan-tratamiento.entidad';

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
  ) {}

  async registrarEgreso(registrar_egreso_dto: RegistrarEgresoDto): Promise<Egreso> {
    const nuevo_egreso = this.egreso_repositorio.create({
      concepto: registrar_egreso_dto.concepto,
      fecha: registrar_egreso_dto.fecha,
      monto: registrar_egreso_dto.monto,
    });

    return this.egreso_repositorio.save(nuevo_egreso);
  }

  async actualizarEgreso(id: number, actualizar_egreso_dto: ActualizarEgresoDto): Promise<Egreso> {
    const egreso_existente = await this.egreso_repositorio.findOne({ where: { id } });

    if (!egreso_existente) {
      throw new NotFoundException('El egreso especificado no existe');
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

  async eliminarEgreso(id: number): Promise<void> {
    const egreso = await this.egreso_repositorio.findOne({ where: { id } });

    if (!egreso) {
      throw new NotFoundException('El egreso especificado no existe');
    }

    await this.egreso_repositorio.remove(egreso);
  }

  async registrarPago(registrar_pago_dto: RegistrarPagoDto): Promise<Pago> {
    let cita: Cita | null = null;
    let plan_tratamiento: PlanTratamiento | null = null;

    if (registrar_pago_dto.cita_id) {
      cita = await this.cita_repositorio.findOne({
        where: { id: registrar_pago_dto.cita_id },
        relations: ['paciente', 'plan_tratamiento'],
      });

      if (!cita) {
        throw new NotFoundException('La cita especificada no existe');
      }

      if (!cita.paciente) {
        throw new BadRequestException('No se puede registrar un pago para una cita sin paciente');
      }

      const pago_existente = await this.pago_repositorio.findOne({
        where: { cita: { id: registrar_pago_dto.cita_id } },
      });

      if (pago_existente) {
        throw new ConflictException('Esta cita ya tiene un pago asociado');
      }

      await this.cita_repositorio.update(cita.id, { 
        estado_pago: 'pagado',
        monto_esperado: registrar_pago_dto.monto
      });

      plan_tratamiento = cita.plan_tratamiento;
    }

    const datos_pago: any = {
      fecha: registrar_pago_dto.fecha,
      monto: registrar_pago_dto.monto,
      concepto: registrar_pago_dto.concepto,
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
        plan_tratamiento.id,
        registrar_pago_dto.monto
      );
    }

    return pago_guardado;
  }

  async actualizarPago(id: number, actualizar_pago_dto: ActualizarPagoDto): Promise<Pago> {
    const pago_existente = await this.pago_repositorio.findOne({
      where: { id },
      relations: ['plan_tratamiento', 'cita'],
    });

    if (!pago_existente) {
      throw new NotFoundException('El pago especificado no existe');
    }

    const monto_anterior = Number(pago_existente.monto);
    const monto_nuevo = actualizar_pago_dto.monto
      ? Number(actualizar_pago_dto.monto)
      : monto_anterior;

    if (pago_existente.plan_tratamiento && monto_nuevo !== monto_anterior) {
      await this.planes_servicio.descontarAbono(pago_existente.plan_tratamiento.id, monto_anterior);
      await this.planes_servicio.registrarAbono(pago_existente.plan_tratamiento.id, monto_nuevo);
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

  async eliminarPago(id: number): Promise<void> {
    const pago = await this.pago_repositorio.findOne({
      where: { id },
      relations: ['plan_tratamiento', 'cita'],
    });

    if (!pago) {
      throw new NotFoundException('El pago especificado no existe');
    }

    if (pago.plan_tratamiento) {
      await this.planes_servicio.descontarAbono(pago.plan_tratamiento.id, Number(pago.monto));
    }

    if (pago.cita) {
      await this.cita_repositorio.update(pago.cita.id, { 
        estado_pago: 'pendiente',
        monto_esperado: 0
      });
    }

    await this.pago_repositorio.remove(pago);
  }

  async eliminarPagosPorCita(cita_id: number): Promise<{ pagos_eliminados: number; monto_total: number }> {
    const pagos = await this.pago_repositorio.find({
      where: { cita: { id: cita_id } },
      relations: ['plan_tratamiento'],
    });

    const monto_total = pagos.reduce((sum, pago) => sum + Number(pago.monto), 0);

    for (const pago of pagos) {
      if (pago.plan_tratamiento) {
        await this.planes_servicio.descontarAbono(pago.plan_tratamiento.id, Number(pago.monto));
      }
      await this.pago_repositorio.remove(pago);
    }

    return {
      pagos_eliminados: pagos.length,
      monto_total,
    };
  }

  async generarReporte(fecha_inicio_str?: string, fecha_fin_str?: string) {
    const fecha_inicio = fecha_inicio_str ? new Date(fecha_inicio_str) : new Date(0);
    const fecha_fin = fecha_fin_str ? new Date(fecha_fin_str) : new Date();
    fecha_fin.setHours(23, 59, 59, 999);

    const pagos = await this.pago_repositorio.find({
      where: { fecha: Between(fecha_inicio, fecha_fin) },
      relations: ['plan_tratamiento', 'plan_tratamiento.paciente', 'cita', 'cita.paciente'],
    });
    const egresos = await this.egreso_repositorio.find({
      where: { fecha: Between(fecha_inicio, fecha_fin) },
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

  async obtenerDatosGrafico(tipo: 'dia' | 'mes' | 'ano', fecha_referencia?: string) {
    const fecha_ref = fecha_referencia ? new Date(fecha_referencia) : new Date();
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
      where: { fecha: Between(fecha_inicio, fecha_fin) },
    });

    const egresos = await this.egreso_repositorio.find({
      where: { fecha: Between(fecha_inicio, fecha_fin) },
    });

    const datos_agrupados = this.agruparDatos(pagos, egresos, tipo, fecha_inicio, fecha_fin);

    return datos_agrupados;
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
      for (let semana = 1; semana <= 52; semana++) {
        const inicio_semana = new Date(fecha_inicio.getFullYear(), 0, 1 + (semana - 1) * 7);
        const fin_semana = new Date(fecha_inicio.getFullYear(), 0, 1 + semana * 7);

        const ingresos = pagos
          .filter(p => {
            const fecha_pago = new Date(p.fecha);
            return fecha_pago >= inicio_semana && fecha_pago < fin_semana;
          })
          .reduce((sum, p) => sum + Number(p.monto), 0);
        
        const egresos_monto = egresos
          .filter(e => {
            const fecha_egreso = new Date(e.fecha);
            return fecha_egreso >= inicio_semana && fecha_egreso < fin_semana;
          })
          .reduce((sum, e) => sum + Number(e.monto), 0);

        datos.push({
          periodo: `S${semana}`,
          ingresos,
          egresos: egresos_monto,
        });
      }
    }

    return datos;
  }
}