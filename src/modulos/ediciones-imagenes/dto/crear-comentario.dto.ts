import { IsString, IsNumber, IsNotEmpty, IsOptional, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CrearComentarioDto {
    @ApiProperty({ description: 'Coordenada X del comentario en la imagen' })
    @IsNumber()
    @IsNotEmpty()
    x: number;

    @ApiProperty({ description: 'Coordenada Y del comentario en la imagen' })
    @IsNumber()
    @IsNotEmpty()
    y: number;

    @ApiProperty({ description: 'Título del comentario' })
    @IsString()
    @IsNotEmpty()
    titulo: string;

    @ApiProperty({ description: 'Contenido del comentario' })
    @IsString()
    @IsNotEmpty()
    contenido: string;

    @ApiProperty({ description: 'Color del marcador en formato hexadecimal', required: false, default: '#FF0000' })
    @IsString()
    @IsOptional()
    @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'El color debe estar en formato hexadecimal (#RRGGBB)' })
    color?: string;
}
