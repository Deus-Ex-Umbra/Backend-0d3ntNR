import { Injectable } from '@nestjs/common';
import * as puppeteer from 'puppeteer';
import { GenerarPdfDto } from './dto/generar-pdf.dto';

// Estilos CSS idénticos a renderizador-html.tsx para garantizar consistencia visual
const ESTILOS_DOCUMENTO = `
  * {
    box-sizing: border-box;
  }
  
  html, body {
    margin: 0 !important;
    padding: 0 !important;
    font-family: Arial, sans-serif;
    font-size: 16px;
    line-height: 1.5;
    color: #000000;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  /* Resetear @page para evitar márgenes por defecto del navegador */
  @page {
    margin: 0 !important;
  }

  .renderizador-contenido {
    font-variant-ligatures: none;
    white-space: pre-wrap;
    word-wrap: break-word;
    overflow-wrap: break-word;
    word-break: break-word;
    hyphens: auto;
    color: #000000;
    width: 100%;
    font-family: Arial, sans-serif;
    font-size: 16px;
    line-height: 1.5;
    text-align: left;
  }

  .renderizador-contenido p { 
    margin: 0.5em 0;
    min-height: 1em;
    min-width: 0;
    box-sizing: border-box;
    max-width: 100%;
    white-space: pre-wrap;
  }

  .renderizador-contenido p:empty {
    min-height: 1em;
    display: block;
    margin: 0.5em 0;
  }

  .renderizador-contenido h1 { font-size: 2em; font-weight: bold; margin: 0.67em 0; white-space: pre-wrap; }
  .renderizador-contenido h2 { font-size: 1.5em; font-weight: bold; margin: 0.83em 0; white-space: pre-wrap; }
  .renderizador-contenido h3 { font-size: 1.17em; font-weight: bold; margin: 1em 0; white-space: pre-wrap; }

  .renderizador-contenido ul, 
  .renderizador-contenido ol { 
    margin: 0.5rem 0; 
    padding-left: 2rem;
    list-style-position: outside;
  }

  .renderizador-contenido ul { list-style-type: disc; }
  .renderizador-contenido ol { list-style-type: decimal; }

  .renderizador-contenido li { 
    margin: 0.25rem 0;
    display: list-item;
    white-space: pre-wrap;
  }

  .renderizador-contenido li::marker {
    color: currentColor;
  }

  .renderizador-contenido li p {
    display: inline;
    margin: 0;
    white-space: pre-wrap;
  }

  .renderizador-contenido ul[style*="text-align: center"],
  .renderizador-contenido ol[style*="text-align: center"] {
    display: table;
    text-align: left;
    list-style-position: outside;
    padding-left: 2rem;
    margin-left: auto;
    margin-right: auto;
  }

  .renderizador-contenido ul[style*="text-align: right"],
  .renderizador-contenido ol[style*="text-align: right"] {
    display: table;
    text-align: left;
    list-style-position: outside;
    padding-left: 2rem;
    margin-left: auto;
    margin-right: 0;
  }

  .renderizador-contenido ul[style*="text-align: left"],
  .renderizador-contenido ol[style*="text-align: left"] {
    display: block;
    text-align: left;
    list-style-position: outside;
    padding-left: 2rem;
    margin-left: 0;
    margin-right: auto;
  }

  .renderizador-contenido ul[style*="text-align: center"] li,
  .renderizador-contenido ol[style*="text-align: center"] li,
  .renderizador-contenido ul[style*="text-align: right"] li,
  .renderizador-contenido ol[style*="text-align: right"] li {
    text-align: left;
    display: list-item;
  }

  .renderizador-contenido img { max-width: 100%; height: auto; }

  .renderizador-contenido blockquote {
    border-left: 4px solid #ccc;
    margin: 1em 0;
    padding-left: 1em;
    font-style: italic;
    white-space: pre-wrap;
  }
  
  .renderizador-contenido [style*="text-align: center"]:not(ul):not(ol) { text-align: center; }
  .renderizador-contenido [style*="text-align: right"]:not(ul):not(ol) { text-align: right; }
  .renderizador-contenido [style*="text-align: justify"] { text-align: justify; }

  /* Estilos para etiquetas de plantilla */
  span[data-etiqueta] {
    padding: 0 4px;
    border-radius: 4px;
  }
`;

@Injectable()
export class PdfServicio {
  private browser: puppeteer.Browser | null = null;

  private async obtenerNavegador(): Promise<puppeteer.Browser> {
    if (!this.browser || !this.browser.connected) {
      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--font-render-hinting=none',
        ],
      });
    }
    return this.browser;
  }

  async generarPdfDesdeHtml(dto: GenerarPdfDto): Promise<string> {
    const { contenido_html, config } = dto;
    const { widthMm, heightMm, margenes } = config;

    const browser = await this.obtenerNavegador();
    const pagina = await browser.newPage();

    try {
      // Usar padding en el contenedor para los márgenes
      // Puppeteer maneja los saltos de página automáticamente
      const htmlCompleto = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <style>${ESTILOS_DOCUMENTO}</style>
          </head>
          <body>
            <div class="renderizador-contenido" style="
              padding-top: ${margenes.top}mm;
              padding-right: ${margenes.right}mm;
              padding-bottom: ${margenes.bottom}mm;
              padding-left: ${margenes.left}mm;
            ">
              ${contenido_html}
            </div>
          </body>
        </html>
      `;

      await pagina.setContent(htmlCompleto, { waitUntil: 'networkidle0' });

      // Generar PDF sin márgenes de Puppeteer (los márgenes están como padding CSS)
      const pdfBuffer = await pagina.pdf({
        width: `${widthMm}mm`,
        height: `${heightMm}mm`,
        margin: {
          top: '0mm',
          right: '0mm',
          bottom: '0mm',
          left: '0mm',
        },
        printBackground: true,
        preferCSSPageSize: false,
      });

      // Convertir a base64
      return Buffer.from(pdfBuffer).toString('base64');
    } finally {
      await pagina.close();
    }
  }

  async onModuleDestroy() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}



