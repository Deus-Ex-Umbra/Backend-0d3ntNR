import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
  IsObject,
} from 'class-validator';

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

export class CrearHistoriaClinicaDto {
  @ApiProperty({ required: false, description: 'Nombre visible de la versión' })
  @IsOptional()
  @IsString()
  nombre?: string;

  @ApiProperty({ required: false, description: 'Contenido HTML de la historia clínica' })
  @IsOptional()
  @IsString()
  contenido_html?: string;

  @ApiProperty({ required: false, description: 'Configuración de página', type: DocumentoConfigDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => DocumentoConfigDto)
  config?: DocumentoConfigDto;

  @ApiProperty({ required: false, description: 'ID de versión a clonar' })
  @IsOptional()
  @IsInt()
  clonar_de_version_id?: number;
}
