import { Injectable } from '@nestjs/common';
import * as puppeteer from 'puppeteer';
import { GenerarPdfDto } from './dto/generar-pdf.dto';

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

  .renderizador-contenido > *:first-child {
    margin-top: 0 !important;
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

  span[data-etiqueta] {
    padding: 0 4px;
    border-radius: 4px;
  }
`;

@Injectable()
export class PdfServicio {
  private mmToPx(mm: number): number {
    return Math.round((mm / 25.4) * 96);
  }

  async generarPdfDesdeHtml(dto: GenerarPdfDto): Promise<string> {
    const { contenido_html, config } = dto;
    const { widthMm, heightMm, margenes } = config;
    const pageWidthPx = this.mmToPx(widthMm);
    const pageHeightPx = this.mmToPx(heightMm);
    const paddingLeft = this.mmToPx(margenes.left);
    const paddingRight = this.mmToPx(margenes.right);
    const contentAreaWidth = pageWidthPx - paddingLeft - paddingRight;

    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--font-render-hinting=none',
      ],
    });

    try {
      const pagina = await browser.newPage();
      await pagina.setViewport({
        width: contentAreaWidth,
        height: pageHeightPx,
        deviceScaleFactor: 1,
      });
      const htmlCompleto = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <style>
              ${ESTILOS_DOCUMENTO}
              
              @page {
                size: ${widthMm}mm ${heightMm}mm;
                margin: ${margenes.top}mm ${margenes.right}mm ${margenes.bottom}mm ${margenes.left}mm;
              }
              
              html, body {
                margin: 0 !important;
                padding: 0 !important;
                width: ${contentAreaWidth}px;
                font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif;
                font-size: 16px;
                line-height: 1.5;
                -webkit-font-smoothing: antialiased;
                -moz-osx-font-smoothing: grayscale;
              }
              
              .renderizador-contenido {
                width: ${contentAreaWidth}px !important;
                max-width: ${contentAreaWidth}px !important;
                box-sizing: border-box;
                padding: 0;
                margin: 0;
                font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif;
                font-size: 16px;
                line-height: 1.5;
                font-variant-ligatures: none;
                letter-spacing: normal;
                font-kerning: normal;
              }
              
              .renderizador-contenido > *:first-child {
                margin-top: 0 !important;
                padding-top: 0 !important;
              }
              
              .renderizador-contenido > p:first-child {
                margin-top: 0 !important;
              }
            </style>
          </head>
          <body>
            <div class="renderizador-contenido">${contenido_html}</div>
          </body>
        </html>
      `;

      await pagina.setContent(htmlCompleto, { waitUntil: 'networkidle0' });
      const pdfBuffer = await pagina.pdf({
        printBackground: true,
        preferCSSPageSize: true,
        displayHeaderFooter: false,
      });
      return Buffer.from(pdfBuffer).toString('base64');
    } finally {
      await browser.close();
    }
  }
}
