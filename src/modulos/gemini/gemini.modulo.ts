import { Module } from '@nestjs/common';
import { GeminiServicio } from './gemini.servicio';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule],
  providers: [GeminiServicio],
  exports: [GeminiServicio],
})
export class GeminiModule {}