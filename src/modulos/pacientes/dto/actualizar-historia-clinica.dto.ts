import { PartialType } from '@nestjs/swagger';
import { CrearHistoriaClinicaDto } from './crear-historia-clinica.dto';

export class ActualizarHistoriaClinicaDto extends PartialType(CrearHistoriaClinicaDto) {}
