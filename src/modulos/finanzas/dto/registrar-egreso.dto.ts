import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, Min, IsDate, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

export class RegistrarEgresoDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  concepto: string;

  @ApiProperty()
  @Type(() => Date)
  @IsDate()
  fecha: Date;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  monto: number;
}