import { IsInt, IsNotEmpty, IsOptional, Min } from 'class-validator';

export class CrearTamanoPapelDto {
  @IsNotEmpty()
  nombre: string;

  @IsInt()
  @Min(1)
  ancho: number; // mm

  @IsInt()
  @Min(1)
  alto: number; // mm

  @IsOptional()
  descripcion?: string; // Texto entre paréntesis
}