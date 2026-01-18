import { IsEnum, IsNotEmpty } from 'class-validator';
import { EstadoPlanTratamiento } from '../entidades/plan-tratamiento.entidad';
import { ApiProperty } from '@nestjs/swagger';

export class CambiarEstadoPlanDto {
    @ApiProperty({ enum: EstadoPlanTratamiento, description: 'Nuevo estado del plan de tratamiento' })
    @IsNotEmpty({ message: 'El estado es obligatorio' })
    @IsEnum(EstadoPlanTratamiento, { message: 'El estado debe ser: pendiente, completado o cancelado' })
    estado: EstadoPlanTratamiento;
}
