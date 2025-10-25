import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsEmail, IsArray, IsInt } from 'class-validator';

export class CrearPacienteDto {
  @ApiProperty()
  @IsString()
  nombre: string;

  @ApiProperty()
  @IsString()
  apellidos: string;
  
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  telefono?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsEmail()
  correo?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  direccion?: string;

  @ApiProperty({ description: "Notas generales sobre el paciente", required: false })
  @IsOptional()
  @IsString()
  notas_generales?: string;

  @ApiProperty({ description: "Alergias conocidas (texto libre)", required: false })
  @IsOptional()
  @IsString()
  alergias?: string;

  @ApiProperty({ description: "Enfermedades preexistentes (texto libre)", required: false })
  @IsOptional()
  @IsString()
  enfermedades?: string;

  @ApiProperty({ description: "Medicamentos que toma actualmente (texto libre)", required: false })
  @IsOptional()
  @IsString()
  medicamentos?: string;

  @ApiProperty({ description: "Otras notas médicas importantes", required: false })
  @IsOptional()
  @IsString()
  notas_medicas?: string;
  
  @ApiProperty({ description: "Color para categorización visual (ej. '#FF0000')", required: false })
  @IsOptional()
  @IsString()
  color_categoria?: string;

  @ApiProperty({ description: "IDs de alergias del catálogo", required: false, type: [Number] })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  alergias_ids?: number[];

  @ApiProperty({ description: "IDs de enfermedades del catálogo", required: false, type: [Number] })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  enfermedades_ids?: number[];

  @ApiProperty({ description: "IDs de medicamentos del catálogo", required: false, type: [Number] })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  medicamentos_ids?: number[];
}