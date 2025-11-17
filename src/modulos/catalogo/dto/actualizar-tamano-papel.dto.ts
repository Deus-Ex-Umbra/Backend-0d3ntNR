import { IsInt, IsOptional, Min } from 'class-validator';

export class ActualizarTamanoPapelDto {
  @IsOptional()
  nombre?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  ancho?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  alto?: number;

  @IsOptional()
  descripcion?: string;
}