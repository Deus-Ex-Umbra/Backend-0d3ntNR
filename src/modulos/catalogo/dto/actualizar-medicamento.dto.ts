import { PartialType } from '@nestjs/swagger';
import { CrearMedicamentoDto } from './crear-medicamento.dto';

export class ActualizarMedicamentoDto extends PartialType(CrearMedicamentoDto) {}