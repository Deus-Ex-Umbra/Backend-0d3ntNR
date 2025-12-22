import { IsInt, IsNotEmpty, Min } from 'class-validator';

export class CrearTamanoPapelDto {
  @IsNotEmpty()
  nombre: string;

  @IsInt()
  @Min(1)
  ancho: number;

  @IsInt()
  @Min(1)
  alto: number;
}