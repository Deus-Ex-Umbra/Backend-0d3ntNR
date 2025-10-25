import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

export class SolicitudFraseDto {
  @ApiProperty({ description: 'Número de días hacia atrás para considerar en las notas.', default: 7 })
  @IsInt()
  @Min(1)
  dias: number;
}