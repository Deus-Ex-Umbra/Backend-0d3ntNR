import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class GeminiServicio {
  private readonly api_key: string;
  private readonly url_base = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

  constructor(private readonly config_servicio: ConfigService) {
    const apiKey = this.config_servicio.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      throw new InternalServerErrorException('GEMINI_API_KEY no está configurada en el archivo .env');
    }
    this.api_key = apiKey;
  }

  async generarContenido(prompt: string, usar_pensamiento = true): Promise<string> {
    const data: any = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {},
    };

    if (!usar_pensamiento) {
      data.generationConfig = { stopSequences: [], temperature: 0 };
    }

    try {
      const respuesta = await axios.post(`${this.url_base}?key=${this.api_key}`, data, {
        headers: { 'Content-Type': 'application/json' },
      });
      return respuesta.data.candidates[0].content.parts[0].text;
    } catch (error) {
      console.error('Error al comunicarse con la API de Gemini:', error.response?.data || error.message);
      throw new InternalServerErrorException('No se pudo generar contenido desde Gemini.');
    }
  }

  async analizarImagen(imagen_base64: string, prompt: string): Promise<string> {
    const data = {
      contents: [
        {
          parts: [
            {
              inline_data: {
                mime_type: 'image/jpeg',
                data: imagen_base64,
              },
            },
            { text: prompt },
          ],
        },
      ],
    };

    try {
      const respuesta = await axios.post(`${this.url_base}?key=${this.api_key}`, data, {
        headers: { 'Content-Type': 'application/json' },
      });
      return respuesta.data.candidates[0].content.parts[0].text;
    } catch (error) {
      console.error('Error al analizar la imagen con Gemini:', error.response?.data || error.message);
      throw new InternalServerErrorException('No se pudo analizar la imagen con Gemini.');
    }
  }
}