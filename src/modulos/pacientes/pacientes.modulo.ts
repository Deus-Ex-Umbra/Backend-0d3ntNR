import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Paciente } from './entidades/paciente.entidad';
import { PacienteAlergia } from './entidades/paciente-alergia.entidad';
import { PacienteEnfermedad } from './entidades/paciente-enfermedad.entidad';
import { PacienteMedicamento } from './entidades/paciente-medicamento.entidad';
import { Alergia } from '../catalogo/entidades/alergia.entidad';
import { Enfermedad } from '../catalogo/entidades/enfermedad.entidad';
import { Medicamento } from '../catalogo/entidades/medicamento.entidad';
import { Cita } from '../agenda/entidades/cita.entidad';
import { PlanTratamiento } from '../tratamientos/entidades/plan-tratamiento.entidad';
import { PacientesControlador } from './pacientes.controlador';
import { PacientesServicio } from './pacientes.servicio';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Paciente,
      PacienteAlergia,
      PacienteEnfermedad,
      PacienteMedicamento,
      Alergia,
      Enfermedad,
      Medicamento,
      Cita,
      PlanTratamiento,
    ])
  ],
  controllers: [PacientesControlador],
  providers: [PacientesServicio],
  exports: [PacientesServicio],
})
export class PacientesModule {}