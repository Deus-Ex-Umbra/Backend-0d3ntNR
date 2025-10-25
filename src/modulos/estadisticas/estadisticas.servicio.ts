import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThanOrEqual } from 'typeorm';
import { Paciente } from '../pacientes/entidades/paciente.entidad';
import { Cita } from '../agenda/entidades/cita.entidad';
import { PlanTratamiento } from '../tratamientos/entidades/plan-tratamiento.entidad';
import { Pago } from '../finanzas/entidades/pago.entidad';
import { Egreso } from '../finanzas/entidades/egreso.entidad';

@Injectable()
export class EstadisticasServicio {
  constructor(
    @InjectRepository(Paciente)
    private readonly paciente_repositorio: Repository<Paciente>,
    @InjectRepository(Cita)
    private readonly cita_repositorio: Repository<Cita>,
    @InjectRepository(PlanTratamiento)
    private readonly plan_repositorio: Repository<PlanTratamiento>,
    @InjectRepository(Pago)
    private readonly pago_repositorio: Repository<Pago>,
    @InjectRepository(Egreso)
    private readonly egreso_repositorio: Repository<Egreso>,
  ) {}

  async obtenerEstadisticasDashboard() {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const manana = new Date(hoy);
    manana.setDate(manana.getDate() + 1);

    const primer_dia_mes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    const ultimo_dia_mes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0, 23, 59, 59);

    const [
      total_pacientes,
      citas_hoy,
      planes_activos,
      pagos_mes,
      egresos_mes,
      citas_recientes,
      pagos_recientes,
      egresos_recientes,
    ] = await Promise.all([
      this.paciente_repositorio.count(),
      this.cita_repositorio.count({
        where: { fecha: Between(hoy, manana) },
      }),
      this.plan_repositorio.count(),
      this.pago_repositorio.find({
        where: { fecha: Between(primer_dia_mes, ultimo_dia_mes) },
      }),
      this.egreso_repositorio.find({
        where: { fecha: Between(primer_dia_mes, ultimo_dia_mes) },
      }),
      this.cita_repositorio.find({
        where: { fecha: MoreThanOrEqual(hoy) },
        relations: ['paciente'],
        order: { fecha: 'DESC' },
        take: 5,
      }),
      this.pago_repositorio.find({
        relations: ['plan_tratamiento', 'plan_tratamiento.paciente', 'cita', 'cita.paciente'],
        order: { fecha: 'DESC' },
        take: 3,
      }),
      this.egreso_repositorio.find({
        order: { fecha: 'DESC' },
        take: 3,
      }),
    ]);

    const ingresos_mes = pagos_mes.reduce((sum, p) => sum + Number(p.monto), 0);
    const egresos_mes_total = egresos_mes.reduce((sum, e) => sum + Number(e.monto), 0);
    const balance_mes = ingresos_mes - egresos_mes_total;

    const ultimas_transacciones = [
      ...pagos_recientes.map(p => ({
        id: p.id,
        tipo: 'ingreso' as const,
        fecha: p.fecha,
        monto: Number(p.monto),
        concepto: p.concepto,
        cita_id: p.cita?.id,
        plan_tratamiento_id: p.plan_tratamiento?.id,
      })),
      ...egresos_recientes.map(e => ({
        id: e.id,
        tipo: 'egreso' as const,
        fecha: e.fecha,
        monto: Number(e.monto),
        concepto: e.concepto,
      })),
    ]
      .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
      .slice(0, 3);

    return {
      total_pacientes,
      citas_hoy,
      planes_activos,
      ingresos_mes,
      egresos_mes: egresos_mes_total,
      balance_mes,
      citas_recientes,
      ultimas_transacciones,
    };
  }
}