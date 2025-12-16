import { IsNumber, Min, IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

export class CrearRecursoPorCitaDto {
    @IsNumber()
    producto_id: number;

    @IsNumber({}, { message: 'La cantidad debe ser un número válido' })
    @Min(0.01, { message: 'La cantidad debe ser mayor o igual a 0.01' })
    @Transform(({ value }) => {
        const num = parseFloat(value);
        return isNaN(num) ? 0 : num;
    })
    cantidad: number;

    @IsOptional()
    @IsString()
    tipo?: string;
}
