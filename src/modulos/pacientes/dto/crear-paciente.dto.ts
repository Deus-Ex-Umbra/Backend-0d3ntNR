import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsString, IsOptional, IsEmail, IsArray, IsInt, IsObject, ValidateNested, Min, IsNumber } from 'class-validator';

class MargenesDto {
  @IsNumber()
  @Min(0)
  top: number;

  @IsNumber()
  @Min(0)
  right: number;

  @IsNumber()
  @Min(0)
  bottom: number;

  @IsNumber()
  @Min(0)
  left: number;
}

class DocumentoConfigDto {
  @IsOptional()
  @IsInt()
  tamano_hoja_id?: number | null;

  @IsOptional()
  @IsString()
  nombre_tamano?: string | null;

  @IsNumber()
  @Min(1)
  widthMm: number;

  @IsNumber()
  @Min(1)
  heightMm: number;

  @ValidateNested()
  @Type(() => MargenesDto)
  @IsObject()
  margenes: MargenesDto;
}

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

  @ApiProperty({ description: "Configuración de documento para notas generales", required: false, type: DocumentoConfigDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => DocumentoConfigDto)
  notas_generales_config?: DocumentoConfigDto;

  @ApiProperty({ description: "Configuración de documento para notas médicas", required: false, type: DocumentoConfigDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => DocumentoConfigDto)
  notas_medicas_config?: DocumentoConfigDto;
  
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