import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, Min, IsDate, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class ActualizarEgresoDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  concepto?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  fecha?: Date;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  monto?: number;
}