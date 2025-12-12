import { Module } from '@nestjs/common';
import { PdfControlador } from './pdf.controlador';
import { PdfServicio } from './pdf.servicio';

@Module({
    controllers: [PdfControlador],
    providers: [PdfServicio],
    exports: [PdfServicio],
})
export class PdfModulo { }
