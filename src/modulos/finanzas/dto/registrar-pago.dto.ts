import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNumber, Min, IsDate, IsOptional, IsString, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

export class RegistrarPagoDto {
  @ApiProperty({ description: 'ID de la cita a la que se asocia el pago (opcional)', required: false })
  @IsOptional()
  @IsInt()
  cita_id?: number;
  
  @ApiProperty()
  @Type(() => Date)
  @IsDate()
  fecha: Date;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  monto: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  concepto: string;
}