import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Readable } from 'stream';

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
  private readonly is_cloud: boolean;
  private readonly s3_client: S3Client;
  private readonly bucket_name: string;
  private readonly logger = new Logger(AlmacenamientoServicio.name);

  constructor(private readonly config_servicio: ConfigService) {
    this.is_cloud = this.config_servicio.get<string>('CLOUD') === 'true';
    
    if (this.is_cloud) {
      this.bucket_name = this.config_servicio.get<string>('AWS_S3_BUCKET_NAME')!;
      this.s3_client = new S3Client({
        region: this.config_servicio.get<string>('AWS_REGION')!,
        credentials: {
          accessKeyId: this.config_servicio.get<string>('AWS_ACCESS_KEY_ID')!,
          secretAccessKey: this.config_servicio.get<string>('AWS_SECRET_ACCESS_KEY')!,
        },
      });
      this.logger.log(`Modo almacenamiento: CLOUD (S3 Bucket: ${this.bucket_name})`);
    } else {
      this.ruta_base = './docs-0d3nt';
      this.inicializarDirectorios();
      this.logger.log(`Modo almacenamiento: LOCAL (Ruta: ${this.ruta_base})`);
    }
  }

  private inicializarDirectorios(): void {
    if (this.is_cloud) return; 

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
    if (this.is_cloud) return;

    if (!fs.existsSync(ruta)) {
      fs.mkdirSync(ruta, { recursive: true });
    }
  }

  private obtenerRutaTipo(tipo: TipoDocumento): string {
    return this.is_cloud ? tipo : path.join(this.ruta_base, tipo);
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
      
      const buffer = Buffer.from(contenido_base64, 'base64');
      
      if (this.is_cloud) {
        const key = `${tipo}/${nombre_archivo}`;
        const command = new PutObjectCommand({
          Bucket: this.bucket_name,
          Key: key,
          Body: buffer,
        });
        await this.s3_client.send(command);
      } else {
        const ruta_directorio = this.obtenerRutaTipo(tipo);
        this.asegurarDirectorio(ruta_directorio);
        const ruta_completa = path.join(ruta_directorio, nombre_archivo);
        fs.writeFileSync(ruta_completa, buffer);
      }
      
      return nombre_archivo;
    } catch (error) {
      this.logger.error('Error al guardar archivo:', error);
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
      
      if (this.is_cloud) {
        const key = `${tipo}/${nombre_archivo}`;
        const command = new PutObjectCommand({
          Bucket: this.bucket_name,
          Key: key,
          Body: buffer,
        });
        await this.s3_client.send(command);
      } else {
        const ruta_directorio = this.obtenerRutaTipo(tipo);
        this.asegurarDirectorio(ruta_directorio);
        const ruta_completa = path.join(ruta_directorio, nombre_archivo);
        fs.writeFileSync(ruta_completa, buffer);
      }
      
      return nombre_archivo;
    } catch (error) {
      this.logger.error('Error al guardar archivo desde buffer:', error);
      throw new InternalServerErrorException('Error al guardar el archivo');
    }
  }

  async leerArchivo(
    nombre_archivo: string, 
    tipo: TipoDocumento = TipoDocumento.ARCHIVO_ADJUNTO
  ): Promise<string> {
    try {
      if (this.is_cloud) {
         const buffer = await this.leerArchivoComoBuffer(nombre_archivo, tipo);
         return buffer.toString('base64');
      } else {
        const ruta_completa = path.join(this.obtenerRutaTipo(tipo), nombre_archivo);
        
        if (!fs.existsSync(ruta_completa)) {
          throw new InternalServerErrorException('Archivo no encontrado');
        }
        
        const buffer = fs.readFileSync(ruta_completa);
        return buffer.toString('base64');
      }
    } catch (error) {
       this.logger.error('Error al leer archivo:', error);
       throw new InternalServerErrorException('Error al leer el archivo');
    }
  }

  async leerArchivoComoBuffer(
    nombre_archivo: string, 
    tipo: TipoDocumento = TipoDocumento.ARCHIVO_ADJUNTO
  ): Promise<Buffer> {
    try {
      if (this.is_cloud) {
        const key = `${tipo}/${nombre_archivo}`;
        const command = new GetObjectCommand({
          Bucket: this.bucket_name,
          Key: key,
        });
        const response = await this.s3_client.send(command);
        const stream = response.Body as Readable;
        
        return new Promise((resolve, reject) => {
          const chunks: Buffer[] = [];
          stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
          stream.on('error', (err) => reject(err));
          stream.on('end', () => resolve(Buffer.concat(chunks)));
        });

      } else {
        const ruta_completa = path.join(this.obtenerRutaTipo(tipo), nombre_archivo);
        
        if (!fs.existsSync(ruta_completa)) {
          throw new InternalServerErrorException('Archivo no encontrado');
        }
        
        return fs.readFileSync(ruta_completa);
      }
    } catch (error) {
      this.logger.error('Error al leer archivo como buffer:', error);
      throw new InternalServerErrorException('Error al leer el archivo');
    }
  }

  async obtenerStreamArchivo(
    nombre_archivo: string,
    tipo: TipoDocumento
  ): Promise<Readable> {
    try {
      if (this.is_cloud) {
        const key = `${tipo}/${nombre_archivo}`;
        const command = new GetObjectCommand({
          Bucket: this.bucket_name,
          Key: key,
        });
        const response = await this.s3_client.send(command);
        return response.Body as Readable;
      } else {
        const ruta_completa = path.join(this.obtenerRutaTipo(tipo), nombre_archivo);
        if (!fs.existsSync(ruta_completa)) {
           throw new InternalServerErrorException('Archivo no encontrado');
        }
        return fs.createReadStream(ruta_completa);
      }
    } catch (error) {
      this.logger.error('Error al obtener stream de archivo:', error);
      throw new InternalServerErrorException('Error al leer el archivo');
    }
  }

  async eliminarArchivo(
    nombre_archivo: string, 
    tipo: TipoDocumento = TipoDocumento.ARCHIVO_ADJUNTO
  ): Promise<void> {
    try {
      if (this.is_cloud) {
        const key = `${tipo}/${nombre_archivo}`;
        const command = new DeleteObjectCommand({
            Bucket: this.bucket_name,
            Key: key
        });
        await this.s3_client.send(command);
      } else {
        const ruta_completa = path.join(this.obtenerRutaTipo(tipo), nombre_archivo);
        if (fs.existsSync(ruta_completa)) {
          fs.unlinkSync(ruta_completa);
        }
      }
    } catch (error) {
      this.logger.error('Error al eliminar archivo:', error);
      throw new InternalServerErrorException('Error al eliminar el archivo');
    }
  }

  async obtenerUrlAcceso(
    nombre_archivo: string, 
    tipo: TipoDocumento = TipoDocumento.ARCHIVO_ADJUNTO
  ): Promise<string> {
    try {
      if (this.is_cloud) {
        const cdn = this.config_servicio.get<string>('AWS_S3_CDN');
        if (cdn && cdn.trim() !== '') {
          return `${cdn}/${tipo}/${nombre_archivo}`;
        }
        
        const key = `${tipo}/${nombre_archivo}`;
        const command = new GetObjectCommand({
          Bucket: this.bucket_name,
          Key: key,
        });
        
        return await getSignedUrl(this.s3_client, command, { expiresIn: 3600 });
      } else {
        const base_url = this.config_servicio.get<string>('BASE_URL', 'http://localhost:3000');
        return `${base_url}/docs-0d3nt/${tipo}/${nombre_archivo}`;
      }
    } catch (error) {
      this.logger.error('Error al generar URL de acceso:', error);
      return '';
    }
  }

  obtenerRutaArchivo(
    nombre_archivo: string, 
    tipo: TipoDocumento = TipoDocumento.ARCHIVO_ADJUNTO
  ): string {
    if (this.is_cloud) {
        return `${tipo}/${nombre_archivo}`;
    }
    return path.join(this.obtenerRutaTipo(tipo), nombre_archivo);
  }

  async existeArchivo(
    nombre_archivo: string, 
    tipo: TipoDocumento = TipoDocumento.ARCHIVO_ADJUNTO
  ): Promise<boolean> {
     if (this.is_cloud) {
         try {
             const key = `${tipo}/${nombre_archivo}`;
              const command = new GetObjectCommand({
                Bucket: this.bucket_name,
                Key: key,
                Range: 'bytes=0-0'
              });
              await this.s3_client.send(command);
              return true;
         } catch (e) {
             return false;
         }
     } else {
        const ruta_completa = path.join(this.obtenerRutaTipo(tipo), nombre_archivo);
        return fs.existsSync(ruta_completa);
     }
  }

  async listarArchivos(tipo: TipoDocumento): Promise<string[]> {
    try {
      if (this.is_cloud) {
          this.logger.warn('Listar archivos no implementado completamente para S3');
          return [];
      } else {
        const ruta_directorio = this.obtenerRutaTipo(tipo);
        if (!fs.existsSync(ruta_directorio)) {
          return [];
        }
        return fs.readdirSync(ruta_directorio);
      }
    } catch (error) {
      this.logger.error('Error al listar archivos:', error);
      return [];
    }
  }

  obtenerRutaBase(): string {
    return this.ruta_base || '';
  }
}