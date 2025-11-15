import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

export enum TipoDocumento {
  ARCHIVO_ADJUNTO = 'archivos-adjuntos',
  REPORTE = 'reportes',
  PLANTILLA_CONSENTIMIENTO = 'plantillas-consentimiento',
  EDICION_IMAGEN = 'ediciones-imagenes',
  BACKUP = 'backups',
}

@Injectable()
export class AlmacenamientoServicio {
  private readonly ruta_base: string;

  constructor(private readonly config_servicio: ConfigService) {
    this.ruta_base = this.config_servicio.get<string>('DOCS_PATH', './docs-0d3nt');
    this.inicializarDirectorios();
  }

  private inicializarDirectorios(): void {
    if (!fs.existsSync(this.ruta_base)) {
      fs.mkdirSync(this.ruta_base, { recursive: true });
    }
    Object.values(TipoDocumento).forEach(tipo => {
      const ruta = path.join(this.ruta_base, tipo);
      if (!fs.existsSync(ruta)) {
        fs.mkdirSync(ruta, { recursive: true });
      }
    });
  }

  private asegurarDirectorio(ruta: string): void {
    if (!fs.existsSync(ruta)) {
      fs.mkdirSync(ruta, { recursive: true });
    }
  }

  private obtenerRutaTipo(tipo: TipoDocumento): string {
    return path.join(this.ruta_base, tipo);
  }

  async guardarArchivo(
    contenido_base64: string, 
    extension: string,
    tipo: TipoDocumento = TipoDocumento.ARCHIVO_ADJUNTO,
    nombre_personalizado?: string
  ): Promise<string> {
    try {
      const nombre_archivo = nombre_personalizado 
        ? `${nombre_personalizado}.${extension}` 
        : `${uuidv4()}.${extension}`;
      
      const ruta_directorio = this.obtenerRutaTipo(tipo);
      this.asegurarDirectorio(ruta_directorio);
      
      const ruta_completa = path.join(ruta_directorio, nombre_archivo);
      
      const buffer = Buffer.from(contenido_base64, 'base64');
      fs.writeFileSync(ruta_completa, buffer);
      
      return nombre_archivo;
    } catch (error) {
      console.error('Error al guardar archivo:', error);
      throw new InternalServerErrorException('Error al guardar el archivo');
    }
  }

  async guardarArchivoDesdeBuffer(
    buffer: Buffer,
    extension: string,
    tipo: TipoDocumento = TipoDocumento.ARCHIVO_ADJUNTO,
    nombre_personalizado?: string
  ): Promise<string> {
    try {
      const nombre_archivo = nombre_personalizado 
        ? `${nombre_personalizado}.${extension}` 
        : `${uuidv4()}.${extension}`;
      
      const ruta_directorio = this.obtenerRutaTipo(tipo);
      this.asegurarDirectorio(ruta_directorio);
      
      const ruta_completa = path.join(ruta_directorio, nombre_archivo);
      fs.writeFileSync(ruta_completa, buffer);
      
      return nombre_archivo;
    } catch (error) {
      console.error('Error al guardar archivo desde buffer:', error);
      throw new InternalServerErrorException('Error al guardar el archivo');
    }
  }

  async leerArchivo(
    nombre_archivo: string, 
    tipo: TipoDocumento = TipoDocumento.ARCHIVO_ADJUNTO
  ): Promise<string> {
    try {
      const ruta_completa = path.join(this.obtenerRutaTipo(tipo), nombre_archivo);
      
      if (!fs.existsSync(ruta_completa)) {
        throw new InternalServerErrorException('Archivo no encontrado');
      }
      
      const buffer = fs.readFileSync(ruta_completa);
      return buffer.toString('base64');
    } catch (error) {
      console.error('Error al leer archivo:', error);
      throw new InternalServerErrorException('Error al leer el archivo');
    }
  }

  async leerArchivoComoBuffer(
    nombre_archivo: string, 
    tipo: TipoDocumento = TipoDocumento.ARCHIVO_ADJUNTO
  ): Promise<Buffer> {
    try {
      const ruta_completa = path.join(this.obtenerRutaTipo(tipo), nombre_archivo);
      
      if (!fs.existsSync(ruta_completa)) {
        throw new InternalServerErrorException('Archivo no encontrado');
      }
      
      return fs.readFileSync(ruta_completa);
    } catch (error) {
      console.error('Error al leer archivo como buffer:', error);
      throw new InternalServerErrorException('Error al leer el archivo');
    }
  }

  async eliminarArchivo(
    nombre_archivo: string, 
    tipo: TipoDocumento = TipoDocumento.ARCHIVO_ADJUNTO
  ): Promise<void> {
    try {
      const ruta_completa = path.join(this.obtenerRutaTipo(tipo), nombre_archivo);
      
      if (fs.existsSync(ruta_completa)) {
        fs.unlinkSync(ruta_completa);
      }
    } catch (error) {
      console.error('Error al eliminar archivo:', error);
      throw new InternalServerErrorException('Error al eliminar el archivo');
    }
  }

  obtenerRutaArchivo(
    nombre_archivo: string, 
    tipo: TipoDocumento = TipoDocumento.ARCHIVO_ADJUNTO
  ): string {
    return path.join(this.obtenerRutaTipo(tipo), nombre_archivo);
  }

  existeArchivo(
    nombre_archivo: string, 
    tipo: TipoDocumento = TipoDocumento.ARCHIVO_ADJUNTO
  ): boolean {
    const ruta_completa = path.join(this.obtenerRutaTipo(tipo), nombre_archivo);
    return fs.existsSync(ruta_completa);
  }

  listarArchivos(tipo: TipoDocumento): string[] {
    try {
      const ruta_directorio = this.obtenerRutaTipo(tipo);
      if (!fs.existsSync(ruta_directorio)) {
        return [];
      }
      return fs.readdirSync(ruta_directorio);
    } catch (error) {
      console.error('Error al listar archivos:', error);
      return [];
    }
  }

  obtenerRutaBase(): string {
    return this.ruta_base;
  }
}