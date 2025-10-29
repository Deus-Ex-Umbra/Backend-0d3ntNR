import { PartialType } from '@nestjs/swagger';
import { CrearPlantillaConsentimientoDto } from './crear-plantilla-consentimiento.dto';

export class ActualizarPlantillaConsentimientoDto extends PartialType(CrearPlantillaConsentimientoDto) {}