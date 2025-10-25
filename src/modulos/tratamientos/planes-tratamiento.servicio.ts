import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlanTratamiento } from './entidades/plan-tratamiento.entidad';
import { AsignarPlanTratamientoDto } from './dto/asignar-plan-tratamiento.dto';
import { PacientesServicio } from '../pacientes/pacientes.servicio';
import { TratamientosServicio } from './tratamientos.servicio';
import { AgendaServicio } from '../agenda/agenda.servicio';
import { Cita } from '../agenda/entidades/cita.entidad';

@Injectable()
export class PlanesTratamientoServicio {
  constructor(
    @InjectRepository(PlanTratamiento)
    private readonly plan_repositorio: Repository<PlanTratamiento>,
    private readonly pacientes_servicio: PacientesServicio,
    private readonly tratamientos_servicio: TratamientosServicio,
    private readonly agenda_servicio: AgendaServicio,
  ) {}

  async asignarPlan(asignar_plan_dto: AsignarPlanTratamientoDto): Promise<PlanTratamiento> {
    const { paciente_id, tratamiento_id, fecha_inicio, hora_inicio } = asignar_plan_dto;
    const paciente = await this.pacientes_servicio.encontrarPorId(paciente_id);
    const tratamiento_plantilla = await this.tratamientos_servicio.encontrarPorId(tratamiento_id);

    const [horas, minutos] = hora_inicio.split(':').map(Number);
    
    const fecha_actual = new Date(fecha_inicio);
    fecha_actual.setHours(horas, minutos, 0, 0);
    
    const intervalo_dias = tratamiento_plantilla.intervalo_dias || 0;
    const intervalo_semanas = tratamiento_plantilla.intervalo_semanas || 0;
    const intervalo_meses = tratamiento_plantilla.intervalo_meses || 0;
    const horas_citas = tratamiento_plantilla.horas_aproximadas_citas || 0;
    const minutos_citas = tratamiento_plantilla.minutos_aproximados_citas || 30;
    
    const fechas_citas: Date[] = [];
    for (let i = 0; i < tratamiento_plantilla.numero_citas; i++) {
        const fecha_cita = new Date(fecha_actual);
        
        fecha_cita.setMonth(fecha_cita.getMonth() + (i * intervalo_meses));
        fecha_cita.setDate(fecha_cita.getDate() + (i * intervalo_semanas * 7));
        fecha_cita.setDate(fecha_cita.getDate() + (i * intervalo_dias));
        
        fechas_citas.push(fecha_cita);
    }

    const conflictos: Array<{ fecha: Date; citas_conflicto: Cita[] }> = [];
    
    for (const fecha of fechas_citas) {
      const validacion = await this.agenda_servicio.validarDisponibilidad(fecha, horas_citas, minutos_citas);
      if (!validacion.disponible) {
        conflictos.push({
          fecha,
          citas_conflicto: validacion.citas_conflicto,
        });
      }
    }

    if (conflictos.length > 0) {
      const detalles_conflictos = conflictos.map(conflicto => {
        const fecha_formateada = conflicto.fecha.toLocaleString('es-BO', {
          day: '2-digit',
          month: 'long',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
        
        const citas_str = conflicto.citas_conflicto.map(cita => {
          const descripcion = cita.paciente 
            ? `${cita.paciente.nombre} ${cita.paciente.apellidos} - ${cita.descripcion}`
            : cita.descripcion;
          return descripcion;
        }).join(', ');
        
        return `${fecha_formateada} (conflicto con: ${citas_str})`;
      }).join('; ');

      throw new ConflictException(
        `No se puede asignar el plan de tratamiento. ${conflictos.length} fecha${conflictos.length > 1 ? 's' : ''} tiene${conflictos.length > 1 ? 'n' : ''} conflictos de horario: ${detalles_conflictos}`
      );
    }

    const nuevo_plan = this.plan_repositorio.create({
      paciente,
      tratamiento: tratamiento_plantilla,
      costo_total: tratamiento_plantilla.costo_total,
      total_abonado: 0,
    });

    const plan_guardado = await this.plan_repositorio.save(nuevo_plan);

    const citas_promesas: Promise<Cita>[] = [];
    
    for (let i = 0; i < tratamiento_plantilla.numero_citas; i++) {
        citas_promesas.push(
            this.agenda_servicio.crear({
                paciente_id: paciente.id,
                plan_tratamiento_id: plan_guardado.id,
                fecha: fechas_citas[i],
                descripcion: `${tratamiento_plantilla.nombre} - Cita ${i + 1}`,
                estado_pago: 'pendiente',
                horas_aproximadas: horas_citas,
                minutos_aproximados: minutos_citas,
            })
        );
    }
    await Promise.all(citas_promesas);

    return this.encontrarPlanPorId(plan_guardado.id);
  }

  async obtenerTodos(): Promise<PlanTratamiento[]> {
    return this.plan_repositorio.find({
      relations: ['paciente', 'tratamiento', 'citas', 'pagos'],
      order: { id: 'DESC' },
    });
  }

  async encontrarPlanPorId(id: number): Promise<PlanTratamiento> {
    const plan = await this.plan_repositorio.findOne({
      where: { id },
      relations: ['paciente', 'tratamiento', 'citas', 'pagos']
    });
    if (!plan) {
        throw new NotFoundException(`Plan de tratamiento con ID "${id}" no encontrado.`);
    }
    return plan;
  }

  async obtenerPlanesPorPaciente(paciente_id: number): Promise<PlanTratamiento[]> {
    return this.plan_repositorio.find({
      where: { paciente: { id: paciente_id } },
      relations: ['tratamiento', 'citas', 'pagos'],
      order: { id: 'DESC' },
    });
  }

  async registrarAbono(plan_id: number, monto: number): Promise<PlanTratamiento> {
    const plan = await this.encontrarPlanPorId(plan_id);
    plan.total_abonado = Number(plan.total_abonado) + Number(monto);
    return this.plan_repositorio.save(plan);
  }

  async descontarAbono(plan_id: number, monto: number): Promise<PlanTratamiento> {
    const plan = await this.encontrarPlanPorId(plan_id);
    plan.total_abonado = Math.max(0, Number(plan.total_abonado) - Number(monto));
    return this.plan_repositorio.save(plan);
  }
}