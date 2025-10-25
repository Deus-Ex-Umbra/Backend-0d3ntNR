import { ApiProperty } from '@nestjs/swagger';
import { IsObject, IsNotEmpty, IsEnum, IsOptional } from 'class-validator';
import type { EtapaDental } from '../entidades/odontograma.entidad';

class PosicionRotacionTamanoDto {
  @ApiProperty()
  x: number;
  @ApiProperty()
  y: number;
  @ApiProperty()
  z: number;
}

class DienteDto {
  @ApiProperty()
  numero_diente: number;

  @ApiProperty({ type: PosicionRotacionTamanoDto })
  posicion: PosicionRotacionTamanoDto;

  @ApiProperty({ type: PosicionRotacionTamanoDto })
  rotacion: PosicionRotacionTamanoDto;

  @ApiProperty({ type: PosicionRotacionTamanoDto })
  tamano: PosicionRotacionTamanoDto;

  @ApiProperty()
  estado: string;

  @ApiProperty({ required: false })
  @IsOptional()
  simbologia_id?: number;
}

class DatosOdontogramaDto {
    @ApiProperty()
    tamano_mandibula: { superior: number; inferior: number };

    @ApiProperty({ type: [DienteDto] })
    dientes: DienteDto[];
}

export class CrearOdontogramaDto {
  @ApiProperty({
    description: 'Objeto JSON que representa la estructura completa del odontograma.',
    type: DatosOdontogramaDto,
  })
  @IsObject()
  @IsNotEmpty()
  datos: DatosOdontogramaDto;

  @ApiProperty({ enum: ['Infantil', 'Mixta', 'Adulto'], default: 'Adulto' })
  @IsEnum(['Infantil', 'Mixta', 'Adulto'])
  @IsOptional()
  etapa_dental?: EtapaDental;
}

