import { ApiProperty } from '@nestjs/swagger';
import { IsArray, ValidateNested, IsInt, IsNumber, Min, IsOptional, IsEnum, IsString } from 'class-validator';
import { Type } from 'class-transformer';

class MaterialTratamientoUsadoDto {
  @ApiProperty({ description: 'ID del material de tratamiento' })
  @IsInt()
  material_tratamiento_id: number;

  @ApiProperty({ description: 'Cantidad realmente usada' })
  @IsNumber()
  @Min(0)
  cantidad_usada: number;
}

export class ConfirmarMaterialesTratamientoDto {
  @ApiProperty({ type: [MaterialTratamientoUsadoDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MaterialTratamientoUsadoDto)
  materiales: MaterialTratamientoUsadoDto[];

  @ApiProperty({ 
    description: 'Estado de pago del tratamiento',
    enum: ['pendiente', 'parcial', 'pagado'],
    required: false
  })
  @IsOptional()
  @IsEnum(['pendiente', 'parcial', 'pagado'])
  estado_pago?: string;

  @ApiProperty({ 
    description: 'Monto del pago realizado',
    required: false
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  monto_pago?: number;

  @ApiProperty({ 
    description: 'Método de pago utilizado',
    required: false
  })
  @IsOptional()
  @IsString()
  metodo_pago?: string;
}