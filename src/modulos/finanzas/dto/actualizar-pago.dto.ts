import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, Min, IsDate, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class ActualizarPagoDto {
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

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  concepto?: string;
}