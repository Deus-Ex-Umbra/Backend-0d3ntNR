import { IsNumber, IsEnum, Min } from 'class-validator';
import { MomentoConfirmacion } from '../entidades/material-plantilla.entidad';

export class CrearMaterialGeneralDto {
    @IsNumber()
    producto_id: number;

    @IsNumber()
    @Min(0.01)
    cantidad: number;

    @IsEnum(MomentoConfirmacion)
    momento_confirmacion: MomentoConfirmacion;
}
