import { ApiProperty } from '@nestjs/swagger';
import { Alergia } from '../../catalogo/entidades/alergia.entidad';
import { Enfermedad } from '../../catalogo/entidades/enfermedad.entidad';
import { Medicamento } from '../../catalogo/entidades/medicamento.entidad';

export class RespuestaAnamnesisDto {
  @ApiProperty({ type: [Alergia] })
  alergias: Alergia[];

  @ApiProperty({ type: [Enfermedad] })
  enfermedades: Enfermedad[];

  @ApiProperty({ type: [Medicamento] })
  medicamentos: Medicamento[];
}