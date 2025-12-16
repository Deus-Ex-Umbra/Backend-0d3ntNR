import { IsOptional, IsString } from 'class-validator';

export class ActualizarConfiguracionClinicaDto {
    @IsOptional()
    @IsString()
    logo?: string;

    @IsOptional()
    @IsString()
    nombre_clinica?: string;

    @IsOptional()
    @IsString()
    mensaje_bienvenida_antes?: string;

    @IsOptional()
    @IsString()
    mensaje_bienvenida_despues?: string;
}
