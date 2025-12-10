import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlantillaReceta } from './entidades/plantilla-receta.entidad';
import { PlantillasRecetasControlador } from './plantillas-recetas.controlador';
import { PlantillasRecetasServicio } from './plantillas-recetas.servicio';
import { PacientesModule } from '../pacientes/pacientes.modulo';

@Module({
  imports: [
    TypeOrmModule.forFeature([PlantillaReceta]),
    forwardRef(() => PacientesModule),
  ],
  controllers: [PlantillasRecetasControlador],
  providers: [PlantillasRecetasServicio],
  exports: [PlantillasRecetasServicio],
})
export class PlantillasRecetasModule {}
