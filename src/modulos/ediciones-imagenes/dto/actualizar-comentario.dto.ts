import { IsString, IsNumber, IsOptional, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ActualizarComentarioDto {
    @ApiProperty({ description: 'Coordenada X del comentario en la imagen', required: false })
    @IsNumber()
    @IsOptional()
    x?: number;

    @ApiProperty({ description: 'Coordenada Y del comentario en la imagen', required: false })
    @IsNumber()
    @IsOptional()
    y?: number;

    @ApiProperty({ description: 'Título del comentario', required: false })
    @IsString()
    @IsOptional()
    titulo?: string;

    @ApiProperty({ description: 'Contenido del comentario', required: false })
    @IsString()
    @IsOptional()
    contenido?: string;

    @ApiProperty({ description: 'Color del marcador en formato hexadecimal', required: false })
    @IsString()
    @IsOptional()
    @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'El color debe estar en formato hexadecimal (#RRGGBB)' })
    color?: string;
}
