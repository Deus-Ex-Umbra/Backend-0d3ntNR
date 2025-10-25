import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, IsOptional, IsObject, IsNotEmpty } from 'class-validator';

export class CrearEdicionDto {
  @ApiProperty()
  @IsInt()
  archivo_original_id: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  edicion_padre_id?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  nombre?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  descripcion?: string;

  @ApiProperty({ description: 'Datos del canvas en formato JSON' })
  @IsObject()
  @IsNotEmpty()
  datos_canvas: object;

  @ApiProperty({ description: 'Imagen resultado en Base64' })
  @IsString()
  @IsNotEmpty()
  imagen_resultado_base64: string;
}