import { Test, TestingModule } from '@nestjs/testing';
import { AppControlador } from './app.controlador';
import { AppServicio } from './app.servicio';

describe('AppControlador', () => {
  let appControlador: AppControlador;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppControlador],
      providers: [AppServicio],
    }).compile();

    appControlador = app.get<AppControlador>(AppControlador);
  });

  describe('root', () => {
    it('should return "API para Odontología funcionando!"', () => {
      expect(appControlador.getHello()).toBe('API para Odontología funcionando!');
    });
  });
});