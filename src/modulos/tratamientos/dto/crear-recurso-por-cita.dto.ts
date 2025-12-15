import { IsNumber, Min } from 'class-validator';

export class CrearRecursoPorCitaDto {
    @IsNumber()
    producto_id: number;

    @IsNumber()
    @Min(0.01)
    cantidad: number;
}
