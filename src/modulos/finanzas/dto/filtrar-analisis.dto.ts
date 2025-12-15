import { IsDateString, IsOptional, IsString, IsBoolean, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class FiltrarAnalisisDto {
    @ApiProperty({ description: 'Fecha de inicio del rango', example: '2024-01-01' })
    @IsDateString()
    fecha_inicio: string;

    @ApiProperty({ description: 'Fecha de fin del rango', example: '2024-12-31' })
    @IsDateString()
    fecha_fin: string;

    @ApiProperty({ description: 'Glosa o concepto para filtrar', required: false })
    @IsOptional()
    @IsString()
    glosa?: string;

    @ApiProperty({ description: 'Si el filtro de glosa es sensible a mayúsculas', required: false, default: false })
    @IsOptional()
    @IsBoolean()
    sensible_mayusculas?: boolean;

    @ApiProperty({
        description: 'Nivel de precisión del gráfico: alta (zoom in), equilibrio (balance), global (zoom out)',
        required: false,
        default: 'equilibrio',
        enum: ['alta', 'equilibrio', 'global']
    })
    @IsOptional()
    @IsIn(['alta', 'equilibrio', 'global'])
    nivel_precision?: 'alta' | 'equilibrio' | 'global';
}
