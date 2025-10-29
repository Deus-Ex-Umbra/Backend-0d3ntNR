import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AlmacenamientoServicio {
  private readonly ruta_archivos: string;

  constructor(private readonly config_servicio: ConfigService) {
    this.ruta_archivos = this.config_servicio.get<string>('ARCHIVOS_PATH', './archivos-adjuntos');
    this.asegurarDirectorio();
  }

  private asegurarDirectorio(): void {
    if (!fs.existsSync(this.ruta_archivos)) {
      fs.mkdirSync(this.ruta_archivos, { recursive: true });
    }
  }

  async guardarArchivo(contenido_base64: string, extension: string): Promise<string> {
    try {
      const nombre_archivo = `${uuidv4()}.${extension}`;
      const ruta_completa = path.join(this.ruta_archivos, nombre_archivo);
      
      const buffer = Buffer.from(contenido_base64, 'base64');
      fs.writeFileSync(ruta_completa, buffer);
      
      return nombre_archivo;
    } catch (error) {
      throw new InternalServerErrorException('Error al guardar el archivo');
    }
  }

  async leerArchivo(nombre_archivo: string): Promise<string> {
    try {
      const ruta_completa = path.join(this.ruta_archivos, nombre_archivo);
      
      if (!fs.existsSync(ruta_completa)) {
        throw new InternalServerErrorException('Archivo no encontrado');
      }
      
      const buffer = fs.readFileSync(ruta_completa);
      return buffer.toString('base64');
    } catch (error) {
      throw new InternalServerErrorException('Error al leer el archivo');
    }
  }

  async eliminarArchivo(nombre_archivo: string): Promise<void> {
    try {
      const ruta_completa = path.join(this.ruta_archivos, nombre_archivo);
      
      if (fs.existsSync(ruta_completa)) {
        fs.unlinkSync(ruta_completa);
      }
    } catch (error) {
      throw new InternalServerErrorException('Error al eliminar el archivo');
    }
  }

  obtenerRutaArchivo(nombre_archivo: string): string {
    return path.join(this.ruta_archivos, nombre_archivo);
  }
}