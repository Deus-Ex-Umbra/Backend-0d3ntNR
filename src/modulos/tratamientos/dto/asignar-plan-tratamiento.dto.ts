import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsDateString, IsString, Matches } from 'class-validator';

export class AsignarPlanTratamientoDto {
  @ApiProperty()
  @IsInt()
  paciente_id: number;

  @ApiProperty()
  @IsInt()
  tratamiento_id: number;

  @ApiProperty({ description: 'Fecha de inicio del tratamiento en formato ISO 8601' })
  @IsDateString()
  fecha_inicio: string;

  @ApiProperty({ description: 'Hora de inicio de las citas en formato HH:mm', example: '09:00' })
  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: 'La hora debe estar en formato HH:mm (00:00 - 23:59)' })
  hora_inicio: string;
}