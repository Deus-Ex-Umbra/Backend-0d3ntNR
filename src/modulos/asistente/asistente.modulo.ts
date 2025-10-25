import { Module } from '@nestjs/common';
import { AsistenteControlador } from './asistente.controlador';
import { AsistenteServicio } from './asistente.servicio';
import { GeminiModule } from '../gemini/gemini.modulo';
import { NotasModule } from '../notas/notas.modulo';
import { AgendaModule } from '../agenda/agenda.modulo';

@Module({
  imports: [GeminiModule, NotasModule, AgendaModule],
  controllers: [AsistenteControlador],
  providers: [AsistenteServicio],
})
export class AsistenteModule {}