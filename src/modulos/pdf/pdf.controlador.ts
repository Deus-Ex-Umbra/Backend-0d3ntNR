import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../autenticacion/guardias/jwt-auth.guardia';
import { PdfServicio } from './pdf.servicio';
import { GenerarPdfDto } from './dto/generar-pdf.dto';

@ApiTags('PDF')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('pdf')
export class PdfControlador {
    constructor(private readonly pdfServicio: PdfServicio) { }

    @Post('generar-desde-html')
    @ApiOperation({ summary: 'Generar PDF desde contenido HTML' })
    @ApiResponse({ status: 200, description: 'PDF generado exitosamente en formato base64' })
    @ApiResponse({ status: 400, description: 'Datos de entrada inválidos' })
    async generarDesdeHtml(@Body() dto: GenerarPdfDto): Promise<{ pdf_base64: string }> {
        const pdf_base64 = await this.pdfServicio.generarPdfDesdeHtml(dto);
        return { pdf_base64 };
    }
}
